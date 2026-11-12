import type { Appointment, Language, Medication, SourceDocument, VitalReading } from '../types';
import { isMedicationActiveOn, localDateKey, normalizeTimes } from './medications';
import { assessVital, isValidVitalReading } from './vitals';

export type InsightSeverity = 'urgent' | 'review' | 'info';

export interface LocalizedText {
  en: string;
  bn: string;
}

export interface HealthInsight {
  id: string;
  severity: InsightSeverity;
  title: LocalizedText;
  detail: LocalizedText;
  action: LocalizedText;
  source: LocalizedText;
}

export interface HealthOverviewStats {
  activeMedicationCount: number;
  upcomingAppointmentCount: number;
}

const STALE_VITAL_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const OLD_DOCUMENT_AFTER_MS = 365 * 24 * 60 * 60 * 1000;

const VITAL_LABELS: Record<VitalReading['type'], LocalizedText> = {
  blood_pressure: { en: 'Blood pressure', bn: 'রক্তচাপ' },
  blood_glucose: { en: 'Blood glucose', bn: 'রক্তের গ্লুকোজ' },
  weight: { en: 'Weight', bn: 'ওজন' },
  temperature: { en: 'Temperature', bn: 'তাপমাত্রা' },
  heart_rate: { en: 'Heart rate', bn: 'হৃদস্পন্দন' },
  spo2: { en: 'SpO₂', bn: 'SpO₂' },
};

function dateTimeLabel(value: string, language: Language): string {
  const date = new Date(value);
  return date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB');
}

function validTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isUsableVital(reading: VitalReading): boolean {
  return isValidVitalReading(reading);
}

/** Return medications whose user-entered date range includes the device's local date. */
export function getActiveMedications(medications: Medication[], now: Date): Medication[] {
  const dateKey = localDateKey(now);
  return medications.filter((medication) => isMedicationActiveOn(medication, dateKey));
}

/** Upcoming appointments with valid dates, ordered from soonest to latest. */
export function getUpcomingAppointments(appointments: Appointment[], now: Date): Appointment[] {
  const nowTime = now.getTime();
  if (!Number.isFinite(nowTime)) return [];

  return appointments
    .filter((appointment) => {
      if (appointment.status !== 'upcoming') return false;
      const appointmentTime = validTimestamp(appointment.dateTime);
      return appointmentTime !== null && appointmentTime >= nowTime;
    })
    .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
}

/** Counts shown in the Health Insights summary cards. */
export function getHealthOverviewStats(input: {
  medications: Medication[];
  appointments: Appointment[];
  now: Date;
}): HealthOverviewStats {
  return {
    activeMedicationCount: getActiveMedications(input.medications, input.now).length,
    upcomingAppointmentCount: getUpcomingAppointments(input.appointments, input.now).length,
  };
}

/**
 * Build deterministic observations from user-entered records.
 * This is an organizational aid, not a diagnosis, prediction or treatment plan.
 */
export function buildHealthInsights(input: {
  vitals: VitalReading[];
  medications: Medication[];
  documents: SourceDocument[];
  appointments: Appointment[];
  now?: Date;
}): HealthInsight[] {
  const { vitals, medications, documents, appointments } = input;
  const now = input.now && Number.isFinite(input.now.getTime()) ? input.now : new Date();
  const nowTime = now.getTime();
  const today = localDateKey(now);
  const insights: HealthInsight[] = [];

  const timestampedVitals = vitals.map((reading) => ({ reading, measuredAt: validTimestamp(reading.measuredAt) }));
  const invalidVitalCount = timestampedVitals.filter(({ reading, measuredAt }) => measuredAt === null || !isUsableVital(reading)).length;
  const futureVitalCount = timestampedVitals.filter(({ reading, measuredAt }) =>
    measuredAt !== null && measuredAt > nowTime && isUsableVital(reading),
  ).length;
  const eligibleVitals = timestampedVitals
    .filter((entry): entry is { reading: VitalReading; measuredAt: number } =>
      entry.measuredAt !== null && entry.measuredAt <= nowTime && isUsableVital(entry.reading),
    )
    .sort((a, b) => b.measuredAt - a.measuredAt);

  // Only the newest non-future reading of each type is used for a current observation.
  const latestByType = new Map<VitalReading['type'], { reading: VitalReading; measuredAt: number }>();
  for (const entry of eligibleVitals) {
    if (!latestByType.has(entry.reading.type)) latestByType.set(entry.reading.type, entry);
  }

  for (const { reading, measuredAt } of latestByType.values()) {
    const assessment = assessVital(reading);
    if (!assessment || assessment.level === 'normal') continue;

    const isHistorical = nowTime - measuredAt > STALE_VITAL_AFTER_MS;
    const isUrgent = assessment.level === 'urgent';
    const label = VITAL_LABELS[reading.type];
    const value = `${reading.value}${reading.value2 !== undefined ? `/${reading.value2}` : ''} ${reading.unit}`;
    const recordedAtEn = dateTimeLabel(reading.measuredAt, 'en');
    const recordedAtBn = dateTimeLabel(reading.measuredAt, 'bn');

    insights.push({
      id: `vital-${reading.id}`,
      severity: isHistorical ? 'info' : isUrgent ? 'urgent' : 'review',
      title: {
        en: `${isHistorical ? 'Historical ' : ''}${label.en}: ${assessment.labelEn}`,
        bn: `${isHistorical ? 'পুরোনো ' : ''}${label.bn}: ${assessment.labelBn}`,
      },
      detail: {
        en: `${value} recorded ${recordedAtEn}.`,
        bn: `${value} রেকর্ড করা হয়েছে ${recordedAtBn} তারিখে।`,
      },
      action: isHistorical
        ? {
            en: 'This reading is older than seven days and is shown as history, not a current alert. Review it with a clinician when relevant.',
            bn: 'এই মাপটি সাত দিনের বেশি পুরোনো; তাই এটি বর্তমান সতর্কতা নয়, ইতিহাস হিসেবে দেখানো হয়েছে। প্রাসঙ্গিক হলে চিকিৎসকের সঙ্গে আলোচনা করুন।',
          }
        : isUrgent
          ? {
              en: 'Do not rely on this app for emergencies. If you feel unwell or need urgent help, contact local emergency services or a clinician now.',
              bn: 'জরুরি অবস্থায় এই অ্যাপের ওপর নির্ভর করবেন না। অসুস্থ বোধ করলে বা দ্রুত সহায়তা প্রয়োজন হলে এখনই স্থানীয় জরুরি সেবা বা চিকিৎসকের সঙ্গে যোগাযোগ করুন।',
            }
          : {
              en: 'Check the reading, its unit and the context in which it was taken. Discuss repeated out-of-range readings with a clinician.',
              bn: 'মাপটি, এর একক এবং কোন পরিস্থিতিতে নেওয়া হয়েছে তা যাচাই করুন। বারবার স্বাভাবিক সীমার বাইরে এলে চিকিৎসকের সঙ্গে আলোচনা করুন।',
            },
      source: {
        en: 'Latest saved vital reading',
        bn: 'সর্বশেষ সংরক্ষিত ভাইটাল রিডিং',
      },
    });
  }

  if (futureVitalCount > 0) {
    insights.push({
      id: 'future-vital-dates',
      severity: 'info',
      title: {
        en: 'Future-dated vital readings',
        bn: 'ভবিষ্যৎ তারিখের ভাইটাল রিডিং',
      },
      detail: {
        en: `${futureVitalCount} reading(s) have a measurement time after the current time. They were not used for current observations.`,
        bn: `${futureVitalCount}টি মাপের সময় বর্তমান সময়ের পরে। বর্তমান পর্যবেক্ষণ তৈরিতে এগুলো ব্যবহার করা হয়নি।`,
      },
      action: {
        en: 'Check the device date and correct the measurement time if it was entered incorrectly.',
        bn: 'ডিভাইসের তারিখ যাচাই করুন। ভুল করে সময় দেওয়া হয়ে থাকলে মাপের সময়টি সংশোধন করুন।',
      },
      source: { en: 'Vital readings', bn: 'ভাইটাল রিডিং' },
    });
  }

  if (invalidVitalCount > 0) {
    insights.push({
      id: 'invalid-vital-data',
      severity: 'info',
      title: {
        en: 'Vital records need a data check',
        bn: 'কিছু ভাইটাল রেকর্ড যাচাই করা দরকার',
      },
      detail: {
        en: `${invalidVitalCount} reading(s) have an invalid date or numeric value and were skipped.`,
        bn: `${invalidVitalCount}টি মাপের তারিখ বা সংখ্যাগত মান সঠিক নয়, তাই সেগুলো বাদ দেওয়া হয়েছে।`,
      },
      action: {
        en: 'Open the Vitals Tracker and correct or remove records that were entered incorrectly.',
        bn: 'Vitals Tracker খুলে ভুলভাবে সংরক্ষিত রেকর্ড সংশোধন করুন অথবা মুছে ফেলুন।',
      },
      source: { en: 'Vital readings', bn: 'ভাইটাল রিডিং' },
    });
  }

  const activeMedications = getActiveMedications(medications, now);
  const schedulesNeedingReview = activeMedications.filter((medication) =>
    medication.startDate <= today && normalizeTimes(medication.times).length === 0,
  );

  if (schedulesNeedingReview.length > 0) {
    const count = schedulesNeedingReview.length;
    insights.push({
      id: 'medication-times-missing',
      severity: 'review',
      title: {
        en: `${count} medication schedule(s) need review`,
        bn: `${count}টি ওষুধের সময়সূচি যাচাই করা দরকার`,
      },
      detail: {
        en: 'An active medication has no valid reminder time saved.',
        bn: 'একটি সক্রিয় ওষুধের জন্য কোনো বৈধ রিমাইন্ডারের সময় সংরক্ষিত নেই।',
      },
      action: {
        en: 'Check the original instructions. Add reminder times only when they match the clinician’s directions.',
        bn: 'মূল নির্দেশনা যাচাই করুন। চিকিৎসকের নির্দেশনার সঙ্গে মিল থাকলেই রিমাইন্ডারের সময় যোগ করুন।',
      },
      source: { en: 'Medication list', bn: 'ওষুধের তালিকা' },
    });
  }

  const upcoming = getUpcomingAppointments(appointments, now);
  if (upcoming[0]) {
    const appointment = upcoming[0];
    insights.push({
      id: `appointment-${appointment.id}`,
      severity: 'info',
      title: { en: 'Upcoming appointment', bn: 'আসন্ন অ্যাপয়েন্টমেন্ট' },
      detail: {
        en: `${appointment.doctorName} · ${dateTimeLabel(appointment.dateTime, 'en')}`,
        bn: `${appointment.doctorName} · ${dateTimeLabel(appointment.dateTime, 'bn')}`,
      },
      action: {
        en: 'Prepare your questions and bring relevant records and your current medication list.',
        bn: 'আপনার প্রশ্নগুলো গুছিয়ে নিন এবং প্রাসঙ্গিক রিপোর্ট ও বর্তমান ওষুধের তালিকা সঙ্গে রাখুন।',
      },
      source: { en: 'Appointment planner', bn: 'অ্যাপয়েন্টমেন্ট তালিকা' },
    });
  }

  const oldDocumentCount = documents.filter((document) => {
    const createdAt = validTimestamp(document.createdAt);
    return createdAt !== null && nowTime - createdAt > OLD_DOCUMENT_AFTER_MS;
  }).length;

  if (oldDocumentCount > 0) {
    insights.push({
      id: 'older-documents',
      severity: 'info',
      title: { en: 'Older records in your library', bn: 'লাইব্রেরিতে পুরোনো রেকর্ড আছে' },
      detail: {
        en: `${oldDocumentCount} document(s) were added more than one year ago.`,
        bn: `এক বছরেরও বেশি আগে ${oldDocumentCount}টি ডকুমেন্ট যোগ করা হয়েছিল।`,
      },
      action: {
        en: 'Keep older results for comparison. Ask your clinician which records matter for your current care.',
        bn: 'তুলনার জন্য পুরোনো রিপোর্ট সংরক্ষণ করুন। বর্তমান চিকিৎসার জন্য কোন রিপোর্ট প্রাসঙ্গিক তা চিকিৎসকের কাছে জেনে নিন।',
      },
      source: { en: 'Document library', bn: 'ডকুমেন্ট লাইব্রেরি' },
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'no-alerts',
      severity: 'info',
      title: { en: 'No items need attention right now', bn: 'এ মুহূর্তে বিশেষভাবে যাচাই করার মতো কিছু নেই' },
      detail: vitals.length > 0
        ? {
            en: 'The latest usable vital readings did not trigger a non-normal reference check.',
            bn: 'সর্বশেষ ব্যবহারযোগ্য ভাইটাল রিডিং সাধারণ রেফারেন্স চেকে অস্বাভাবিক হিসেবে চিহ্নিত হয়নি।',
          }
        : {
            en: 'Add readings and records to see them summarized here.',
            bn: 'এখানে সারাংশ দেখতে রিডিং ও অন্যান্য রেকর্ড যোগ করুন।',
          },
      action: {
        en: 'Continue recording information as advised by your healthcare professional.',
        bn: 'আপনার স্বাস্থ্যসেবা প্রদানকারীর পরামর্শ অনুযায়ী তথ্য সংরক্ষণ চালিয়ে যান।',
      },
      source: { en: 'Saved health records', bn: 'সংরক্ষিত স্বাস্থ্য রেকর্ড' },
    });
  }

  const severityRank: Record<InsightSeverity, number> = { urgent: 0, review: 1, info: 2 };
  return insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

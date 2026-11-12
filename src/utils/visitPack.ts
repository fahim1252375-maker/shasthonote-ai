/**
 * Builds a one-page "Doctor Visit Pack" from data the user already saved.
 *
 * It is assembled deterministically (no AI), so every line is traceable to something
 * the user entered or uploaded. It never adds diagnoses or advice.
 */
import type { Appointment, HealthNote, Language, Medication, SourceDocument, VitalReading, VitalType } from '../types';
import { buildLabSeries, seriesNeedingAttention } from './labTrends';
import { dosesForDate, localDateKey, normalizeTimes } from './medications';
import { detectRedFlags } from './redFlags';
import { assessVital, filterByDays, normalizedUnit, summarizeVitals, VITAL_TYPES } from './vitals';

export interface VisitPackSection {
  id: string;
  heading: string;
  lines: string[];
}

export interface VisitPack {
  title: string;
  generatedAt: string;
  sections: VisitPackSection[];
  disclaimer: string;
}

export interface VisitPackInput {
  language: Language;
  note: HealthNote | null;
  medications: Medication[];
  vitals: VitalReading[];
  documents: SourceDocument[];
  appointments: Appointment[];
  now?: Date;
}

export const VITAL_LABELS: Record<VitalType, { en: string; bn: string }> = {
  blood_pressure: { en: 'Blood pressure', bn: 'রক্তচাপ' },
  blood_glucose: { en: 'Blood glucose', bn: 'রক্তে গ্লুকোজ' },
  weight: { en: 'Weight', bn: 'ওজন' },
  temperature: { en: 'Temperature', bn: 'তাপমাত্রা' },
  heart_rate: { en: 'Heart rate', bn: 'হৃদস্পন্দন' },
  spo2: { en: 'Oxygen saturation (SpO₂)', bn: 'অক্সিজেন স্যাচুরেশন (SpO₂)' },
};

const clean = (value: string | undefined) => (value ?? '').trim();

function splitLines(value: string | undefined): string[] {
  return clean(value)
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function formatReading(reading: VitalReading): string {
  const value = reading.type === 'blood_pressure' && reading.value2 !== undefined ? `${reading.value}/${reading.value2}` : String(reading.value);
  return `${value} ${reading.unit}`;
}

export function buildVisitPack(input: VisitPackInput): VisitPack {
  const { language, note, medications, vitals, documents, appointments } = input;
  const now = input.now ?? new Date();
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const sections: VisitPackSection[] = [];

  // 1. Concern
  if (note) {
    const lines: string[] = [];
    if (clean(note.title)) lines.push(`${tr('Note', 'নোট')}: ${clean(note.title)}`);
    if (clean(note.chiefComplaint)) lines.push(`${tr('Main concern', 'মূল সমস্যা')}: ${clean(note.chiefComplaint)}`);
    if (clean(note.onsetDate)) lines.push(`${tr('Started', 'শুরু')}: ${clean(note.onsetDate)}`);
    if (clean(note.duration)) lines.push(`${tr('How long it lasts', 'স্থায়িত্ব')}: ${clean(note.duration)}`);
    if (clean(note.symptoms)) lines.push(`${tr('Symptoms', 'লক্ষণ')}: ${clean(note.symptoms)}`);
    if (clean(note.reportedMedicalHistory)) lines.push(`${tr('Reported history', 'জানানো চিকিৎসা ইতিহাস')}: ${clean(note.reportedMedicalHistory)}`);
    sections.push({ id: 'concern', heading: tr('What I want to discuss', 'যা নিয়ে আলোচনা করতে চাই'), lines });

    // 2. Red flags the user wrote about
    const flagText = [note.chiefComplaint, note.symptoms, note.patientDescription, note.audioTranscript].filter(Boolean).join('\n');
    const flags = detectRedFlags(flagText);
    if (flags.length > 0) {
      sections.push({
        id: 'red_flags',
        heading: tr('Warning signs mentioned in my note', 'আমার নোটে উল্লেখ করা বিপদচিহ্ন'),
        lines: flags.map((flag) => `${language === 'bn' ? flag.labelBn : flag.labelEn} (${flag.severity === 'emergency' ? tr('emergency', 'জরুরি') : tr('urgent', 'জরুরি-ভিত্তিক')})`),
      });
    }

    // 3. Allergies
    sections.push({
      id: 'allergies',
      heading: tr('Allergies', 'অ্যালার্জি'),
      lines: [clean(note.allergies) || tr('Not recorded — please confirm with the patient.', 'লেখা নেই — রোগীর কাছ থেকে নিশ্চিত করুন।')],
    });
  }

  // 4. Medications
  const medLines: string[] = [];
  const today = localDateKey(now);
  for (const med of medications) {
    const isCurrent = med.active && med.startDate <= today && (!med.endDate || med.endDate >= today);
    if (!isCurrent) continue;
    const times = normalizeTimes(med.times).join(', ');
    medLines.push(`${med.name} — ${med.dose}${times ? ` (${times})` : ''}${med.notes ? ` — ${med.notes}` : ''}`);
  }
  if (note && clean(note.existingMedications)) medLines.push(`${tr('Listed in note', 'নোটে উল্লেখিত')}: ${clean(note.existingMedications)}`);
  const todaysDoses = dosesForDate(medications, today);
  if (todaysDoses.length > 0) {
    const taken = todaysDoses.filter((dose) => dose.taken).length;
    medLines.push(tr(`Today's reminders marked taken: ${taken} of ${todaysDoses.length}`, `আজকের রিমাইন্ডার: ${todaysDoses.length}টির মধ্যে ${taken}টি নেওয়া হয়েছে`));
  }
  sections.push({
    id: 'medications',
    heading: tr('Current medicines (as entered by me)', 'বর্তমান ওষুধ (আমার নিজের লেখা)'),
    lines: medLines.length > 0 ? medLines : [tr('None recorded.', 'কিছু লেখা নেই।')],
  });

  // 5. Vitals (last 30 days)
  const vitalLines: string[] = [];
  for (const type of VITAL_TYPES) {
    const recent = filterByDays(
      vitals.filter((reading) => reading.type === type),
      30,
      now,
    );
    if (recent.length === 0) continue;
    const summary = summarizeVitals(recent);
    const latest = summary.latest;
    if (!latest) continue;
    const assessment = assessVital(latest);
    const unit = normalizedUnit(type);
    const range = type === 'blood_pressure' || summary.min === null ? '' : `, ${tr('range', 'পরিসর')} ${summary.min}–${summary.max} ${unit}`;
    const label = language === 'bn' ? VITAL_LABELS[type].bn : VITAL_LABELS[type].en;
    const status = assessment ? ` — ${language === 'bn' ? assessment.labelBn : assessment.labelEn}` : '';
    vitalLines.push(`${label}: ${tr('latest', 'সর্বশেষ')} ${formatReading(latest)}${status} (${recent.length} ${tr('readings, last 30 days', 'বার মাপা, গত ৩০ দিন')}${range})`);
  }
  sections.push({
    id: 'vitals',
    heading: tr('Home measurements (last 30 days)', 'বাসায় মাপা তথ্য (গত ৩০ দিন)'),
    lines: vitalLines.length > 0 ? vitalLines : [tr('No readings logged.', 'কোনো মাপ লেখা নেই।')],
  });

  // 6. Labs needing attention
  const labDocuments = documents.filter((document) => document.category === 'lab_report');
  const attention = seriesNeedingAttention(buildLabSeries(labDocuments));
  if (attention.length > 0) {
    sections.push({
      id: 'labs',
      heading: tr('Lab values flagged in my uploaded reports', 'আপলোড করা রিপোর্টে চিহ্নিত ল্যাব মান'),
      lines: [
        ...attention.map((series) => {
          const latest = series.points[series.points.length - 1];
          const reference =
            series.refLow !== undefined || series.refHigh !== undefined
              ? ` (${tr('reference', 'রেফারেন্স')} ${series.refLow ?? ''}${series.refLow !== undefined && series.refHigh !== undefined ? '–' : ''}${series.refHigh !== undefined && series.refLow === undefined ? '<' : ''}${series.refHigh ?? ''})`
              : '';
          return `${series.name}: ${latest.value}${series.unit ? ` ${series.unit}` : ''}${reference} — ${latest.docName}`;
        }),
        tr('Values were extracted automatically; please check the original reports.', 'মানগুলো স্বয়ংক্রিয়ভাবে নেওয়া; মূল রিপোর্ট দেখে যাচাই করুন।'),
      ],
    });
  }

  // 7. Questions
  if (note) {
    const questions = splitLines(note.questionsForDoctor);
    const missing = (note.missingInformationFlags ?? []).map(clean).filter(Boolean);
    sections.push({
      id: 'questions',
      heading: tr('Questions for the doctor', 'ডাক্তারকে প্রশ্ন'),
      lines: questions.length > 0 ? questions : [tr('None written yet.', 'এখনো লেখা হয়নি।')],
    });
    if (missing.length > 0) {
      sections.push({ id: 'missing', heading: tr('Information I still need to add', 'যে তথ্য এখনো যোগ করা বাকি'), lines: missing });
    }
  }

  // 8. Upcoming appointment
  const upcoming = appointments.filter((appointment) => appointment.status === 'upcoming');
  if (upcoming.length > 0) {
    sections.push({
      id: 'appointment',
      heading: tr('Upcoming appointment', 'আসন্ন অ্যাপয়েন্টমেন্ট'),
      lines: upcoming.slice(0, 2).map((appointment) => `${appointment.doctorName} — ${appointment.specialty}, ${appointment.dateTime}, ${appointment.location}`),
    });
  }

  return {
    title: tr('Doctor Visit Pack', 'ডাক্তার ভিজিট প্যাক'),
    generatedAt: now.toISOString(),
    sections,
    disclaimer: tr(
      'Prepared by the patient with ShasthoNote AI from self-entered and uploaded information. It is not a diagnosis or medical advice. Please verify details with the original records.',
      'রোগী নিজে ShasthoNote AI দিয়ে নিজের লেখা ও আপলোড করা তথ্য থেকে তৈরি করেছেন। এটি রোগনির্ণয় বা চিকিৎসা পরামর্শ নয়। মূল রেকর্ডের সাথে যাচাই করুন।',
    ),
  };
}

export function visitPackToText(pack: VisitPack): string {
  const body = pack.sections.map((section) => `${section.heading}\n${section.lines.map((line) => `  • ${line}`).join('\n')}`);
  return [pack.title, new Date(pack.generatedAt).toLocaleString(), '', ...body.flatMap((block) => [block, '']), pack.disclaimer].join('\n');
}

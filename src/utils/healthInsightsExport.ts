import type { Language } from '../types';
import type { HealthInsight } from './healthInsights';

export interface HealthInsightsExportInput {
  insights: HealthInsight[];
  language: Language;
  generatedAt: Date;
  counts: {
    vitalReadings: number;
    medicationRecords: number;
    activeMedications: number;
    documents: number;
    appointments: number;
    upcomingAppointments: number;
  };
}

/** Build the downloadable overview without touching browser APIs. */
export function buildHealthInsightsExport(input: HealthInsightsExportInput): string {
  const { insights, language, generatedAt, counts } = input;
  const bn = language === 'bn';
  const locale = bn ? 'bn-BD' : 'en-GB';
  const lines = [
    bn ? 'ShasthoNote AI — স্বাস্থ্য রেকর্ডের সারাংশ' : 'ShasthoNote AI — Health record overview',
    `${bn ? 'তৈরির সময়' : 'Generated'}: ${generatedAt.toLocaleString(locale)}`,
    `${bn ? 'রেকর্ড' : 'Records'}: ${counts.vitalReadings} ${bn ? 'ভাইটাল রিডিং' : 'vital readings'}; ${counts.medicationRecords} ${bn ? 'ওষুধের রেকর্ড' : 'medication records'} (${counts.activeMedications} ${bn ? 'সক্রিয়' : 'active'}); ${counts.documents} ${bn ? 'ডকুমেন্ট' : 'documents'}; ${counts.appointments} ${bn ? 'অ্যাপয়েন্টমেন্ট' : 'appointments'} (${counts.upcomingAppointments} ${bn ? 'আসন্ন' : 'upcoming'})`,
    '',
    bn ? 'পর্যবেক্ষণ (রোগ নির্ণয় নয়)' : 'OBSERVATIONS (not a diagnosis)',
    ...insights.map((insight) => {
      const severity = bn
        ? insight.severity === 'urgent' ? 'জরুরি' : insight.severity === 'review' ? 'যাচাই' : 'তথ্য'
        : insight.severity.toUpperCase();
      return [
        `[${severity}] ${insight.title[language]}`,
        insight.detail[language],
        `${bn ? 'পরবর্তী পদক্ষেপ' : 'Suggested next step'}: ${insight.action[language]}`,
        `${bn ? 'উৎস' : 'Source'}: ${insight.source[language]}`,
      ].join('\n');
    }),
    '',
    bn
      ? 'এই সারাংশ আপনার সংরক্ষিত তথ্য ও সাধারণ রেফারেন্স-চেক থেকে তৈরি। এটি চিকিৎসা পরামর্শ নয় এবং চিকিৎসকের বিকল্প নয়।'
      : 'This overview is generated from saved records and general reference checks. It is not medical advice and does not replace a clinician.',
  ];

  return lines.join('\n\n');
}

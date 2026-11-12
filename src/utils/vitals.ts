/**
 * Pure helpers for the Vitals Tracker. No React, no network.
 *
 * Reference ranges here are common general-population guidance (AHA/ACC for blood
 * pressure, ADA/WHO-style cut-offs for glucose, etc.). They are shown as context only:
 * a person's own targets set by their doctor always take priority, and nothing here is a diagnosis.
 */
import { evaluateBloodPressure } from './healthCalculators';
import type { VitalContext, VitalReading, VitalType } from '../types';

export const VITAL_TYPES: VitalType[] = [
  'blood_pressure',
  'blood_glucose',
  'weight',
  'temperature',
  'heart_rate',
  'spo2',
];

export const VITAL_UNITS: Record<VitalType, string[]> = {
  blood_pressure: ['mmHg'],
  blood_glucose: ['mmol/L', 'mg/dL'],
  weight: ['kg'],
  temperature: ['°C', '°F'],
  heart_rate: ['bpm'],
  spo2: ['%'],
};

export const VITAL_CONTEXTS: Partial<Record<VitalType, VitalContext[]>> = {
  blood_glucose: ['fasting', 'after_meal', 'random'],
  heart_rate: ['resting', 'after_activity'],
};

/** Structural validation for saved readings before they enter summaries or reference checks. */
export function isValidVitalReading(
  reading: Pick<VitalReading, 'type' | 'value' | 'value2' | 'unit'>,
): boolean {
  const units = VITAL_UNITS[reading.type];
  if (!units || !units.includes(reading.unit) || !Number.isFinite(reading.value)) return false;
  if (reading.type === 'blood_pressure' && !Number.isFinite(reading.value2)) return false;
  return reading.value2 === undefined || Number.isFinite(reading.value2);
}

export type VitalLevel = 'normal' | 'watch' | 'low' | 'high' | 'urgent';

export interface VitalAssessment {
  level: VitalLevel;
  labelEn: string;
  labelBn: string;
}

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const MG_DL_PER_MMOL_L = 18.016;

export function glucoseToMmol(value: number, unit: string): number {
  return unit === 'mg/dL' ? round(value / MG_DL_PER_MMOL_L, 1) : round(value, 1);
}

export function temperatureToCelsius(value: number, unit: string): number {
  return unit === '°F' ? round(((value - 32) * 5) / 9, 1) : round(value, 1);
}

/** Primary value on a normalised scale (glucose → mmol/L, temperature → °C) for charts and stats. */
export function normalizedValue(reading: Pick<VitalReading, 'type' | 'value' | 'unit'>): number {
  if (reading.type === 'blood_glucose') return glucoseToMmol(reading.value, reading.unit);
  if (reading.type === 'temperature') return temperatureToCelsius(reading.value, reading.unit);
  return reading.value;
}

export function normalizedUnit(type: VitalType): string {
  if (type === 'blood_glucose') return 'mmol/L';
  if (type === 'temperature') return '°C';
  return VITAL_UNITS[type][0];
}

export function assessVital(
  reading: Pick<VitalReading, 'type' | 'value' | 'value2' | 'unit' | 'context'>,
): VitalAssessment | null {
  switch (reading.type) {
    case 'blood_pressure': {
      if (typeof reading.value2 !== 'number') return null;
      const bp = evaluateBloodPressure(reading.value, reading.value2);
      const level: VitalLevel =
        bp.category === 'Normal'
          ? 'normal'
          : bp.category === 'Hypertensive Crisis'
            ? 'urgent'
            : bp.category === 'Stage 2 Hypertension'
              ? 'high'
              : 'watch';
      return { level, labelEn: bp.category, labelBn: bp.categoryBn };
    }
    case 'blood_glucose': {
      const mmol = glucoseToMmol(reading.value, reading.unit);
      if (mmol < 3.0) return { level: 'urgent', labelEn: 'Very low — seek help now', labelBn: 'অত্যন্ত কম — এখনই সহায়তা নিন' };
      if (mmol < 3.9) return { level: 'low', labelEn: 'Low', labelBn: 'কম' };
      if (mmol > 16.7) return { level: 'urgent', labelEn: 'Very high — contact a doctor today', labelBn: 'অত্যন্ত বেশি — আজই ডাক্তারের সাথে যোগাযোগ করুন' };
      const context = reading.context ?? 'random';
      if (context === 'fasting') {
        if (mmol <= 5.5) return { level: 'normal', labelEn: 'Within the usual fasting range', labelBn: 'ফাস্টিং-এর স্বাভাবিক সীমার মধ্যে' };
        if (mmol <= 6.9) return { level: 'watch', labelEn: 'Above usual fasting range', labelBn: 'ফাস্টিং-এর স্বাভাবিক সীমার উপরে' };
        return { level: 'high', labelEn: 'High — discuss with your doctor', labelBn: 'বেশি — ডাক্তারের সাথে আলোচনা করুন' };
      }
      if (mmol < 7.8) return { level: 'normal', labelEn: 'Within the usual range', labelBn: 'স্বাভাবিক সীমার মধ্যে' };
      if (mmol <= 11.0) return { level: 'watch', labelEn: 'Above usual range', labelBn: 'স্বাভাবিক সীমার উপরে' };
      return { level: 'high', labelEn: 'High — discuss with your doctor', labelBn: 'বেশি — ডাক্তারের সাথে আলোচনা করুন' };
    }
    case 'spo2': {
      if (reading.value >= 95) return { level: 'normal', labelEn: 'Within the usual range', labelBn: 'স্বাভাবিক সীমার মধ্যে' };
      if (reading.value >= 91) return { level: 'low', labelEn: 'Below usual — recheck and tell a clinician', labelBn: 'স্বাভাবিকের নিচে — আবার মাপুন এবং চিকিৎসককে জানান' };
      return { level: 'urgent', labelEn: 'Very low — seek urgent care', labelBn: 'অত্যন্ত কম — জরুরি চিকিৎসা নিন' };
    }
    case 'heart_rate': {
      if (reading.value < 40 || reading.value > 130) return { level: 'urgent', labelEn: 'Unusual — seek medical advice today', labelBn: 'অস্বাভাবিক — আজই চিকিৎসকের পরামর্শ নিন' };
      if (reading.context === 'after_activity') {
        return { level: 'normal', labelEn: 'After activity — rate naturally rises', labelBn: 'কার্যকলাপের পরে — স্বাভাবিকভাবেই বাড়ে' };
      }
      if (reading.value < 60) return { level: 'low', labelEn: 'Below the usual resting range', labelBn: 'বিশ্রামকালীন স্বাভাবিকের নিচে' };
      if (reading.value <= 100) return { level: 'normal', labelEn: 'Within the usual resting range', labelBn: 'বিশ্রামকালীন স্বাভাবিক সীমার মধ্যে' };
      return { level: 'high', labelEn: 'Above the usual resting range', labelBn: 'বিশ্রামকালীন স্বাভাবিকের উপরে' };
    }
    case 'temperature': {
      const celsius = temperatureToCelsius(reading.value, reading.unit);
      if (celsius >= 40) return { level: 'urgent', labelEn: 'Very high fever — seek care now', labelBn: 'অত্যন্ত বেশি জ্বর — এখনই চিকিৎসা নিন' };
      if (celsius < 35) return { level: 'urgent', labelEn: 'Very low body temperature — seek care now', labelBn: 'শরীরের তাপমাত্রা অত্যন্ত কম — এখনই চিকিৎসা নিন' };
      if (celsius >= 38.1) return { level: 'high', labelEn: 'Fever', labelBn: 'জ্বর' };
      if (celsius >= 37.3) return { level: 'watch', labelEn: 'Slightly raised', labelBn: 'সামান্য বেশি' };
      if (celsius >= 36.1) return { level: 'normal', labelEn: 'Within the usual range', labelBn: 'স্বাভাবিক সীমার মধ্যে' };
      return { level: 'low', labelEn: 'Slightly low', labelBn: 'সামান্য কম' };
    }
    case 'weight':
    default:
      return null;
  }
}

export interface VitalValidation {
  ok: boolean;
  messageEn?: string;
  messageBn?: string;
}

const invalid = (messageEn: string, messageBn: string): VitalValidation => ({ ok: false, messageEn, messageBn });

/** Sanity-check typed values so typos (e.g. 1200 instead of 120) do not pollute the log. */
export function validateVitalInput(
  type: VitalType,
  value: number,
  value2: number | undefined,
  unit: string,
): VitalValidation {
  if (!Number.isFinite(value)) return invalid('Enter a number.', 'একটি সংখ্যা লিখুন।');
  switch (type) {
    case 'blood_pressure':
      if (typeof value2 !== 'number' || !Number.isFinite(value2)) return invalid('Enter both systolic and diastolic values.', 'সিস্টোলিক ও ডায়াস্টোলিক দুটি মানই লিখুন।');
      if (value < 50 || value > 260) return invalid('Systolic should be between 50 and 260 mmHg.', 'সিস্টোলিক ৫০ থেকে ২৬০ mmHg-এর মধ্যে হতে হবে।');
      if (value2 < 30 || value2 > 160) return invalid('Diastolic should be between 30 and 160 mmHg.', 'ডায়াস্টোলিক ৩০ থেকে ১৬০ mmHg-এর মধ্যে হতে হবে।');
      if (value <= value2) return invalid('Systolic must be higher than diastolic.', 'সিস্টোলিক অবশ্যই ডায়াস্টোলিকের চেয়ে বেশি হতে হবে।');
      return { ok: true };
    case 'blood_glucose': {
      const mmol = glucoseToMmol(value, unit);
      if (mmol < 1 || mmol > 40) return invalid('Glucose looks out of range. Check the value and unit.', 'গ্লুকোজের মান অস্বাভাবিক। মান ও একক যাচাই করুন।');
      return { ok: true };
    }
    case 'weight':
      if (value < 1 || value > 400) return invalid('Weight should be between 1 and 400 kg.', 'ওজন ১ থেকে ৪০০ কেজির মধ্যে হতে হবে।');
      return { ok: true };
    case 'temperature': {
      const celsius = temperatureToCelsius(value, unit);
      if (celsius < 30 || celsius > 45) return invalid('Temperature looks out of range. Check the value and unit.', 'তাপমাত্রা অস্বাভাবিক। মান ও একক যাচাই করুন।');
      return { ok: true };
    }
    case 'heart_rate':
      if (value < 20 || value > 250) return invalid('Heart rate should be between 20 and 250 bpm.', 'হৃদস্পন্দন ২০ থেকে ২৫০ bpm-এর মধ্যে হতে হবে।');
      return { ok: true };
    case 'spo2':
      if (value < 50 || value > 100) return invalid('SpO₂ should be between 50 and 100 %.', 'SpO₂ ৫০ থেকে ১০০ %-এর মধ্যে হতে হবে।');
      return { ok: true };
    default:
      return invalid('Unknown measurement type.', 'অজানা পরিমাপের ধরন।');
  }
}

// --- Series & statistics ---------------------------------------------------

export function sortByMeasuredAt<T extends { measuredAt: string }>(readings: T[]): T[] {
  return readings
    .filter((reading) => Number.isFinite(Date.parse(reading.measuredAt)))
    .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt));
}

export function filterByDays<T extends { measuredAt: string }>(readings: T[], days: number | null, now = new Date()): T[] {
  const validReadings = readings.filter((reading) => Number.isFinite(Date.parse(reading.measuredAt)));
  if (days === null) return validReadings;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return validReadings.filter((reading) => Date.parse(reading.measuredAt) >= cutoff);
}

export type VitalTrend = 'rising' | 'falling' | 'stable' | 'insufficient';

export interface VitalSummary {
  count: number;
  latest: VitalReading | null;
  min: number | null;
  max: number | null;
  average: number | null;
  trend: VitalTrend;
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Summarise one measurement type (readings must already be filtered to that type). */
export function summarizeVitals(readings: VitalReading[]): VitalSummary {
  const sorted = sortByMeasuredAt(readings).filter((reading) =>
    isValidVitalReading(reading) && Number.isFinite(normalizedValue(reading)),
  );
  if (sorted.length === 0) return { count: 0, latest: null, min: null, max: null, average: null, trend: 'insufficient' };

  const values = sorted.map(normalizedValue);
  let trend: VitalTrend = 'insufficient';
  if (values.length >= 4) {
    const recent = values.slice(-3);
    const previous = values.slice(-6, -3);
    const base = mean(previous);
    const change = base === 0 ? 0 : (mean(recent) - base) / Math.abs(base);
    trend = change > 0.03 ? 'rising' : change < -0.03 ? 'falling' : 'stable';
  }

  return {
    count: sorted.length,
    latest: sorted[sorted.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    average: round(mean(values), 1),
    trend,
  };
}

// --- Chart geometry --------------------------------------------------------

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartGeometry {
  points: Array<{ x: number; y: number }>;
  domain: [number, number];
}

export function computeDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [min - 1, max + 1];
  const margin = (max - min) * 0.1;
  return [min - margin, max + margin];
}

/** Map values to SVG coordinates. A single value is centred; a shared domain lets two series align. */
export function chartGeometry(
  values: number[],
  width: number,
  height: number,
  padding: ChartPadding,
  domain: [number, number] = computeDomain(values),
): ChartGeometry {
  const innerWidth = Math.max(1, width - padding.left - padding.right);
  const innerHeight = Math.max(1, height - padding.top - padding.bottom);
  const [low, high] = domain;
  const span = high - low || 1;

  const points = values.map((value, index) => {
    const x = values.length === 1 ? padding.left + innerWidth / 2 : padding.left + (innerWidth * index) / (values.length - 1);
    const y = padding.top + innerHeight - ((value - low) / span) * innerHeight;
    return { x: round(x, 2), y: round(y, 2) };
  });

  return { points, domain };
}

// --- CSV export ------------------------------------------------------------

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function vitalsToCsv(readings: VitalReading[]): string {
  const header = ['measured_at', 'type', 'value', 'value2', 'unit', 'context', 'assessment', 'note'];
  const rows = sortByMeasuredAt(readings).map((reading) => {
    const assessment = assessVital(reading);
    return [
      reading.measuredAt,
      reading.type,
      reading.value,
      reading.value2,
      reading.unit,
      reading.context,
      assessment?.labelEn,
      reading.note,
    ]
      .map(csvCell)
      .join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

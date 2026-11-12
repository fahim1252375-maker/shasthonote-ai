/**
 * Builds per-test trend series from the `findings` of saved lab documents.
 *
 * Values come from AI/OCR extraction, so they can be wrong. Dates are the day the
 * document was saved in the app (not necessarily the day the sample was taken).
 * The UI must always tell users to verify values against the original report.
 */
import type { SourceDocument } from '../types';

export interface LabPoint {
  date: string;
  value: number;
  docId: string;
  docName: string;
  flagged: boolean;
}

export type LabStatus = 'normal' | 'high' | 'low' | 'flagged' | 'unknown';

export interface LabSeries {
  key: string;
  name: string;
  unit?: string;
  points: LabPoint[];
  refLow?: number;
  refHigh?: number;
  latestStatus: LabStatus;
}

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toAsciiDigits(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(BANGLA_DIGITS.indexOf(digit)));
}

export function parseNumericValue(raw: unknown): { value: number; unit?: string } | null {
  if (typeof raw !== 'string') return null;
  const text = toAsciiDigits(raw).trim();
  // "120/80" and other fractions are not single values (units such as "g/dL" are fine).
  if (!text || /^[<>≤≥~]?\s*\d+(?:\.\d+)?\s*\/\s*\d/.test(text)) return null;
  const match = text.match(/^[<>≤≥~]?\s*(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?)\s*(.*)$/u);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const unit = match[2].trim().slice(0, 24);
  return { value, unit: unit || undefined };
}

export function parseReferenceRange(raw: unknown): { low?: number; high?: number } | null {
  if (typeof raw !== 'string') return null;
  const text = toAsciiDigits(raw).trim();
  if (!text) return null;

  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/iu);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (low <= high) return { low, high };
  }
  const upper = text.match(/^\s*(?:<=?|≤|up\s*to|upto|below|less\s+than)\s*(\d+(?:\.\d+)?)/iu);
  if (upper) return { high: Number(upper[1]) };
  const lower = text.match(/^\s*(?:>=?|≥|above|greater\s+than|at\s+least)\s*(\d+(?:\.\d+)?)/iu);
  if (lower) return { low: Number(lower[1]) };
  return null;
}

export function normalizeTestName(name: string): string {
  return name
    .toLocaleLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}

const FLAG_WORDS = /flag|high|low|abnormal|critical|elevated|out of range|borderline/i;

function statusOf(value: number, low: number | undefined, high: number | undefined, statusText: string): LabStatus {
  if (high !== undefined && value > high) return 'high';
  if (low !== undefined && value < low) return 'low';
  if (low !== undefined || high !== undefined) return FLAG_WORDS.test(statusText) && !/normal/i.test(statusText) ? 'flagged' : 'normal';
  if (/normal/i.test(statusText)) return 'normal';
  return FLAG_WORDS.test(statusText) ? 'flagged' : 'unknown';
}

export function buildLabSeries(documents: SourceDocument[]): LabSeries[] {
  const byKey = new Map<string, LabSeries>();

  const sortedDocs = [...documents].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const document of sortedDocs) {
    if (!Array.isArray(document.findings)) continue;
    for (const finding of document.findings) {
      if (!finding || typeof finding.testOrItem !== 'string') continue;
      const parsed = parseNumericValue(finding.value);
      if (!parsed) continue;
      const key = normalizeTestName(finding.testOrItem);
      if (!key) continue;

      const reference = parseReferenceRange(finding.referenceRange);
      const statusText = typeof finding.status === 'string' ? finding.status : '';
      const status = statusOf(parsed.value, reference?.low, reference?.high, statusText);

      let series = byKey.get(key);
      if (!series) {
        series = { key, name: finding.testOrItem.trim(), unit: parsed.unit, points: [], latestStatus: 'unknown' };
        byKey.set(key, series);
      }
      series.points.push({
        date: document.createdAt,
        value: parsed.value,
        docId: document.id,
        docName: document.name,
        flagged: status === 'high' || status === 'low' || status === 'flagged',
      });
      if (!series.unit && parsed.unit) series.unit = parsed.unit;
      if (reference?.low !== undefined) series.refLow = reference.low;
      if (reference?.high !== undefined) series.refHigh = reference.high;
      series.latestStatus = status; // documents are iterated oldest → newest
    }
  }

  return [...byKey.values()].sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));
}

/** Series whose most recent value needs attention (used by the visit pack). */
export function seriesNeedingAttention(series: LabSeries[]): LabSeries[] {
  return series.filter((item) => item.latestStatus === 'high' || item.latestStatus === 'low' || item.latestStatus === 'flagged');
}

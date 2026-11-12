import test from 'node:test';
import assert from 'node:assert/strict';
import type { SourceDocument } from '../types';
import {
  buildLabSeries,
  normalizeTestName,
  parseNumericValue,
  parseReferenceRange,
  seriesNeedingAttention,
  toAsciiDigits,
} from './labTrends';

const doc = (id: string, createdAt: string, findings: SourceDocument['findings']): SourceDocument => ({
  id,
  userId: 'u1',
  name: `Report ${id}`,
  category: 'lab_report',
  fileType: 'text',
  extractedText: '',
  createdAt,
  findings,
});

test('parseNumericValue handles units, qualifiers, commas and Bangla digits', () => {
  assert.deepEqual(parseNumericValue('13.5 g/dL'), { value: 13.5, unit: 'g/dL' });
  assert.deepEqual(parseNumericValue('<5'), { value: 5, unit: undefined });
  assert.deepEqual(parseNumericValue('1,200 /µL'), { value: 1200, unit: '/µL' });
  assert.deepEqual(parseNumericValue('৭.২ mmol/L'), { value: 7.2, unit: 'mmol/L' });
  assert.equal(parseNumericValue('120/80'), null);
  assert.equal(parseNumericValue('Positive'), null);
  assert.equal(parseNumericValue(''), null);
  assert.equal(parseNumericValue(42), null);
  assert.equal(toAsciiDigits('১২৩'), '123');
});

test('parseReferenceRange understands ranges and one-sided limits', () => {
  assert.deepEqual(parseReferenceRange('12.0 - 15.5 g/dL'), { low: 12, high: 15.5 });
  assert.deepEqual(parseReferenceRange('3.5–5.0'), { low: 3.5, high: 5 });
  assert.deepEqual(parseReferenceRange('< 200'), { high: 200 });
  assert.deepEqual(parseReferenceRange('Up to 5.7'), { high: 5.7 });
  assert.deepEqual(parseReferenceRange('>= 40'), { low: 40 });
  assert.equal(parseReferenceRange('see note'), null);
  assert.equal(parseReferenceRange(undefined), null);
});

test('normalizeTestName ignores case, punctuation and bracketed aliases', () => {
  assert.equal(normalizeTestName('Hemoglobin (Hb)'), 'hemoglobin');
  assert.equal(normalizeTestName('  HbA1c  '), 'hba1c');
  assert.equal(normalizeTestName('Fasting Blood Glucose'), 'fasting blood glucose');
});

test('buildLabSeries groups the same test across documents in date order', () => {
  const series = buildLabSeries([
    doc('b', '2026-10-01T00:00:00.000Z', [
      { testOrItem: 'HbA1c', value: '7.4 %', referenceRange: '< 5.7', status: 'Flagged' },
      { testOrItem: 'Hemoglobin (Hb)', value: '13.1 g/dL', referenceRange: '12.0 - 15.5', status: 'Normal' },
    ]),
    doc('a', '2026-05-01T00:00:00.000Z', [
      { testOrItem: 'hba1c', value: '8.1 %', referenceRange: '< 5.7', status: 'Flagged' },
    ]),
  ]);

  const hba1c = series.find((item) => item.key === 'hba1c');
  assert.ok(hba1c);
  assert.equal(series[0].key, 'hba1c', 'series with more points come first');
  assert.deepEqual(hba1c.points.map((p) => p.value), [8.1, 7.4]);
  assert.equal(hba1c.unit, '%');
  assert.equal(hba1c.refHigh, 5.7);
  assert.equal(hba1c.latestStatus, 'high');
  assert.ok(hba1c.points.every((p) => p.flagged));

  const hemoglobin = series.find((item) => item.key === 'hemoglobin');
  assert.equal(hemoglobin?.latestStatus, 'normal');
  assert.equal(hemoglobin?.refLow, 12);
});

test('non-numeric findings and malformed data are skipped safely', () => {
  const series = buildLabSeries([
    doc('c', '2026-11-01T00:00:00.000Z', [
      { testOrItem: 'Urine protein', value: 'Negative', status: 'Normal' },
      { testOrItem: '', value: '5', status: 'Normal' },
    ]),
    { ...doc('d', '2026-11-02T00:00:00.000Z', undefined), findings: undefined },
  ]);
  assert.deepEqual(series, []);
});

test('status falls back to the extracted status text when there is no reference range', () => {
  const series = buildLabSeries([
    doc('e', '2026-11-01T00:00:00.000Z', [
      { testOrItem: 'ALT', value: '88 U/L', status: 'High' },
      { testOrItem: 'TSH', value: '2.1 mIU/L', status: 'Normal' },
      { testOrItem: 'Ferritin', value: '40 ng/mL', status: 'Unclear' },
    ]),
  ]);
  const statusOf = (key: string) => series.find((item) => item.key === key)?.latestStatus;
  assert.equal(statusOf('alt'), 'flagged');
  assert.equal(statusOf('tsh'), 'normal');
  assert.equal(statusOf('ferritin'), 'unknown');
  assert.deepEqual(seriesNeedingAttention(series).map((item) => item.key), ['alt']);
});

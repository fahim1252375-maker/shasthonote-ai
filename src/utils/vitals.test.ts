import test from 'node:test';
import assert from 'node:assert/strict';
import type { VitalReading } from '../types';
import {
  assessVital,
  chartGeometry,
  computeDomain,
  filterByDays,
  glucoseToMmol,
  isValidVitalReading,
  normalizedValue,
  summarizeVitals,
  sortByMeasuredAt,
  temperatureToCelsius,
  validateVitalInput,
  vitalsToCsv,
} from './vitals';

const reading = (overrides: Partial<VitalReading>): VitalReading => ({
  id: 'v1',
  userId: 'u1',
  type: 'weight',
  value: 70,
  unit: 'kg',
  measuredAt: '2026-11-01T08:00:00.000Z',
  createdAt: '2026-11-01T08:00:00.000Z',
  ...overrides,
});

test('unit conversions for glucose and temperature', () => {
  assert.equal(glucoseToMmol(126, 'mg/dL'), 7);
  assert.equal(glucoseToMmol(7.2, 'mmol/L'), 7.2);
  assert.equal(temperatureToCelsius(100.4, '°F'), 38);
  assert.equal(temperatureToCelsius(37, '°C'), 37);
  assert.equal(normalizedValue({ type: 'blood_glucose', value: 90, unit: 'mg/dL' }), 5);
});

test('blood pressure assessment maps AHA categories to levels', () => {
  const level = (s: number, d: number) => assessVital({ type: 'blood_pressure', value: s, value2: d, unit: 'mmHg' })?.level;
  assert.equal(level(115, 75), 'normal');
  assert.equal(level(125, 75), 'watch');
  assert.equal(level(145, 95), 'high');
  assert.equal(level(190, 125), 'urgent');
  assert.equal(assessVital({ type: 'blood_pressure', value: 120, unit: 'mmHg' }), null);
});

test('glucose assessment depends on context and unit', () => {
  const level = (value: number, unit: string, context?: VitalReading['context']) =>
    assessVital({ type: 'blood_glucose', value, unit, context })?.level;
  assert.equal(level(5.0, 'mmol/L', 'fasting'), 'normal');
  assert.equal(level(6.2, 'mmol/L', 'fasting'), 'watch');
  assert.equal(level(7.8, 'mmol/L', 'fasting'), 'high');
  assert.equal(level(7.0, 'mmol/L', 'after_meal'), 'normal');
  assert.equal(level(9.5, 'mmol/L', 'after_meal'), 'watch');
  assert.equal(level(13, 'mmol/L', 'random'), 'high');
  assert.equal(level(3.5, 'mmol/L', 'random'), 'low');
  assert.equal(level(2.5, 'mmol/L', 'random'), 'urgent');
  assert.equal(level(320, 'mg/dL', 'random'), 'urgent');
  assert.equal(level(90, 'mg/dL', 'fasting'), 'normal');
});

test('SpO2, heart rate and temperature thresholds', () => {
  assert.equal(assessVital({ type: 'spo2', value: 97, unit: '%' })?.level, 'normal');
  assert.equal(assessVital({ type: 'spo2', value: 93, unit: '%' })?.level, 'low');
  assert.equal(assessVital({ type: 'spo2', value: 88, unit: '%' })?.level, 'urgent');
  assert.equal(assessVital({ type: 'heart_rate', value: 72, unit: 'bpm', context: 'resting' })?.level, 'normal');
  assert.equal(assessVital({ type: 'heart_rate', value: 110, unit: 'bpm', context: 'after_activity' })?.level, 'normal');
  assert.equal(assessVital({ type: 'heart_rate', value: 110, unit: 'bpm', context: 'resting' })?.level, 'high');
  assert.equal(assessVital({ type: 'heart_rate', value: 35, unit: 'bpm' })?.level, 'urgent');
  assert.equal(assessVital({ type: 'temperature', value: 36.8, unit: '°C' })?.level, 'normal');
  assert.equal(assessVital({ type: 'temperature', value: 38.6, unit: '°C' })?.level, 'high');
  assert.equal(assessVital({ type: 'temperature', value: 104.5, unit: '°F' })?.level, 'urgent');
  assert.equal(assessVital({ type: 'weight', value: 70, unit: 'kg' }), null);
});

test('saved vital structure requires a supported unit and complete blood pressure pair', () => {
  assert.equal(isValidVitalReading(reading({ type: 'weight', value: 70, unit: 'kg' })), true);
  assert.equal(isValidVitalReading(reading({ type: 'weight', value: 70, unit: 'lb' })), false);
  assert.equal(isValidVitalReading(reading({ type: 'blood_pressure', value: 120, value2: 80, unit: 'mmHg' })), true);
  assert.equal(isValidVitalReading(reading({ type: 'blood_pressure', value: 120, value2: undefined, unit: 'mmHg' })), false);
  assert.equal(isValidVitalReading(reading({ type: 'spo2', value: Number.NaN, unit: '%' })), false);
});

test('input validation rejects implausible values', () => {
  assert.equal(validateVitalInput('blood_pressure', 120, 80, 'mmHg').ok, true);
  assert.equal(validateVitalInput('blood_pressure', 80, 120, 'mmHg').ok, false);
  assert.equal(validateVitalInput('blood_pressure', 1200, 80, 'mmHg').ok, false);
  assert.equal(validateVitalInput('blood_pressure', 120, undefined, 'mmHg').ok, false);
  assert.equal(validateVitalInput('blood_glucose', 7.2, undefined, 'mmol/L').ok, true);
  assert.equal(validateVitalInput('blood_glucose', 72, undefined, 'mmol/L').ok, false);
  assert.equal(validateVitalInput('blood_glucose', 130, undefined, 'mg/dL').ok, true);
  assert.equal(validateVitalInput('temperature', 98.6, undefined, '°F').ok, true);
  assert.equal(validateVitalInput('temperature', 986, undefined, '°F').ok, false);
  assert.equal(validateVitalInput('weight', Number.NaN, undefined, 'kg').ok, false);
  assert.equal(validateVitalInput('spo2', 101, undefined, '%').ok, false);
  assert.equal(validateVitalInput('heart_rate', 72, undefined, 'bpm').ok, true);
});

test('summarizeVitals computes stats and trend on normalised values', () => {
  assert.equal(summarizeVitals([]).count, 0);
  assert.equal(summarizeVitals([]).trend, 'insufficient');

  const rising = [60, 61, 62, 70, 72, 74].map((value, index) =>
    reading({ id: `w${index}`, value, measuredAt: `2026-11-0${index + 1}T08:00:00.000Z` }),
  );
  const summary = summarizeVitals(rising);
  assert.equal(summary.count, 6);
  assert.equal(summary.min, 60);
  assert.equal(summary.max, 74);
  assert.equal(summary.trend, 'rising');
  assert.equal(summary.latest?.value, 74);

  const flat = [70, 70.5, 70, 70.2, 70.1, 70.3].map((value, index) =>
    reading({ id: `f${index}`, value, measuredAt: `2026-11-0${index + 1}T08:00:00.000Z` }),
  );
  assert.equal(summarizeVitals(flat).trend, 'stable');
  assert.equal(summarizeVitals(flat.slice(0, 3)).trend, 'insufficient');
});

test('summaries are order-independent (sorted by measuredAt)', () => {
  const a = reading({ id: 'a', value: 70, measuredAt: '2026-11-01T08:00:00.000Z' });
  const b = reading({ id: 'b', value: 72, measuredAt: '2026-11-03T08:00:00.000Z' });
  assert.equal(summarizeVitals([b, a]).latest?.id, 'b');
});

test('filterByDays keeps valid, recent readings and ignores malformed timestamps', () => {
  const now = new Date('2026-11-11T00:00:00.000Z');
  const recent = reading({ id: 'r', measuredAt: '2026-11-08T00:00:00.000Z' });
  const old = reading({ id: 'o', measuredAt: '2026-09-01T00:00:00.000Z' });
  const invalid = reading({ id: 'invalid', measuredAt: 'not-a-date' });
  assert.deepEqual(filterByDays([recent, old, invalid], 30, now).map((r) => r.id), ['r']);
  assert.deepEqual(filterByDays([recent, old, invalid], null, now).map((r) => r.id), ['r', 'o']);
  assert.deepEqual(sortByMeasuredAt([invalid, old, recent]).map((r) => r.id), ['o', 'r']);
  assert.equal(summarizeVitals([invalid]).latest, null);
});

test('chartGeometry maps values into the padded box with inverted y', () => {
  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const { points, domain } = chartGeometry([0, 5, 10], 120, 110, padding, [0, 10]);
  assert.deepEqual(domain, [0, 10]);
  assert.deepEqual(points[0], { x: 10, y: 100 });
  assert.deepEqual(points[2], { x: 110, y: 10 });
  assert.equal(points[1].x, 60);

  const single = chartGeometry([5], 120, 110, padding);
  assert.equal(single.points.length, 1);
  assert.equal(single.points[0].x, 60);
  assert.deepEqual(computeDomain([5, 5]), [4, 6]);
  assert.deepEqual(computeDomain([]), [0, 1]);
});

test('CSV export quotes cells and neutralises spreadsheet formulas', () => {
  const csv = vitalsToCsv([
    reading({ id: 'c1', type: 'blood_pressure', value: 120, value2: 80, unit: 'mmHg', note: '=HYPERLINK("http://x")' }),
    reading({ id: 'c2', type: 'weight', value: 70, note: 'after, lunch' }),
  ]);
  const lines = csv.split('\n');
  assert.equal(lines[0], 'measured_at,type,value,value2,unit,context,assessment,note');
  assert.ok(lines[1].includes(`"'=HYPERLINK(""http://x"")"`));
  assert.ok(lines[2].endsWith('"after, lunch"'));
});

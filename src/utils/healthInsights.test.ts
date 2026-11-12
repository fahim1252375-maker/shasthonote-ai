import test from 'node:test';
import assert from 'node:assert/strict';
import type { Appointment, Medication, SourceDocument, VitalReading } from '../types';
import { buildHealthInsights, getActiveMedications, getHealthOverviewStats } from './healthInsights';
import { buildHealthInsightsExport } from './healthInsightsExport';

const now = new Date('2026-11-12T08:00:00.000Z');

const vital = (overrides: Partial<VitalReading> = {}): VitalReading => ({
  id: 'v1',
  userId: 'u1',
  type: 'spo2',
  value: 88,
  unit: '%',
  measuredAt: '2026-11-12T07:00:00.000Z',
  createdAt: '2026-11-12T07:00:00.000Z',
  ...overrides,
});

const medication = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  userId: 'u1',
  name: 'Medicine',
  dose: 'as prescribed',
  times: [],
  startDate: '2026-11-01',
  active: true,
  takenLog: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

const appointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  userId: 'u1',
  doctorName: 'Dr. A',
  specialty: 'GP',
  dateTime: '2026-11-13T09:00:00.000Z',
  location: 'Clinic',
  status: 'upcoming',
  createdAt: now.toISOString(),
  ...overrides,
});

const document = (overrides: Partial<SourceDocument> = {}): SourceDocument => ({
  id: 'd1',
  userId: 'u1',
  name: 'Report',
  category: 'lab_report',
  fileType: 'text',
  extractedText: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const build = (overrides: Partial<Parameters<typeof buildHealthInsights>[0]> = {}) =>
  buildHealthInsights({ vitals: [], medications: [], documents: [], appointments: [], now, ...overrides });

test('flags the latest urgent vital and localizes the observation', () => {
  const result = build({ vitals: [vital()] });
  assert.equal(result[0].severity, 'urgent');
  assert.match(result[0].title.en, /Very low/);
  assert.match(result[0].title.bn, /অত্যন্ত কম/);
});

test('uses only the latest past reading for each vital type', () => {
  const result = build({
    vitals: [
      vital({ id: 'normal-new', value: 98 }),
      vital({ id: 'abnormal-old', value: 88, measuredAt: '2026-11-10T07:00:00.000Z' }),
    ],
  });
  assert.equal(result.some((item) => item.id === 'vital-abnormal-old'), false);
  assert.equal(result[0].id, 'no-alerts');
});

test('does not use a future-dated vital as the current reading', () => {
  const result = build({ vitals: [vital({ id: 'future', measuredAt: '2026-11-13T07:00:00.000Z' })] });
  assert.equal(result.some((item) => item.id === 'vital-future'), false);
  assert.equal(result[0].id, 'future-vital-dates');
});

test('skips invalid timestamps and non-finite measurement values', () => {
  const result = build({
    vitals: [
      vital({ id: 'bad-date', measuredAt: 'not-a-date' }),
      vital({ id: 'bad-value', value: Number.NaN }),
    ],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'invalid-vital-data');
  assert.match(result[0].detail.en, /2 reading/);
});

test('reports incomplete blood pressure and unsupported units as invalid data', () => {
  const result = build({
    vitals: [
      vital({ id: 'incomplete-bp', type: 'blood_pressure', value: 150, unit: 'mmHg', value2: undefined }),
      vital({ id: 'unsupported-unit', type: 'blood_glucose', value: 8, unit: 'unknown-unit' }),
    ],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'invalid-vital-data');
  assert.match(result[0].detail.en, /2 reading/);
});

test('does not double-count a future reading with an invalid value', () => {
  const result = build({
    vitals: [vital({ id: 'future-invalid', value: Number.NaN, measuredAt: '2026-11-13T07:00:00.000Z' })],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'invalid-vital-data');
  assert.match(result[0].detail.en, /1 reading/);
});

test('does not show a stale abnormal measurement as a current urgent alert', () => {
  const result = build({ vitals: [vital({ measuredAt: '2026-10-01T07:00:00.000Z' })] });
  assert.equal(result[0].severity, 'info');
  assert.match(result[0].title.en, /Historical/);
  assert.match(result[0].action.en, /older than seven days/);
});

test('active medication count uses the same inclusive date rules as the reminder scheduler', () => {
  const active = medication({ id: 'active', times: ['08:00'] });
  const expired = medication({ id: 'expired', endDate: '2026-11-11' });
  const notStarted = medication({ id: 'future-start', startDate: '2026-11-13' });
  const inactive = medication({ id: 'inactive', active: false });
  const meds = [active, expired, notStarted, inactive];

  assert.deepEqual(getActiveMedications(meds, now).map((item) => item.id), ['active']);
  assert.deepEqual(getHealthOverviewStats({ medications: meds, appointments: [], now }), {
    activeMedicationCount: 1,
    upcomingAppointmentCount: 0,
  });
});

test('flags only currently active medications with no valid reminder times', () => {
  const result = build({
    medications: [
      medication({ id: 'active-no-times' }),
      medication({ id: 'active-bad-times', times: ['25:00', 'bad'] }),
      medication({ id: 'expired-no-times', endDate: '2026-11-11' }),
      medication({ id: 'future-no-times', startDate: '2026-11-13' }),
    ],
  });
  const insight = result.find((item) => item.id === 'medication-times-missing');
  assert.ok(insight);
  assert.match(insight.title.en, /^2 medication/);
});

test('selects only the nearest valid upcoming appointment', () => {
  const result = build({
    appointments: [
      appointment({ id: 'later', dateTime: '2026-11-14T09:00:00.000Z' }),
      appointment({ id: 'soonest', dateTime: '2026-11-12T09:00:00.000Z' }),
      appointment({ id: 'cancelled', status: 'cancelled', dateTime: '2026-11-12T08:30:00.000Z' }),
      appointment({ id: 'invalid', dateTime: 'unknown' }),
    ],
  });
  assert.equal(result[0].id, 'appointment-soonest');
});

test('ignores past appointments and invalid document dates', () => {
  const result = build({
    appointments: [appointment({ dateTime: '2026-11-11T09:00:00.000Z' })],
    documents: [document({ createdAt: 'unknown' })],
  });
  assert.equal(result[0].id, 'no-alerts');
});

test('reports older documents only when their creation date is valid', () => {
  const result = build({ documents: [document(), document({ id: 'bad-date', createdAt: 'invalid' })] });
  assert.equal(result[0].id, 'older-documents');
  assert.match(result[0].detail.en, /1 document/);
});

test('returns a safe empty state when no data exists', () => {
  const result = build();
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'no-alerts');
});

test('sorts observations by severity, without changing their content', () => {
  const result = build({
    vitals: [vital()],
    medications: [medication()],
    appointments: [appointment()],
  });
  assert.deepEqual(result.map((item) => item.severity), ['urgent', 'review', 'info']);
});

test('health overview export is generated locally in the selected language', () => {
  const insights = build({ appointments: [appointment()] });
  const input = {
    insights,
    generatedAt: now,
    counts: {
      vitalReadings: 2,
      medicationRecords: 1,
      activeMedications: 1,
      documents: 3,
      appointments: 1,
      upcomingAppointments: 1,
    },
  };

  const english = buildHealthInsightsExport({ ...input, language: 'en' });
  const bangla = buildHealthInsightsExport({ ...input, language: 'bn' });
  assert.match(english, /Health record overview/);
  assert.match(english, /Suggested next step/);
  assert.match(bangla, /স্বাস্থ্য রেকর্ডের সারাংশ/);
  assert.match(bangla, /পরবর্তী পদক্ষেপ/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Medication, VitalReading } from '../types';
import { buildVisitPack, visitPackToText } from './visitPack';
import { INITIAL_APPOINTMENTS, INITIAL_DOCUMENTS, INITIAL_HEALTH_NOTES } from '../data/mockData';

const now = new Date(2026, 10, 11, 12, 0); // 11 Nov 2026, local time

const medication: Medication = {
  id: 'm1',
  userId: 'u',
  name: 'Metformin',
  dose: '500 mg',
  times: ['08:00', '20:00'],
  startDate: '2026-11-01',
  active: true,
  takenLog: ['2026-11-11@08:00'],
  createdAt: '2026-11-01T00:00:00.000Z',
};

const bp = (id: string, day: number, s: number, d: number): VitalReading => ({
  id,
  userId: 'u',
  type: 'blood_pressure',
  value: s,
  value2: d,
  unit: 'mmHg',
  measuredAt: new Date(2026, 10, day, 8, 0).toISOString(),
  createdAt: new Date(2026, 10, day, 8, 0).toISOString(),
});

const bnNote = INITIAL_HEALTH_NOTES.find((n) => n.id === 'note-bn-01')!;

test('pack includes concern, allergies, medicines, vitals and questions', () => {
  const pack = buildVisitPack({
    language: 'en',
    note: bnNote,
    medications: [medication],
    vitals: [bp('a', 5, 150, 95), bp('b', 9, 142, 92)],
    documents: INITIAL_DOCUMENTS,
    appointments: INITIAL_APPOINTMENTS,
    now,
  });

  const ids = pack.sections.map((s) => s.id);
  for (const expected of ['concern', 'allergies', 'medications', 'vitals', 'questions']) {
    assert.ok(ids.includes(expected), `missing section ${expected}`);
  }

  const medLines = pack.sections.find((s) => s.id === 'medications')!.lines.join('\n');
  assert.match(medLines, /Metformin — 500 mg \(08:00, 20:00\)/);
  assert.match(medLines, /1 of 2/);

  const vitalLine = pack.sections.find((s) => s.id === 'vitals')!.lines[0];
  assert.match(vitalLine, /142\/92 mmHg/);
  assert.match(vitalLine, /Stage 2 Hypertension/);
  assert.match(vitalLine, /2 readings/);

  const allergies = pack.sections.find((s) => s.id === 'allergies')!.lines[0];
  assert.equal(allergies, bnNote.allergies);
});

test('warning signs written in the note are surfaced', () => {
  const pack = buildVisitPack({
    language: 'en',
    note: { ...bnNote, patientDescription: 'Crushing chest pain spreading to my left arm.' },
    medications: [],
    vitals: [],
    documents: [],
    appointments: [],
    now,
  });
  const section = pack.sections.find((s) => s.id === 'red_flags');
  assert.ok(section);
  assert.match(section.lines[0], /Chest pain/);
});

test('empty data still yields an honest, complete pack', () => {
  const pack = buildVisitPack({ language: 'en', note: null, medications: [], vitals: [], documents: [], appointments: [], now });
  assert.deepEqual(pack.sections.map((s) => s.id), ['medications', 'vitals']);
  assert.equal(pack.sections[0].lines[0], 'None recorded.');
  assert.equal(pack.sections[1].lines[0], 'No readings logged.');
  assert.match(pack.disclaimer, /not a diagnosis/);
});

test('missing allergy information is called out instead of left blank', () => {
  const pack = buildVisitPack({
    language: 'en',
    note: { ...bnNote, allergies: '  ' },
    medications: [],
    vitals: [],
    documents: [],
    appointments: [],
    now,
  });
  assert.match(pack.sections.find((s) => s.id === 'allergies')!.lines[0], /Not recorded/);
});

test('inactive, expired and old data is excluded', () => {
  const pack = buildVisitPack({
    language: 'en',
    note: null,
    medications: [{ ...medication, active: false }, { ...medication, id: 'm2', name: 'Expired', endDate: '2026-11-05' }],
    vitals: [{ ...bp('old', 1, 150, 95), measuredAt: new Date(2026, 8, 1).toISOString() }],
    documents: [],
    appointments: [],
    now,
  });
  assert.equal(pack.sections.find((s) => s.id === 'medications')!.lines[0], 'None recorded.');
  assert.equal(pack.sections.find((s) => s.id === 'vitals')!.lines[0], 'No readings logged.');
});

test('Bangla pack uses Bangla headings and plain-text export lists every section', () => {
  const pack = buildVisitPack({ language: 'bn', note: bnNote, medications: [medication], vitals: [], documents: [], appointments: [], now });
  assert.equal(pack.title, 'ডাক্তার ভিজিট প্যাক');
  const text = visitPackToText(pack);
  assert.ok(text.includes('যা নিয়ে আলোচনা করতে চাই'));
  assert.ok(text.includes('অ্যালার্জি'));
  for (const section of pack.sections) assert.ok(text.includes(section.heading));
});

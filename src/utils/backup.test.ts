import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignOwner,
  BACKUP_APP,
  BACKUP_SCHEMA_VERSION,
  buildBackupBundle,
  EMPTY_BACKUP_DATA,
  parseBackupBundle,
  type BackupData,
} from './backup';
import { INITIAL_APPOINTMENTS, INITIAL_DOCUMENTS, INITIAL_HEALTH_NOTES } from '../data/mockData';

const sample = (): BackupData => ({
  ...EMPTY_BACKUP_DATA,
  notes: INITIAL_HEALTH_NOTES,
  documents: INITIAL_DOCUMENTS,
  appointments: INITIAL_APPOINTMENTS,
  vitals: [
    {
      id: 'vital-1',
      userId: 'guest',
      type: 'blood_pressure',
      value: 120,
      value2: 80,
      unit: 'mmHg',
      measuredAt: '2026-11-10T08:00:00.000Z',
      createdAt: '2026-11-10T08:00:00.000Z',
    },
  ],
  medications: [
    {
      id: 'med-1',
      userId: 'guest',
      name: 'Metformin',
      dose: '500 mg',
      times: ['08:00', '20:00'],
      startDate: '2026-11-01',
      active: true,
      takenLog: ['2026-11-10@08:00'],
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ],
});

test('bundle metadata and counts', () => {
  const bundle = buildBackupBundle(sample(), new Date('2026-11-11T10:00:00.000Z'));
  assert.equal(bundle.app, BACKUP_APP);
  assert.equal(bundle.schemaVersion, BACKUP_SCHEMA_VERSION);
  assert.equal(bundle.exportedAt, '2026-11-11T10:00:00.000Z');
  assert.equal(bundle.counts.notes, INITIAL_HEALTH_NOTES.length);
  assert.equal(bundle.counts.vitals, 1);
  assert.equal(bundle.counts.studyResources, 0);
});

test('export → import round trip preserves every valid record', () => {
  const original = sample();
  const result = parseBackupBundle(JSON.stringify(buildBackupBundle(original)));
  assert.ok(result.ok);
  assert.equal(result.skipped, 0);
  assert.deepEqual(result.data.notes.map((n) => n.id), original.notes.map((n) => n.id));
  assert.deepEqual(result.data.documents.length, original.documents.length);
  assert.deepEqual(result.data.medications[0].takenLog, ['2026-11-10@08:00']);
  assert.equal(result.data.vitals[0].value2, 80);
});

test('rejects files that are not valid backups', () => {
  assert.equal(parseBackupBundle('').ok, false);
  assert.equal(parseBackupBundle('not json').ok, false);
  assert.equal(parseBackupBundle('[]').ok, false);
  assert.equal(parseBackupBundle(JSON.stringify({ app: 'Other', schemaVersion: 1, data: {} })).ok, false);
  assert.equal(parseBackupBundle(JSON.stringify({ app: BACKUP_APP, schemaVersion: 99, data: {} })).ok, false);
  assert.equal(parseBackupBundle(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1 })).ok, false);
  assert.equal(parseBackupBundle(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1, data: { notes: 'x' } })).ok, false);
});

test('invalid, duplicate and badly-identified records are skipped and counted', () => {
  const good = sample().vitals[0];
  const bundle = {
    app: BACKUP_APP,
    schemaVersion: 1,
    data: {
      vitals: [
        good,
        good, // duplicate id
        { ...good, id: 'bad id with spaces' },
        { ...good, id: 'v-nan', value: 'abc' },
        { ...good, id: 'v-type', type: 'mood' },
        null,
        'string',
      ],
    },
  };
  const result = parseBackupBundle(JSON.stringify(bundle));
  assert.ok(result.ok);
  assert.equal(result.data.vitals.length, 1);
  assert.equal(result.skipped, 6);
});

test('unknown fields are stripped so Firestore allowlist rules will accept the records', () => {
  const note = { ...INITIAL_HEALTH_NOTES[0], isAdmin: true, __proto__x: 'nope', extra: { nested: 1 } };
  const result = parseBackupBundle(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1, data: { notes: [note] } }));
  assert.ok(result.ok);
  const imported = result.data.notes[0] as unknown as Record<string, unknown>;
  assert.equal('isAdmin' in imported, false);
  assert.equal('extra' in imported, false);
  assert.equal(imported.title, INITIAL_HEALTH_NOTES[0].title);
});

test('assignOwner overwrites any userId found in the file', () => {
  const tampered = sample();
  tampered.notes = tampered.notes.map((note) => ({ ...note, userId: 'someone-else' }));
  const owned = assignOwner(tampered, 'real-uid');
  assert.ok(owned.notes.every((n) => n.userId === 'real-uid'));
  assert.ok(owned.vitals.every((v) => v.userId === 'real-uid'));
  assert.ok(owned.medications.every((m) => m.userId === 'real-uid'));
  assert.equal(tampered.notes[0].userId, 'someone-else', 'input is not mutated');
});

test('restore rejects oversized optional fields and malformed nested findings', () => {
  const valid = INITIAL_DOCUMENTS[0];
  const result = parseBackupBundle(JSON.stringify({
    app: BACKUP_APP,
    schemaVersion: 1,
    data: {
      documents: [
        valid,
        { ...valid, id: 'bad-finding', findings: [{ testOrItem: 'CBC', value: '4', status: 'Normal' }, { testOrItem: 'unsafe', value: 'x', status: 'Normal', injected: true }] },
        { ...valid, id: 'bad-summary', analysisSummary: 'x'.repeat(50_001) },
      ],
    },
  }));
  assert.ok(result.ok);
  assert.equal(result.data.documents.length, 1);
  assert.equal(result.skipped, 2);
});

test('restore validates medication time strings and optional value types', () => {
  const medication = sample().medications[0];
  const result = parseBackupBundle(JSON.stringify({
    app: BACKUP_APP,
    schemaVersion: 1,
    data: {
      medications: [
        medication,
        { ...medication, id: 'invalid-time', times: ['8pm'] },
        { ...medication, id: 'invalid-note', notes: { unsafe: true } },
      ],
    },
  }));
  assert.ok(result.ok);
  assert.equal(result.data.medications.length, 1);
  assert.equal(result.skipped, 2);
});


test('restore preserves appointment checklist progress indexes', () => {
  const appointment = { ...INITIAL_APPOINTMENTS[0], checklist: ['Bring reports', 'List current medicines'], checklistDone: [0] };
  const result = parseBackupBundle(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1, data: { appointments: [appointment] } }));
  assert.ok(result.ok);
  assert.deepEqual(result.data.appointments[0].checklistDone, [0]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Medication } from '../types';
import {
  addDays,
  adherenceSummary,
  dosesDueNow,
  dosesForDate,
  isMedicationActiveOn,
  isValidDateKey,
  isValidTime,
  localDateKey,
  MAX_TAKEN_LOG_ENTRIES,
  missedDosesToday,
  nextDose,
  normalizeTimes,
  setDoseTaken,
} from './medications';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  userId: 'u1',
  name: 'Metformin',
  dose: '500 mg',
  times: ['20:00', '08:00'],
  startDate: '2026-11-01',
  active: true,
  takenLog: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

// Local-time constructor so tests do not depend on the machine's timezone.
const at = (y: number, m: number, d: number, hh: number, mm: number) => new Date(y, m - 1, d, hh, mm);

test('time and date validation', () => {
  assert.equal(isValidTime('08:00'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('8:00'), false);
  assert.equal(isValidDateKey('2026-02-29'), false);
  assert.equal(isValidDateKey('2026-02-28'), true);
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(localDateKey(at(2026, 11, 11, 23, 59)), '2026-11-11');
});

test('normalizeTimes sorts, de-duplicates and drops invalid entries', () => {
  assert.deepEqual(normalizeTimes(['20:00', '08:00', '08:00', 'nope', '25:00']), ['08:00', '20:00']);
  assert.deepEqual(normalizeTimes(undefined), []);
});

test('medication activity respects active flag and date range', () => {
  const m = med({ endDate: '2026-11-10' });
  assert.equal(isMedicationActiveOn(m, '2026-10-31'), false);
  assert.equal(isMedicationActiveOn(m, '2026-11-01'), true);
  assert.equal(isMedicationActiveOn(m, '2026-11-10'), true);
  assert.equal(isMedicationActiveOn(m, '2026-11-11'), false);
  assert.equal(isMedicationActiveOn(med({ active: false }), '2026-11-05'), false);
  assert.equal(isMedicationActiveOn(med({ startDate: 'invalid' }), '2026-11-05'), false);
  assert.equal(isMedicationActiveOn(med({ endDate: '2026-02-30' }), '2026-11-05'), false);
  assert.equal(isMedicationActiveOn(med(), 'not-a-date'), false);
});

test('dosesForDate lists sorted doses with taken flags', () => {
  const doses = dosesForDate([med({ takenLog: ['2026-11-11@08:00'] })], '2026-11-11');
  assert.deepEqual(doses.map((d) => [d.time, d.taken]), [['08:00', true], ['20:00', false]]);
  assert.equal(doses[0].key, '2026-11-11@08:00');
});

test('setDoseTaken is immutable and toggles the log; old entries are pruned', () => {
  const original = med();
  const marked = setDoseTaken(original, '2026-11-11@08:00', true);
  assert.deepEqual(original.takenLog, []);
  assert.deepEqual(marked.takenLog, ['2026-11-11@08:00']);
  assert.deepEqual(setDoseTaken(marked, '2026-11-11@08:00', false).takenLog, []);

  const crowded = med({
    takenLog: Array.from({ length: MAX_TAKEN_LOG_ENTRIES }, (_, i) => `2025-01-01@${String(i).padStart(4, '0')}`),
  });
  const pruned = setDoseTaken(crowded, '2026-11-11@08:00', true);
  assert.equal(pruned.takenLog.length, MAX_TAKEN_LOG_ENTRIES);
  assert.ok(pruned.takenLog.includes('2026-11-11@08:00'));
  assert.ok(!pruned.takenLog.includes('2025-01-01@0000'));
});

test('adherence ignores doses that are not yet due today', () => {
  const now = at(2026, 11, 11, 12, 0);
  const m = med({ startDate: '2026-11-10', takenLog: ['2026-11-10@08:00', '2026-11-10@20:00', '2026-11-11@08:00'] });
  const summary = adherenceSummary([m], now, 7);
  // Nov 10: 2 scheduled/2 taken; Nov 11: only 08:00 is due so far (20:00 is later).
  assert.deepEqual(summary, { scheduled: 3, taken: 3, percent: 100 });

  const missed = adherenceSummary([med({ startDate: '2026-11-10', takenLog: ['2026-11-10@08:00'] })], now, 7);
  assert.equal(missed.scheduled, 3);
  assert.equal(missed.taken, 1);
  assert.equal(missed.percent, 33);

  assert.equal(adherenceSummary([], now, 7).percent, null);
});

test('nextDose returns the next untaken dose later today', () => {
  const m = med({ takenLog: ['2026-11-11@08:00'] });
  assert.equal(nextDose([m], at(2026, 11, 11, 7, 0))?.time, '20:00');
  assert.equal(nextDose([med()], at(2026, 11, 11, 7, 0))?.time, '08:00');
  assert.equal(nextDose([m], at(2026, 11, 11, 21, 0)), null);
});

test('dosesDueNow only returns untaken doses inside the window', () => {
  const m = med();
  assert.deepEqual(dosesDueNow([m], at(2026, 11, 11, 8, 0)).map((d) => d.time), ['08:00']);
  assert.deepEqual(dosesDueNow([m], at(2026, 11, 11, 8, 9)).map((d) => d.time), ['08:00']);
  assert.deepEqual(dosesDueNow([m], at(2026, 11, 11, 8, 30)), []);
  assert.deepEqual(dosesDueNow([m], at(2026, 11, 11, 7, 59)), []);
  assert.deepEqual(dosesDueNow([med({ takenLog: ['2026-11-11@08:00'] })], at(2026, 11, 11, 8, 1)), []);
});

test('missedDosesToday uses a grace period', () => {
  const m = med();
  assert.deepEqual(missedDosesToday([m], at(2026, 11, 11, 9, 0)).map((d) => d.time), []);
  assert.deepEqual(missedDosesToday([m], at(2026, 11, 11, 9, 30)).map((d) => d.time), ['08:00']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { searchAll, tokenize, type SearchableData } from './search';
import { INITIAL_APPOINTMENTS, INITIAL_DOCUMENTS, INITIAL_HEALTH_NOTES } from '../data/mockData';

const data: SearchableData = {
  notes: INITIAL_HEALTH_NOTES,
  documents: INITIAL_DOCUMENTS,
  appointments: INITIAL_APPOINTMENTS,
  studyResources: [
    {
      id: 'study-1',
      userId: 'u',
      title: 'Hypertension flashcards',
      type: 'flashcards',
      topic: 'Blood pressure care',
      contentJson: '[]',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ],
  medications: [
    {
      id: 'med-1',
      userId: 'u',
      name: 'Metformin',
      dose: '500 mg',
      times: ['08:00'],
      startDate: '2026-11-01',
      active: true,
      takenLog: [],
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ],
};

test('tokenize keeps Bangla words intact (combining marks) and drops punctuation', () => {
  assert.deepEqual(tokenize('বুকে ব্যথা!'), ['বুকে', 'ব্যথা']);
  assert.deepEqual(tokenize('  HbA1c, Metformin  '), ['hba1c', 'metformin']);
  assert.deepEqual(tokenize('   '), []);
  assert.equal(tokenize('a b c d e f g h i j k').length, 8);
});

test('empty or punctuation-only queries return nothing', () => {
  assert.deepEqual(searchAll('', data), []);
  assert.deepEqual(searchAll('???', data), []);
});

test('finds medications, study sets and notes by English words', () => {
  const metformin = searchAll('metformin', data);
  assert.ok(metformin.some((hit) => hit.kind === 'medication' && hit.id === 'med-1'));
  assert.ok(metformin.some((hit) => hit.kind === 'note'), 'sample diabetes note mentions metformin');

  const study = searchAll('hypertension', data);
  assert.equal(study[0].kind, 'study');
  assert.equal(study[0].id, 'study-1');
});

test('finds Bangla text in notes', () => {
  const hits = searchAll('কাশি', data);
  assert.ok(hits.some((hit) => hit.id === 'note-bn-01'));
  assert.ok(hits[0].snippet.length > 0);
});

test('multiple words use AND semantics; unmatched words exclude the record', () => {
  assert.ok(searchAll('metformin 500', data).some((hit) => hit.kind === 'medication'));
  assert.deepEqual(searchAll('metformin zzzznotthere', data), []);
});

test('title matches outrank body matches and the limit is respected', () => {
  const hits = searchAll('metformin', data, 1);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, 'medication', 'title match ("Metformin") should rank first');
});

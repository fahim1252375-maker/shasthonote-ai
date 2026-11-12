import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecordChunks, documentToText, MAX_RECORD_CHUNKS, noteToText, RECORD_CHUNK_SIZE, splitIntoChunks } from './recordChunks';
import { INITIAL_DOCUMENTS, INITIAL_HEALTH_NOTES } from '../data/mockData';

test('noteToText labels non-empty fields and skips empty ones', () => {
  const text = noteToText({ ...INITIAL_HEALTH_NOTES[1], allergies: '  ', symptoms: undefined });
  assert.match(text, /^Title: /);
  assert.match(text, /Chief complaint: /);
  assert.doesNotMatch(text, /Allergies:/);
  assert.doesNotMatch(text, /Symptoms:/);
});

test('documentToText includes findings with reference ranges', () => {
  const text = documentToText({
    ...INITIAL_DOCUMENTS[0],
    analysisSummary: 'Summary here',
    extractedText: 'RAW',
    findings: [{ testOrItem: 'HbA1c', value: '7.4 %', referenceRange: '< 5.7', status: 'Flagged' }],
  });
  assert.match(text, /Summary: Summary here/);
  assert.match(text, /HbA1c: 7\.4 % \(reference < 5\.7\) \[Flagged\]/);
  assert.match(text, /RAW$/);
});

test('splitIntoChunks keeps short text whole and splits long text under the size limit', () => {
  assert.deepEqual(splitIntoChunks('short'), ['short']);
  assert.deepEqual(splitIntoChunks('   '), []);
  const long = Array.from({ length: 400 }, (_, i) => `Line ${i} with some health text.`).join('\n');
  const chunks = splitIntoChunks(long, 1_000);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 1_000));
  assert.equal(chunks.join('\n').replace(/\s+/g, ' ').length, long.replace(/\s+/g, ' ').length);
});

test('buildRecordChunks numbers pages per source and respects the server limit', () => {
  const small = buildRecordChunks([INITIAL_HEALTH_NOTES[0]], []);
  assert.equal(small.truncated, false);
  assert.equal(small.chunks[0].page, 1);
  assert.equal(small.chunks[0].id, INITIAL_HEALTH_NOTES[0].id);

  const huge = { ...INITIAL_DOCUMENTS[0], id: 'huge', extractedText: 'x'.repeat(RECORD_CHUNK_SIZE * 20) };
  const capped = buildRecordChunks([], [huge]);
  assert.equal(capped.chunks.length, MAX_RECORD_CHUNKS);
  assert.equal(capped.truncated, true);
  assert.deepEqual(capped.chunks.map((c) => c.page), Array.from({ length: MAX_RECORD_CHUNKS }, (_, i) => i + 1));
});

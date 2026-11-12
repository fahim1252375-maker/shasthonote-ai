import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMindMap } from './mindMap';

const valid = { centralTopic: 'Asthma', branches: [{ title: 'Triggers', subtopics: ['Dust', 'Smoke'] }] };

test('accepts a valid object or its JSON string', () => {
  assert.deepEqual(parseMindMap(valid), valid);
  assert.deepEqual(parseMindMap(JSON.stringify(valid)), valid);
});

test('rejects malformed input without throwing', () => {
  for (const bad of [null, undefined, 42, 'not json', '{}', '[]', { centralTopic: '', branches: [] }, { centralTopic: 'X', branches: [] }, { centralTopic: 'X', branches: 'no' }]) {
    assert.equal(parseMindMap(bad), null);
  }
});

test('drops invalid branches but keeps valid ones, and caps sizes', () => {
  const result = parseMindMap({
    centralTopic: '  Topic  ',
    branches: [
      { title: 'ok', subtopics: ['a'] },
      { title: 5, subtopics: [] },
      { title: 'bad subtopics', subtopics: [1, 2] },
      null,
      ...Array.from({ length: 20 }, (_, i) => ({ title: `b${i}`, subtopics: Array.from({ length: 20 }, () => 'x') })),
    ],
  });
  assert.ok(result);
  assert.equal(result.centralTopic, 'Topic');
  assert.equal(result.branches.length, 12);
  assert.equal(result.branches[0].title, 'ok');
  assert.ok(result.branches.every((b) => b.subtopics.length <= 12));
});

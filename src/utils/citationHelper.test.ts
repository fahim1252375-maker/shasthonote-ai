import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocumentText, verifyCitation, findMatchingChunks } from './citationHelper';

test('chunkDocumentText breaks large document text into indexed passages', () => {
  const sampleDoc = `Page 1
Clinical Study on Type 2 Diabetes Management in South Asian populations.
Insulin resistance and lifestyle interventions show significant HbA1c reductions.

Page 2
Dietary fiber intake exceeding 30g daily improves glycemic control and lipid profiles.
Patients should consult their physician before modifying medication regimens.`;

  const chunks = chunkDocumentText('doc-01', 'Diabetes Study', sampleDoc, 200, 40);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].documentId, 'doc-01');
  assert.equal(chunks[0].documentTitle, 'Diabetes Study');
});

test('verifyCitation accurately confirms or rejects passage citations', () => {
  const source = 'Patient presented with intermittent chest tightness radiating to left arm for 3 days.';
  assert.equal(verifyCitation('chest tightness radiating to left arm', source), true);
  assert.equal(verifyCitation('severe abdominal pain and fever', source), false);
});

test('findMatchingChunks ranks passages based on query keywords', () => {
  const chunks = [
    {
      chunkId: 'c1',
      documentId: 'd1',
      documentTitle: 'Cardio Guide',
      text: 'Hypertension symptoms often include morning headaches, fatigue, and blurred vision.',
    },
    {
      chunkId: 'c2',
      documentId: 'd2',
      documentTitle: 'Orthopedic Guide',
      text: 'Knee osteoarthritis rehabilitation requires low-impact quadriceps strengthening.',
    },
  ];

  const results = findMatchingChunks('hypertension headaches vision', chunks);
  assert.ok(results.length > 0);
  assert.equal(results[0].chunkId, 'c1');
  assert.equal(results[0].documentTitle, 'Cardio Guide');
});

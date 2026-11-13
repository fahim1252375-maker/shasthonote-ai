import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, afterEach, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-shasthonote';
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

const validFinding = (index) => ({
  testOrItem: `Test ${index}`,
  value: String(10 + index),
  referenceRange: '5-20',
  status: 'normal',
});

const validDocument = (userId, findings = [validFinding(0), validFinding(1)]) => ({
  id: 'document-1',
  userId,
  name: 'Synthetic lab report',
  category: 'lab_report',
  fileType: 'text',
  extractedText: 'Synthetic test content only.',
  createdAt: new Date().toISOString(),
  findings,
});

test('owner can create a document with valid findings', async () => {
  const db = testEnv.authenticatedContext('owner-1').firestore();
  await assertSucceeds(setDoc(doc(db, 'documents', 'document-1'), validDocument('owner-1')));
});

test('owner can create a document with ten valid findings', async () => {
  const db = testEnv.authenticatedContext('owner-1').firestore();
  const findings = Array.from({ length: 10 }, (_, index) => validFinding(index));
  await assertSucceeds(setDoc(doc(db, 'documents', 'document-1'), validDocument('owner-1', findings)));
});

test('rules validate every finding, including the tenth element', async () => {
  const db = testEnv.authenticatedContext('owner-1').firestore();
  const findings = Array.from({ length: 10 }, (_, index) => validFinding(index));
  findings[9] = { ...validFinding(9), unexpectedField: 'must be rejected' };
  await assertFails(setDoc(doc(db, 'documents', 'document-1'), validDocument('owner-1', findings)));
});

test('rules reject more than ten findings', async () => {
  const db = testEnv.authenticatedContext('owner-1').firestore();
  const findings = Array.from({ length: 11 }, (_, index) => validFinding(index));
  await assertFails(setDoc(doc(db, 'documents', 'document-1'), validDocument('owner-1', findings)));
});

test('another authenticated user cannot read a document owned by someone else', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'documents', 'document-1'), validDocument('owner-1'));
  });
  const otherUserDb = testEnv.authenticatedContext('intruder-1').firestore();
  await assertFails(getDoc(doc(otherUserDb, 'documents', 'document-1')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectRedFlags, highestRedFlagSeverity } from './redFlags';
import { INITIAL_HEALTH_NOTES } from '../data/mockData';

const ids = (text: string) => detectRedFlags(text).map((match) => match.id);

test('plain chest pain is urgent, crushing pain radiating to the arm is an emergency', () => {
  const mild = detectRedFlags('I have had mild chest pain since yesterday.');
  assert.equal(mild.length, 1);
  assert.equal(mild[0].id, 'chest_pain');
  assert.equal(mild[0].severity, 'urgent');

  const severe = detectRedFlags('Crushing chest pain spreading to my left arm and jaw.');
  assert.equal(severe[0].id, 'chest_pain');
  assert.equal(severe[0].severity, 'emergency');
  assert.equal(highestRedFlagSeverity(severe), 'emergency');
});

test('negated symptoms in English do not trigger warnings', () => {
  assert.deepEqual(ids('No chest pain, no shortness of breath.'), []);
  assert.deepEqual(ids('Patient denies chest pain.'), []);
  assert.deepEqual(ids('Without any difficulty breathing.'), []);
});

test('negation is scoped to its own clause', () => {
  // "no fever" must not cancel the chest pain that follows after "and".
  assert.ok(ids('No fever and chest pain since morning').includes('chest_pain'));
  // "no X or Y" negates both.
  assert.deepEqual(ids('no chest pain or shortness of breath'), []);
});

test('Bangla chest and breathing phrases are detected, negated Bangla is not', () => {
  assert.ok(ids('বুকে ব্যথা হচ্ছে').includes('chest_pain'));
  assert.ok(ids('আমার শ্বাসকষ্ট হচ্ছে').includes('breathing'));
  assert.deepEqual(ids('বুকে ব্যথা নেই'), []);
  assert.deepEqual(ids('কোনো বুকে তীব্র ব্যথা বা বাম হাতে ছড়ায়নি'), []);
});

test('chest pain in Bangla escalates with severe wording nearby', () => {
  const result = detectRedFlags('বুকে তীব্র ব্যথা এবং ঘাম হচ্ছে');
  assert.equal(result.find((m) => m.id === 'chest_pain')?.severity, 'emergency');
});

test('stroke, bleeding, seizure, allergy, overdose and self-harm are emergencies', () => {
  for (const [text, id] of [
    ['Her face is drooping and she has slurred speech', 'stroke'],
    ['He is vomiting blood', 'severe_bleeding'],
    ['She had a seizure this morning', 'seizure_unconscious'],
    ['My throat is swelling after the injection', 'allergic_reaction'],
    ['I think he took an overdose', 'poisoning_overdose'],
    ['I want to die', 'self_harm'],
    ['রক্ত বমি করছে', 'severe_bleeding'],
    ['কথা জড়িয়ে যাচ্ছে', 'stroke'],
    ['আত্মহত্যার চিন্তা আসছে', 'self_harm'],
  ] as const) {
    const found = detectRedFlags(text).find((match) => match.id === id);
    assert.ok(found, `expected ${id} for: ${text}`);
    assert.equal(found.severity, 'emergency', text);
  }
});

test('self-harm advice is supportive and still points to emergency services', () => {
  const match = detectRedFlags('I have suicidal thoughts')[0];
  assert.equal(match.id, 'self_harm');
  assert.match(match.adviceEn, /999/);
  assert.match(match.adviceBn, /৯৯৯/);
});

test('stiff neck becomes an emergency only together with fever', () => {
  assert.equal(detectRedFlags('stiff neck for two days')[0].severity, 'urgent');
  assert.equal(detectRedFlags('stiff neck and high fever')[0].severity, 'emergency');
});

test('results are sorted emergencies first, one match per rule', () => {
  const result = detectRedFlags('fainted today, also heavy bleeding, bleeding that will not stop');
  assert.equal(result[0].severity, 'emergency');
  assert.equal(result.filter((m) => m.id === 'severe_bleeding').length, 1);
  assert.equal(result[result.length - 1].id, 'fainting');
});

test('harmless text, short text and non-strings produce no warnings', () => {
  assert.deepEqual(detectRedFlags('Mild seasonal allergies, I feel fine.'), []);
  assert.deepEqual(detectRedFlags(''), []);
  assert.deepEqual(detectRedFlags('ok'), []);
  assert.deepEqual(detectRedFlags(undefined as unknown as string), []);
});

test('the bundled Bangla sample note is flagged urgent but not as an emergency', () => {
  const note = INITIAL_HEALTH_NOTES.find((item) => item.id === 'note-bn-01');
  assert.ok(note);
  const text = [note.chiefComplaint, note.patientDescription, note.symptoms].join('\n');
  const result = detectRedFlags(text);
  assert.ok(result.length > 0, 'chest pressure / breathlessness should be surfaced');
  assert.equal(highestRedFlagSeverity(result), 'urgent');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBmi, evaluateBloodPressure, detectMissingClinicalInfo } from './healthCalculators';

test('BMI calculation handles standard values correctly', () => {
  const normal = calculateBmi(70, 175);
  assert.ok(normal !== null);
  assert.equal(normal.bmi, 22.9);
  assert.equal(normal.category, 'Normal');

  const overweight = calculateBmi(85, 175);
  assert.ok(overweight !== null);
  assert.equal(overweight.category, 'Overweight');

  const invalid = calculateBmi(-10, 170);
  assert.equal(invalid, null);
});

test('Blood pressure classification follows AHA guidelines', () => {
  const normal = evaluateBloodPressure(118, 76);
  assert.equal(normal.category, 'Normal');
  assert.equal(normal.isUrgent, false);

  const stage1 = evaluateBloodPressure(134, 82);
  assert.equal(stage1.category, 'Stage 1 Hypertension');

  const stage2 = evaluateBloodPressure(145, 92);
  assert.equal(stage2.category, 'Stage 2 Hypertension');

  const crisis = evaluateBloodPressure(190, 125);
  assert.equal(crisis.category, 'Hypertensive Crisis');
  assert.equal(crisis.isUrgent, true);
});

test('detectMissingClinicalInfo flags unrecorded fields', () => {
  const incompleteNote = {
    onsetDate: '',
    duration: '',
    allergies: '',
    existingMedications: 'Metformin 500mg',
    questionsForDoctor: '',
  };

  const missing = detectMissingClinicalInfo(incompleteNote);
  assert.equal(missing.length, 4);
  const fields = missing.map((m) => m.field);
  assert.ok(fields.includes('onsetDate'));
  assert.ok(fields.includes('duration'));
  assert.ok(fields.includes('allergies'));
  assert.ok(fields.includes('questionsForDoctor'));
  assert.ok(!fields.includes('existingMedications'));
});

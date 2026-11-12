/**
 * Pure clinical and health calculation utilities for ShasthoNote AI
 */

export interface BmiResult {
  bmi: number;
  category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  categoryBn: string;
}

export interface BloodPressureResult {
  category: 'Normal' | 'Elevated' | 'Stage 1 Hypertension' | 'Stage 2 Hypertension' | 'Hypertensive Crisis';
  categoryBn: string;
  isUrgent: boolean;
}

export interface MissingInfoCheck {
  field: string;
  fieldBn: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  messageBn: string;
}

/**
 * Calculates Body Mass Index
 * @param weightKg Weight in kilograms
 * @param heightCm Height in centimeters
 */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let category: BmiResult['category'] = 'Normal';
  let categoryBn = 'স্বাভাবিক ওজন';

  if (bmi < 18.5) {
    category = 'Underweight';
    categoryBn = 'কম ওজন';
  } else if (bmi < 25) {
    category = 'Normal';
    categoryBn = 'স্বাভাবিক ওজন';
  } else if (bmi < 30) {
    category = 'Overweight';
    categoryBn = 'অতিরিক্ত ওজন';
  } else {
    category = 'Obese';
    categoryBn = 'স্থূলতা';
  }

  return { bmi, category, categoryBn };
}

/**
 * Evaluates Blood Pressure reading based on AHA/ACC Guidelines
 * @param systolic Systolic mmHg
 * @param diastolic Diastolic mmHg
 */
export function evaluateBloodPressure(systolic: number, diastolic: number): BloodPressureResult {
  if (systolic > 180 || diastolic > 120) {
    return {
      category: 'Hypertensive Crisis',
      categoryBn: 'জরুরি উচ্চ রক্তচাপ সংকট (তাৎক্ষণিক ডাক্তার দেখান)',
      isUrgent: true,
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: 'Stage 2 Hypertension',
      categoryBn: 'স্টেজ ২ উচ্চ রক্তচাপ',
      isUrgent: false,
    };
  }
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return {
      category: 'Stage 1 Hypertension',
      categoryBn: 'স্টেজ ১ উচ্চ রক্তচাপ',
      isUrgent: false,
    };
  }
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return {
      category: 'Elevated',
      categoryBn: 'উচ্চ রক্তচাপের পূর্বাভাস (এলিভেটেড)',
      isUrgent: false,
    };
  }
  return {
    category: 'Normal',
    categoryBn: 'স্বাভাবিক রক্তচাপ',
    isUrgent: false,
  };
}

/**
 * Analyzes health notes for critical missing clinical information before a doctor visit
 */
export function detectMissingClinicalInfo(note: {
  onsetDate?: string;
  duration?: string;
  allergies?: string;
  existingMedications?: string;
  questionsForDoctor?: string;
}): MissingInfoCheck[] {
  const missing: MissingInfoCheck[] = [];

  if (!note.onsetDate || note.onsetDate.trim() === '' || note.onsetDate.toLowerCase() === 'not provided') {
    missing.push({
      field: 'onsetDate',
      fieldBn: 'লক্ষণ শুরুর সময়',
      severity: 'high',
      message: 'When did your primary symptom or concern start?',
      messageBn: 'আপনার মূল সমস্যা বা লক্ষণটি কবে শুরু হয়েছিল?',
    });
  }

  if (!note.duration || note.duration.trim() === '' || note.duration.toLowerCase() === 'not provided') {
    missing.push({
      field: 'duration',
      fieldBn: 'সমস্যার স্থায়িত্ব',
      severity: 'medium',
      message: 'How long does the discomfort or episode last (e.g., constant, 2 hours)?',
      messageBn: 'সমস্যাটি কতক্ষণ স্থায়ী থাকে (যেমন: ক্রমাগত, ২ ঘণ্টা)?',
    });
  }

  if (!note.allergies || note.allergies.trim() === '') {
    missing.push({
      field: 'allergies',
      fieldBn: 'এলার্জি সম্পর্কিত তথ্য',
      severity: 'high',
      message: 'Do you have known allergies to medications, food, or latex? (Write "None" if none)',
      messageBn: 'ওষুধ, খাবার বা অন্য কিছুতে অ্যালার্জি আছে কি? (না থাকলে "নেই" লিখুন)',
    });
  }

  if (!note.existingMedications || note.existingMedications.trim() === '') {
    missing.push({
      field: 'existingMedications',
      fieldBn: 'বর্তমান ঔষধসমূহ',
      severity: 'high',
      message: 'Are you currently taking any prescription, herbal, or OTC medications?',
      messageBn: 'আপনি কি বর্তমানে কোনো প্রেসক্রিপশন বা সাধারণ ওষুধ খাচ্ছেন?',
    });
  }

  if (!note.questionsForDoctor || note.questionsForDoctor.trim() === '') {
    missing.push({
      field: 'questionsForDoctor',
      fieldBn: 'ডাক্তারকে জিজ্ঞেস করার প্রশ্ন',
      severity: 'low',
      message: 'Prepare at least 1 or 2 specific questions for your doctor.',
      messageBn: 'ডাক্তারকে জিজ্ঞেস করার জন্য অন্তত ১-২টি প্রশ্ন লিখে রাখুন।',
    });
  }

  return missing;
}

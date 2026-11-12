import { HealthNote, SourceDocument, Appointment, StudyResource } from '../types';

export const INITIAL_HEALTH_NOTES: HealthNote[] = [
  {
    id: 'note-bn-01',
    userId: 'guest-patient-shastho-01',
    title: 'বুকের মৃদু অস্বস্তি ও রাতে কাশি (Chest Discomfort & Cough)',
    language: 'mixed',
    chiefComplaint: 'গত ৩ দিন ধরে বুকের মাঝখানে হালকা চাপ এবং রাতে শুকনো কাশি',
    patientDescription: 'আমি ৩ দিন আগে লক্ষ্য করেছি যে রাতে শুলে বুকে সামান্য ভার অনুভব হয়। সাথে শুকনো কাশি হয় যার কারণে ঘুমাতে কষ্ট হয়। হাঁটার সময় একটু হাঁপিয়ে যাই। কোনো বুকে তীব্র ব্যথা বা বাম হাতে ছড়ায়নি। গ্যাস্ট্রিকের অ্যান্টাসিড খেয়েছিলাম কিন্তু কাশি কমেনি।',
    onsetDate: '৩ দিন আগে (নভেম্বর ৫, ২০২৬)',
    duration: 'রাতে শুলে প্রায় ১-২ ঘণ্টা স্থায়ী হয়',
    symptoms: 'শুকনো কাশি, শ্বাস নিতে সামান্য কষ্ট, বুকে মৃদু চাপ',
    reportedMedicalHistory: 'মৃদু উচ্চ রক্তচাপ (২ বছর ধরে)',
    existingMedications: 'Amlodipine 5mg (সকালে ১টি)',
    allergies: 'পেনিসিলিন অ্যালার্জি (ত্বকে লাল ফুসকুড়ি ওঠে)',
    questionsForDoctor: '১. এই কাশি কি প্রেসারের ওষুধের কারণে হতে পারে?\n২. কোনো বুকের এক্স-রে বা ইসিজি করার প্রয়োজন আছে কি?\n৩. রাতে ঘুমানোর সময় কি ধরণের বালিশ ব্যবহার করা ভালো?',
    patientSummary: 'আপনি গত ৩ দিন ধরে রাতে শুলে বুকে মৃদু ভার এবং শুকনো কাশির সমস্যা অনুভব করছেন। আপনার উচ্চ রক্তচাপের ইতিহাস আছে এবং আপনি অ্যামলোডিপিন খান। আপনার পেনিসিলিনে অ্যালার্জি রয়েছে। আপনি তীব্র ব্যথা বা বাম বাহুতে ছড়ানোর কোনো লক্ষণ অনুভব করেননি।',
    doctorBrief: 'CHIEF COMPLAINT: Chest heaviness and nocturnal dry cough x 3 days.\nHPI: 54yo patient reports mild substernal heaviness and persistent non-productive nocturnal cough, worse when supine. Mild exertional dyspnea. Denies acute radiating pain, diaphoresis, or palpitations.\nPMHx: Essential Hypertension x 2 years.\nCURRENT MEDS: Amlodipine 5mg OD.\nALLERGIES: Penicillin (cutaneous rash).\nPENDING QUESTIONS: Evaluation for ACE-inhibitor/CCB related cough vs post-nasal drip/reflux; CXR / ECG consideration.',
    status: 'ready',
    createdAt: '2026-11-06T10:30:00.000Z',
    updatedAt: '2026-11-06T11:15:00.000Z',
  },
  {
    id: 'note-en-02',
    userId: 'guest-patient-shastho-01',
    title: 'Routine 6-Month Diabetes & Fatigue Review',
    language: 'en',
    chiefComplaint: 'Afternoon energy crashes and tingling sensation in toes',
    patientDescription: 'For the past 4 weeks, I have felt noticeably tired around 3 PM despite 7 hours of sleep. In the last 10 days, I started noticing occasional pins-and-needles tingling in both big toes in the evening. Fasting morning blood sugar logged on glucometer has ranged between 7.2 to 8.4 mmol/L.',
    onsetDate: 'Fatigue 4 weeks ago; Toe tingling 10 days ago',
    duration: 'Tingling is intermittent, lasts 30-45 minutes in evening',
    symptoms: 'Post-prandial fatigue, bilateral peripheral toe paresthesia, mild polyuria',
    reportedMedicalHistory: 'Type 2 Diabetes Mellitus diagnosed in 2023, Mild dyslipidemia',
    existingMedications: 'Metformin 500mg twice daily with meals; Atorvastatin 10mg at bedtime',
    allergies: 'None reported (NKDA)',
    questionsForDoctor: '1. Could the tingling in my toes indicate early diabetic neuropathy?\n2. Should we check a repeat HbA1c test and urine microalbumin?\n3. Would a consultation with a registered dietitian be recommended?',
    patientSummary: 'You are noticing afternoon fatigue for the past month and evening tingling in your big toes over the past 10 days. Fasting blood sugar has been slightly elevated (7.2-8.4 mmol/L). You take Metformin and Atorvastatin with no known drug allergies.',
    doctorBrief: 'CHIEF COMPLAINT: Suboptimal glycemic control, fatigue, and bilateral toe paresthesia.\nHPI: Patient with T2DM reports 4-week history of afternoon fatigue and 10-day history of bilateral lower extremity sensory symptoms (pins and needles in great toes). Home FBS: 7.2 - 8.4 mmol/L.\nPMHx: T2DM (diagnosed 2023), Dyslipidemia.\nMEDS: Metformin 500mg BID, Atorvastatin 10mg QHS.\nALLERGIES: NKDA.\nKEY CLINICAL INQUIRY: Peripheral neuropathy screening (monofilament), repeat HbA1c, urine albumin-creatinine ratio (uACR).',
    status: 'ready',
    createdAt: '2026-11-07T14:00:00.000Z',
    updatedAt: '2026-11-07T14:45:00.000Z',
  },
];

export const INITIAL_DOCUMENTS: SourceDocument[] = [
  {
    id: 'doc-cbc-01',
    userId: 'guest-patient-shastho-01',
    name: 'Complete Blood Count (CBC) - Diagnostic Lab.pdf',
    category: 'lab_report',
    fileType: 'pdf',
    extractedText: `PATIENT REPORT: Complete Blood Count & Routine Hemogram
Date of Specimen: 2026-10-24 | Lab ID: LAB-DH-89241
Referring Physician: Dr. K. M. Rahman, MBBS, FCPS

RESULTS:
- Hemoglobin (Hb): 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL) [LOW]
- Total RBC Count: 3.9 x 10^12/L (Reference: 4.0 - 5.2 x 10^12/L) [LOW]
- Packed Cell Volume (PCV/Hematocrit): 34.5% (Reference: 36.0 - 46.0%) [LOW]
- Mean Corpuscular Volume (MCV): 76.2 fL (Reference: 80.0 - 96.0 fL) [LOW]
- Mean Corpuscular Hemoglobin (MCH): 25.1 pg (Reference: 27.0 - 32.0 pg) [LOW]
- Total WBC Count: 6,800 /uL (Reference: 4,000 - 11,000 /uL) [NORMAL]
- Platelet Count: 245,000 /uL (Reference: 150,000 - 450,000 /uL) [NORMAL]
- ESR (Westergren): 18 mm in 1st hr (Reference: 0 - 20 mm) [NORMAL]

IMPRESSION:
Microcytic hypochromic indices suggestive of mild iron deficiency or hemoglobinopathy trait. Serum ferritin and iron studies recommended for clinical correlation.`,
    analysisSummary: 'This lab report shows a mild microcytic anemia pattern (slightly low hemoglobin of 11.2 g/dL and low MCV of 76.2 fL). White blood cells and platelets are normal. This is commonly associated with low iron levels or dietary factors. You should discuss with your doctor whether a ferritin test or dietary iron supplementation is appropriate.',
    ocrConfidence: 'High (98% match)',
    tags: 'blood, anemia, cbc, iron',
    findings: [
      { testOrItem: 'Hemoglobin (Hb)', value: '11.2 g/dL', referenceRange: '12.0 - 15.5 g/dL', status: 'Low' },
      { testOrItem: 'MCV (Cell Size)', value: '76.2 fL', referenceRange: '80.0 - 96.0 fL', status: 'Low' },
      { testOrItem: 'Platelet Count', value: '245,000 /uL', referenceRange: '150,000 - 450,000 /uL', status: 'Normal' },
      { testOrItem: 'Total WBC', value: '6,800 /uL', referenceRange: '4,000 - 11,000 /uL', status: 'Normal' },
    ],
    createdAt: '2026-10-25T09:00:00.000Z',
  },
  {
    id: 'doc-research-02',
    userId: 'guest-patient-shastho-01',
    name: 'Clinical Guidelines on Type 2 Diabetes & Cardiovascular Protection.pdf',
    category: 'educational',
    fileType: 'pdf',
    extractedText: `Page 1
Clinical Guidelines on Type 2 Diabetes Management and Microvascular Protection in Adult Patients.
Key Principle 1: Comprehensive Glycemic Target
An individualized HbA1c target of < 7.0% (53 mmol/mol) is appropriate for most non-pregnant adults to reduce microvascular complications (retinopathy, nephropathy, and distal symmetric polyneuropathy). In elderly patients or those with recurrent hypoglycemia, a relaxed target of < 7.5% - 8.0% is advised.

Page 2
Key Principle 2: Early Detection of Diabetic Peripheral Neuropathy
Distal symmetric polyneuropathy affects up to 50% of individuals with long-standing diabetes. Screening should occur at diagnosis for T2DM and annually thereafter. Initial evaluation includes assessment of pinprick sensation, temperature, vibration perception with a 128-Hz tuning fork, and 10-g monofilament pressure testing. Patient reporting of nocturnal burning, tingling, or lancinating pain should prompt clinical evaluation.

Page 3
Key Principle 3: Lifestyle & Nutritional Interventions
A Mediterranean or balanced South Asian plate model emphasizing complex unrefined carbohydrates, dietary fiber exceeding 30 grams daily, and reduction of ultra-processed sugars improves insulin sensitivity and postprandial glucose excursions. Moderate physical activity of 150 minutes per week (e.g., brisk walking) significantly reduces cardiovascular mortality.`,
    analysisSummary: 'Educational clinical guideline summarizing target HbA1c levels, yearly diabetic neuropathy foot screenings (10-g monofilament and vibration testing), and dietary strategies (high fiber >30g/day and 150 mins weekly physical activity).',
    tags: 'diabetes, neuropathy, lifestyle, clinical guideline',
    createdAt: '2026-11-01T12:00:00.000Z',
  },
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-01',
    userId: 'guest-patient-shastho-01',
    doctorName: 'Dr. Nusrat Jahan, FCPS (Medicine)',
    specialty: 'Internal Medicine & Diabetology',
    dateTime: '2026-11-12 at 05:30 PM',
    location: 'Square Hospitals Consultation Suite 4B, Panthapath, Dhaka',
    linkedNoteId: 'note-en-02',
    checklist: [
      'Bring ShasthoNote Consultation Brief PDF',
      'Bring recent CBC lab report & home blood glucose log',
      'List of current daily medications (Metformin, Atorvastatin)',
      'Arrive 15 minutes early for vitals check',
    ],
    status: 'upcoming',
    createdAt: '2026-11-07T15:00:00.000Z',
  },
];

export const INITIAL_STUDY_RESOURCES: StudyResource[] = [
  {
    id: 'study-fc-01',
    userId: 'guest-patient-shastho-01',
    title: 'Type 2 Diabetes & Microvascular Health Flashcards',
    type: 'flashcards',
    topic: 'Diabetic Neuropathy & Glycemic Targets',
    sourceDocumentId: 'doc-research-02',
    contentJson: JSON.stringify({
      flashcards: [
        {
          id: 'fc-1',
          front: 'What is the standard recommended target HbA1c for non-pregnant adults with T2DM?',
          back: 'Target HbA1c is generally < 7.0% (53 mmol/mol) to reduce risk of microvascular complications.',
          clinicalSignificance: 'Achieving this threshold helps prevent diabetic retinopathy, nephropathy, and neuropathy.',
        },
        {
          id: 'fc-2',
          front: 'What bedside physical exam tool is standard for detecting loss of protective sensation in feet?',
          back: 'The 10-gram Semmes-Weinstein monofilament test applied to standard plantar surface points.',
          clinicalSignificance: 'Loss of sensation indicates high risk for diabetic foot ulcers and requires protective footwear.',
        },
        {
          id: 'fc-3',
          front: 'How often should patients with Type 2 Diabetes undergo formal neuropathy foot screening?',
          back: 'At initial diagnosis, and at least annually thereafter.',
          clinicalSignificance: 'Early detection allows optimization of glucose control and preventative podiatric care.',
        },
        {
          id: 'fc-4',
          front: 'What daily dietary fiber intake is recommended in evidence-based diabetic nutrition guidelines?',
          back: 'At least 30 grams of dietary fiber daily, with emphasis on unrefined legumes, vegetables, and whole grains.',
          clinicalSignificance: 'Fiber slows carbohydrate absorption, blunting postprandial glucose spikes.',
        },
      ],
    }),
    createdAt: '2026-11-02T10:00:00.000Z',
  },
  {
    id: 'study-quiz-02',
    userId: 'guest-patient-shastho-01',
    title: 'Diabetic Neuropathy & Lab Findings Quiz',
    type: 'quiz',
    topic: 'Clinical Evidence Review',
    sourceDocumentId: 'doc-research-02',
    contentJson: JSON.stringify({
      questions: [
        {
          id: 'q-1',
          question: 'According to clinical guidelines, which symptom is most characteristic of early diabetic distal polyneuropathy?',
          options: [
            'Nocturnal burning and tingling in bilateral toes (stocking distribution)',
            'Sudden unilateral sharp shooting pain in the shoulder',
            'Continuous joint swelling and morning stiffness in the spine',
            'Transient dizziness only upon standing from a chair',
          ],
          correctIndex: 0,
          explanation: 'Diabetic peripheral neuropathy characteristically presents symmetrically starting in the distal toes and feet with nocturnal tingling, burning, or pins-and-needles.',
        },
        {
          id: 'q-2',
          question: 'In a Complete Blood Count, low Hemoglobin combined with low MCV (<80 fL) most typically indicates:',
          options: [
            'Microcytic anemia (such as iron deficiency or thalassemia trait)',
            'Macrocytic anemia due to Vitamin B12 deficiency',
            'Acute bacterial blood infection',
            'Normal physiological variation with no follow-up needed',
          ],
          correctIndex: 0,
          explanation: 'Low MCV (< 80 fL) defines microcytosis (small red blood cells), most commonly caused by iron deficiency or hemoglobinopathy.',
        },
      ],
    }),
    createdAt: '2026-11-03T11:00:00.000Z',
  },
  {
    id: 'study-mm-03',
    userId: 'guest-patient-shastho-01',
    title: 'Type 2 Diabetes Comprehensive Care Mind Map',
    type: 'mindmap',
    topic: 'T2DM Patient Care & Education',
    sourceDocumentId: 'doc-research-02',
    contentJson: JSON.stringify({
      centralTopic: 'Type 2 Diabetes Management',
      branches: [
        {
          title: 'Glycemic Goals & Monitoring',
          subtopics: ['Target HbA1c < 7.0%', 'Home Fasting Blood Sugar 4.4-7.0 mmol/L', 'Continuous or fingerstick tracking', 'Annual lab review'],
        },
        {
          title: 'Microvascular Screening',
          subtopics: ['Annual 10-g monofilament foot check', 'Dilated eye fundus exam', 'Urine microalbumin (uACR)', 'Early neuropathy symptom reporting'],
        },
        {
          title: 'Lifestyle & Nutrition',
          subtopics: ['Dietary fiber > 30g daily', '150 mins weekly aerobic activity', 'South Asian plate model balance', 'Limit sugar-sweetened beverages'],
        },
        {
          title: 'Consultation Preparation',
          subtopics: ['Bring blood glucose log', 'List current daily doses', 'Note duration of new sensations', 'Ask about specialist referrals'],
        },
      ],
    }),
    createdAt: '2026-11-04T12:00:00.000Z',
  },
];

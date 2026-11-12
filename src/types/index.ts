export type Language = 'en' | 'bn';

export type WorkspaceMode = 'documentation' | 'research';

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferredLanguage?: Language;
}

export interface HealthNote {
  id: string;
  userId: string;
  title: string;
  language: 'en' | 'bn' | 'mixed';
  chiefComplaint: string;
  patientDescription: string;
  onsetDate?: string;
  duration?: string;
  symptoms?: string;
  reportedMedicalHistory?: string;
  existingMedications?: string;
  allergies?: string;
  questionsForDoctor?: string;
  structuredSummary?: string;
  patientSummary?: string;
  doctorBrief?: string;
  audioTranscript?: string;
  missingInformationFlags?: string[];
  status: 'draft' | 'ready' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface SourceDocument {
  id: string;
  userId: string;
  name: string;
  category: 'lab_report' | 'prescription' | 'discharge_summary' | 'educational' | 'literature';
  fileType: 'pdf' | 'image' | 'text';
  extractedText: string;
  analysisSummary?: string;
  tags?: string;
  createdAt: string;
  ocrConfidence?: string;
  findings?: Array<{
    testOrItem: string;
    value: string;
    referenceRange?: string;
    status: string;
  }>;
}

export interface Appointment {
  id: string;
  userId: string;
  doctorName: string;
  specialty: string;
  dateTime: string;
  location: string;
  linkedNoteId?: string;
  checklist?: string[];
  /** Indexes into `checklist` that the user has ticked off (persisted). */
  checklistDone?: number[];
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  clinicalSignificance?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MindMapBranch {
  title: string;
  subtopics: string[];
}

export interface MindMapData {
  centralTopic: string;
  branches: MindMapBranch[];
}

export interface StudyResource {
  id: string;
  userId: string;
  title: string;
  type: 'flashcards' | 'quiz' | 'mindmap' | 'study_guide';
  topic: string;
  contentJson: string;
  sourceDocumentId?: string;
  createdAt: string;
}

export type VitalType =
  | 'blood_pressure'
  | 'blood_glucose'
  | 'weight'
  | 'temperature'
  | 'heart_rate'
  | 'spo2';

export type VitalContext = 'fasting' | 'after_meal' | 'random' | 'resting' | 'after_activity';

/** A single self-reported measurement. For blood pressure `value` is systolic and `value2` diastolic. */
export interface VitalReading {
  id: string;
  userId: string;
  type: VitalType;
  value: number;
  value2?: number;
  unit: string;
  context?: VitalContext;
  /** ISO 8601 timestamp of when the measurement was taken. */
  measuredAt: string;
  note?: string;
  createdAt: string;
}

/** A medication the user wants reminders and an adherence log for. Not a prescription record. */
export interface Medication {
  id: string;
  userId: string;
  name: string;
  dose: string;
  /** 24-hour local times, e.g. ["08:00", "20:00"]. */
  times: string[];
  /** Local calendar dates, YYYY-MM-DD. */
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  /** Doses marked as taken, each "YYYY-MM-DD@HH:MM". */
  takenLog: string[];
  createdAt: string;
}

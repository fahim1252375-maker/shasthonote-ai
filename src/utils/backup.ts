/**
 * Versioned export / import of a user's own ShasthoNote data.
 *
 * Import is deliberately strict because imported records are written to the user's
 * account under Firestore rules that use field allowlists:
 *   - only known fields are kept (unknown keys are dropped),
 *   - records with an invalid shape or id are skipped and counted,
 *   - `userId` is NOT trusted from the file; the app rewrites it to the signed-in user.
 */
import type { Appointment, HealthNote, Medication, SourceDocument, StudyResource, VitalReading } from '../types';

export const BACKUP_APP = 'ShasthoNote AI';
export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
export const MAX_RECORDS_PER_COLLECTION = 2_000;

export interface BackupData {
  notes: HealthNote[];
  documents: SourceDocument[];
  appointments: Appointment[];
  studyResources: StudyResource[];
  vitals: VitalReading[];
  medications: Medication[];
}

export interface BackupBundle {
  app: typeof BACKUP_APP;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  counts: Record<keyof BackupData, number>;
  data: BackupData;
}

export const EMPTY_BACKUP_DATA: BackupData = {
  notes: [],
  documents: [],
  appointments: [],
  studyResources: [],
  vitals: [],
  medications: [],
};

export function countBackupData(data: BackupData): Record<keyof BackupData, number> {
  return {
    notes: data.notes.length,
    documents: data.documents.length,
    appointments: data.appointments.length,
    studyResources: data.studyResources.length,
    vitals: data.vitals.length,
    medications: data.medications.length,
  };
}

export function buildBackupBundle(data: BackupData, now = new Date()): BackupBundle {
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    counts: countBackupData(data),
    data,
  };
}

// --- Per-collection allowlists (must mirror firestore.rules `hasOnly`) ------

const NOTE_KEYS = [
  'id', 'userId', 'title', 'language', 'chiefComplaint', 'patientDescription', 'onsetDate', 'duration', 'symptoms',
  'reportedMedicalHistory', 'existingMedications', 'allergies', 'questionsForDoctor', 'structuredSummary',
  'patientSummary', 'doctorBrief', 'audioTranscript', 'missingInformationFlags', 'status', 'createdAt', 'updatedAt',
] as const;
const DOCUMENT_KEYS = [
  'id', 'userId', 'name', 'category', 'fileType', 'extractedText', 'analysisSummary', 'tags', 'createdAt',
  'ocrConfidence', 'findings',
] as const;
const APPOINTMENT_KEYS = [
  'id', 'userId', 'doctorName', 'specialty', 'dateTime', 'location', 'linkedNoteId', 'checklist', 'checklistDone',
  'status', 'createdAt',
] as const;
const STUDY_KEYS = ['id', 'userId', 'title', 'type', 'topic', 'contentJson', 'sourceDocumentId', 'createdAt'] as const;
const VITAL_KEYS = ['id', 'userId', 'type', 'value', 'value2', 'unit', 'context', 'measuredAt', 'note', 'createdAt'] as const;
const MEDICATION_KEYS = [
  'id', 'userId', 'name', 'dose', 'times', 'startDate', 'endDate', 'notes', 'active', 'takenLog', 'createdAt',
] as const;

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isId = (value: unknown): value is string => isString(value) && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const isStringArray = (value: unknown, maximumItems: number, maximumLength = 500): value is string[] =>
  Array.isArray(value) && value.length <= maximumItems && value.every((item) => isString(item) && item.length <= maximumLength);
const optionalString = (raw: Raw, key: string, maximumLength: number): boolean =>
  raw[key] === undefined || (isString(raw[key]) && raw[key].length <= maximumLength);
const optionalStringArray = (raw: Raw, key: string, maximumItems: number, maximumLength = 500): boolean =>
  raw[key] === undefined || isStringArray(raw[key], maximumItems, maximumLength);
const optionalIndexArray = (raw: Raw, key: string, maximumItems: number): boolean =>
  raw[key] === undefined || (Array.isArray(raw[key]) && raw[key].length <= maximumItems &&
    raw[key].every((item) => Number.isInteger(item) && item >= 0 && item < maximumItems));
const optionalNumber = (raw: Raw, key: string, minimum: number, maximum: number): boolean =>
  raw[key] === undefined || (typeof raw[key] === 'number' && Number.isFinite(raw[key]) && raw[key] >= minimum && raw[key] <= maximum);

function pick<T>(raw: Raw, keys: readonly string[]): T {
  const out: Raw = {};
  for (const key of keys) if (raw[key] !== undefined) out[key] = raw[key];
  return out as T;
}
const isFinding = (value: unknown): boolean => {
  if (!isObject(value)) return false;
  return isString(value.testOrItem) && value.testOrItem.length <= 256 &&
    isString(value.value) && value.value.length <= 256 &&
    isString(value.status) && value.status.length <= 64 &&
    optionalString(value, 'referenceRange', 256) &&
    Object.keys(value).every((key) => ['testOrItem', 'value', 'status', 'referenceRange'].includes(key));
};
const isFindings = (value: unknown): boolean =>
  Array.isArray(value) && value.length <= 100 && value.every(isFinding);

const NOTE_LANGUAGES = ['en', 'bn', 'mixed'];
const NOTE_STATUSES = ['draft', 'ready', 'archived'];
const DOC_CATEGORIES = ['lab_report', 'prescription', 'discharge_summary', 'educational', 'literature'];
const DOC_FILE_TYPES = ['pdf', 'image', 'text'];
const APPOINTMENT_STATUSES = ['upcoming', 'completed', 'cancelled'];
const STUDY_TYPES = ['flashcards', 'quiz', 'mindmap', 'study_guide'];
const VITAL_TYPE_VALUES = ['blood_pressure', 'blood_glucose', 'weight', 'temperature', 'heart_rate', 'spo2'];
const VITAL_CONTEXTS = ['fasting', 'after_meal', 'random', 'resting', 'after_activity'];
const isTimeList = (value: unknown): value is string[] =>
  isStringArray(value, 12, 5) && value.every((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item));

const validators: Record<keyof BackupData, (raw: Raw) => boolean> = {
  notes: (r) =>
    isId(r.id) && isString(r.title) && r.title.length <= 256 && NOTE_LANGUAGES.includes(r.language as string) &&
    isString(r.chiefComplaint) && r.chiefComplaint.length <= 2_000 &&
    isString(r.patientDescription) && r.patientDescription.length <= 50_000 &&
    NOTE_STATUSES.includes(r.status as string) && isString(r.createdAt) && r.createdAt.length <= 64 &&
    isString(r.updatedAt) && r.updatedAt.length <= 64 &&
    optionalString(r, 'onsetDate', 256) && optionalString(r, 'duration', 256) && optionalString(r, 'symptoms', 5_000) &&
    optionalString(r, 'reportedMedicalHistory', 10_000) && optionalString(r, 'existingMedications', 10_000) &&
    optionalString(r, 'allergies', 5_000) && optionalString(r, 'questionsForDoctor', 10_000) &&
    optionalString(r, 'structuredSummary', 50_000) && optionalString(r, 'patientSummary', 50_000) &&
    optionalString(r, 'doctorBrief', 50_000) && optionalString(r, 'audioTranscript', 100_000) &&
    optionalStringArray(r, 'missingInformationFlags', 50, 500),
  documents: (r) =>
    isId(r.id) && isString(r.name) && r.name.length <= 256 && DOC_CATEGORIES.includes(r.category as string) &&
    DOC_FILE_TYPES.includes(r.fileType as string) && isString(r.extractedText) && r.extractedText.length <= 500_000 &&
    isString(r.createdAt) && r.createdAt.length <= 64 && optionalString(r, 'analysisSummary', 50_000) &&
    optionalString(r, 'tags', 1_000) && optionalString(r, 'ocrConfidence', 64) &&
    (r.findings === undefined || isFindings(r.findings)),
  appointments: (r) =>
    isId(r.id) && isString(r.doctorName) && r.doctorName.length <= 256 &&
    isString(r.specialty) && r.specialty.length <= 128 && isString(r.dateTime) && r.dateTime.length <= 64 &&
    isString(r.location) && r.location.length <= 256 && APPOINTMENT_STATUSES.includes(r.status as string) &&
    isString(r.createdAt) && r.createdAt.length <= 64 && optionalString(r, 'linkedNoteId', 128) &&
    optionalStringArray(r, 'checklist', 50, 500) && optionalIndexArray(r, 'checklistDone', 50),
  studyResources: (r) =>
    isId(r.id) && isString(r.title) && r.title.length <= 256 && STUDY_TYPES.includes(r.type as string) &&
    isString(r.topic) && r.topic.length <= 256 && isString(r.contentJson) && r.contentJson.length <= 100_000 &&
    isString(r.createdAt) && r.createdAt.length <= 64 && optionalString(r, 'sourceDocumentId', 128),
  vitals: (r) =>
    isId(r.id) && VITAL_TYPE_VALUES.includes(r.type as string) && typeof r.value === 'number' &&
    Number.isFinite(r.value) && r.value >= 0 && r.value <= 1_000 && optionalNumber(r, 'value2', 0, 1_000) &&
    isString(r.unit) && r.unit.length <= 16 && isString(r.measuredAt) && r.measuredAt.length <= 64 &&
    Number.isFinite(Date.parse(r.measuredAt)) && isString(r.createdAt) && r.createdAt.length <= 64 &&
    (r.context === undefined || VITAL_CONTEXTS.includes(r.context as string)) && optionalString(r, 'note', 500),
  medications: (r) =>
    isId(r.id) && isString(r.name) && r.name.length <= 128 && isString(r.dose) && r.dose.length <= 128 &&
    isTimeList(r.times) && isString(r.startDate) && r.startDate.length <= 16 &&
    (r.endDate === undefined || (isString(r.endDate) && r.endDate.length <= 16)) &&
    optionalString(r, 'notes', 500) && typeof r.active === 'boolean' && isStringArray(r.takenLog, 800, 64) &&
    isString(r.createdAt) && r.createdAt.length <= 64,
};

const allowlists: Record<keyof BackupData, readonly string[]> = {
  notes: NOTE_KEYS,
  documents: DOCUMENT_KEYS,
  appointments: APPOINTMENT_KEYS,
  studyResources: STUDY_KEYS,
  vitals: VITAL_KEYS,
  medications: MEDICATION_KEYS,
};

/**
 * A plain interface (not a discriminated union) so callers can read `error` / `data`
 * without relying on strictNullChecks-dependent narrowing. On failure `data` is empty.
 */
export interface BackupParseResult {
  ok: boolean;
  data: BackupData;
  skipped: number;
  exportedAt?: string;
  error?: string;
}

const failure = (error: string): BackupParseResult => ({
  ok: false,
  error,
  skipped: 0,
  data: { notes: [], documents: [], appointments: [], studyResources: [], vitals: [], medications: [] },
});

export function parseBackupBundle(text: string): BackupParseResult {
  if (typeof text !== 'string' || text.length === 0) return failure('The file is empty.');
  if (text.length > MAX_BACKUP_BYTES) return failure('The file is too large to import (25 MB limit).');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure('The file is not valid JSON.');
  }

  if (!isObject(parsed) || parsed.app !== BACKUP_APP) {
    return failure('This is not a ShasthoNote AI backup file.');
  }
  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return failure(`Unsupported backup version (${String(parsed.schemaVersion)}). Expected ${BACKUP_SCHEMA_VERSION}.`);
  }
  if (!isObject(parsed.data)) return failure('The backup file has no data section.');

  const data: BackupData = { notes: [], documents: [], appointments: [], studyResources: [], vitals: [], medications: [] };
  let skipped = 0;

  for (const collection of Object.keys(data) as Array<keyof BackupData>) {
    const incoming = (parsed.data as Raw)[collection];
    if (incoming === undefined) continue;
    if (!Array.isArray(incoming)) return failure(`"${collection}" must be a list.`);

    const seen = new Set<string>();
    const accepted: Raw[] = [];
    for (const item of incoming.slice(0, MAX_RECORDS_PER_COLLECTION)) {
      if (!isObject(item) || !validators[collection](item) || seen.has(item.id as string)) {
        skipped += 1;
        continue;
      }
      seen.add(item.id as string);
      accepted.push(pick<Raw>(item, allowlists[collection]));
    }
    skipped += Math.max(0, incoming.length - MAX_RECORDS_PER_COLLECTION);
    (data[collection] as unknown as Raw[]) = accepted;
  }

  return { ok: true, data, skipped, exportedAt: isString(parsed.exportedAt) ? parsed.exportedAt : undefined };
}

/** Re-own every imported record: the file's userId is never trusted. */
export function assignOwner(data: BackupData, userId: string): BackupData {
  const own = <T extends { userId: string }>(items: T[]): T[] => items.map((item) => ({ ...item, userId }));
  return {
    notes: own(data.notes),
    documents: own(data.documents),
    appointments: own(data.appointments),
    studyResources: own(data.studyResources),
    vitals: own(data.vitals),
    medications: own(data.medications),
  };
}

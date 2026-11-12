/**
 * Turns the user's selected notes and documents into numbered text passages for
 * "Ask My Records". The server limits the request to 8 passages of 12,000 characters.
 */
import type { HealthNote, SourceDocument } from '../types';

export interface RecordChunk {
  id: string;
  title: string;
  page: number;
  text: string;
}

export const MAX_RECORD_CHUNKS = 8;
export const RECORD_CHUNK_SIZE = 6_000;

export function noteToText(note: HealthNote): string {
  const rows: Array<[string, string | undefined]> = [
    ['Title', note.title],
    ['Chief complaint', note.chiefComplaint],
    ['Description', note.patientDescription],
    ['Onset', note.onsetDate],
    ['Duration', note.duration],
    ['Symptoms', note.symptoms],
    ['Reported medical history', note.reportedMedicalHistory],
    ['Current medications', note.existingMedications],
    ['Allergies', note.allergies],
    ['Questions for doctor', note.questionsForDoctor],
    ['Voice transcript', note.audioTranscript],
  ];
  return rows
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([label, value]) => `${label}: ${value!.trim()}`)
    .join('\n');
}

export function documentToText(document: SourceDocument): string {
  const findings = (document.findings ?? [])
    .map((f) => `${f.testOrItem}: ${f.value}${f.referenceRange ? ` (reference ${f.referenceRange})` : ''} [${f.status}]`)
    .join('\n');
  return [document.analysisSummary ? `Summary: ${document.analysisSummary}` : '', findings ? `Findings:\n${findings}` : '', document.extractedText]
    .filter(Boolean)
    .join('\n\n');
}

/** Split on paragraph/line boundaries where possible so quotes stay intact within a chunk. */
export function splitIntoChunks(text: string, size = RECORD_CHUNK_SIZE): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let remaining = clean;
  while (remaining.length > size) {
    const window = remaining.slice(0, size);
    const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('\n'), window.lastIndexOf('. '));
    const cut = breakAt > size * 0.5 ? breakAt + 1 : size;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export interface BuiltChunks {
  chunks: RecordChunk[];
  /** True when selected content did not fit in MAX_RECORD_CHUNKS and was cut off. */
  truncated: boolean;
}

export function buildRecordChunks(notes: HealthNote[], documents: SourceDocument[]): BuiltChunks {
  const sources: Array<{ id: string; title: string; text: string }> = [
    ...notes.map((note) => ({ id: note.id, title: note.title || 'Health note', text: noteToText(note) })),
    ...documents.map((doc) => ({ id: doc.id, title: doc.name, text: documentToText(doc) })),
  ];

  const chunks: RecordChunk[] = [];
  let truncated = false;
  for (const source of sources) {
    const pieces = splitIntoChunks(source.text);
    pieces.forEach((text, index) => {
      if (chunks.length >= MAX_RECORD_CHUNKS) {
        truncated = true;
        return;
      }
      chunks.push({ id: source.id, title: source.title.slice(0, 200), page: index + 1, text });
    });
  }
  return { chunks, truncated };
}

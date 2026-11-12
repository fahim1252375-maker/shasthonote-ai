/**
 * Client-side global search used by the Ctrl/⌘+K command palette.
 * Everything runs in the browser over data already loaded in memory.
 * Works for English and Bangla (Unicode letters + combining marks).
 */
import type { Appointment, HealthNote, Medication, SourceDocument, StudyResource } from '../types';

export type SearchKind = 'note' | 'document' | 'appointment' | 'study' | 'medication';

export interface SearchableData {
  notes: HealthNote[];
  documents: SourceDocument[];
  appointments: Appointment[];
  studyResources: StudyResource[];
  medications: Medication[];
}

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
  score: number;
}

const MAX_TEXT_PER_FIELD = 20_000;

export function tokenize(query: string): string[] {
  return (query.toLocaleLowerCase().normalize('NFC').match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).slice(0, 8);
}

interface Candidate {
  kind: SearchKind;
  id: string;
  title: string;
  /** Fields in priority order; the first one gets a higher weight. */
  fields: string[];
}

function toCandidates(data: SearchableData): Candidate[] {
  const candidates: Candidate[] = [];
  for (const note of data.notes) {
    candidates.push({
      kind: 'note',
      id: note.id,
      title: note.title,
      fields: [
        note.chiefComplaint,
        note.symptoms ?? '',
        note.patientDescription,
        note.existingMedications ?? '',
        note.allergies ?? '',
        note.reportedMedicalHistory ?? '',
        note.questionsForDoctor ?? '',
        note.doctorBrief ?? '',
      ],
    });
  }
  for (const document of data.documents) {
    candidates.push({
      kind: 'document',
      id: document.id,
      title: document.name,
      fields: [
        document.tags ?? '',
        document.analysisSummary ?? '',
        (document.findings ?? []).map((f) => `${f.testOrItem} ${f.value}`).join(' '),
        document.extractedText,
      ],
    });
  }
  for (const appointment of data.appointments) {
    candidates.push({
      kind: 'appointment',
      id: appointment.id,
      title: `${appointment.doctorName} — ${appointment.specialty}`,
      fields: [appointment.location, appointment.dateTime, (appointment.checklist ?? []).join(' ')],
    });
  }
  for (const resource of data.studyResources) {
    candidates.push({ kind: 'study', id: resource.id, title: resource.title, fields: [resource.topic] });
  }
  for (const medication of data.medications) {
    candidates.push({
      kind: 'medication',
      id: medication.id,
      title: medication.name,
      fields: [medication.dose, medication.notes ?? ''],
    });
  }
  return candidates;
}

function snippetAround(text: string, token: string): string {
  const lower = text.toLocaleLowerCase();
  const index = lower.indexOf(token);
  if (index < 0) return text.slice(0, 90).trim();
  const start = Math.max(0, index - 35);
  const end = Math.min(text.length, index + token.length + 55);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
}

/** All query words must appear somewhere (AND). Title matches rank highest. */
export function searchAll(query: string, data: SearchableData, limit = 20): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const candidate of toCandidates(data)) {
    const title = candidate.title.toLocaleLowerCase();
    const fields = candidate.fields.map((field) => field.slice(0, MAX_TEXT_PER_FIELD).toLocaleLowerCase());
    let score = 0;
    let matchedAll = true;
    let snippet = '';

    for (const token of tokens) {
      let tokenScore = 0;
      if (title.includes(token)) tokenScore += title.startsWith(token) ? 7 : 5;
      fields.forEach((field, index) => {
        if (!field.includes(token)) return;
        tokenScore += index === 0 ? 3 : 1;
        if (!snippet) snippet = snippetAround(candidate.fields[index], token);
      });
      if (tokenScore === 0) {
        matchedAll = false;
        break;
      }
      score += tokenScore;
    }

    if (matchedAll) hits.push({ kind: candidate.kind, id: candidate.id, title: candidate.title, snippet, score });
  }

  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

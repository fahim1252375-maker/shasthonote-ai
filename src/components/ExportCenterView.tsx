import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Pill,
  ShieldAlert,
  HelpCircle,
  Clock,
  User,
} from 'lucide-react';
import { HealthNote, Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { downloadTextFile } from '../lib/download';

interface ExportCenterViewProps {
  language: Language;
  notes: HealthNote[];
  selectedNote?: HealthNote | null;
}

export const ExportCenterView: React.FC<ExportCenterViewProps> = ({
  language,
  notes,
  selectedNote,
}) => {
  const t = TRANSLATIONS[language];
  const eT = t.exportCenter;

  const [activeNoteId, setActiveNoteId] = useState<string>(
    selectedNote?.id || notes[0]?.id || ''
  );

  const currentNote = notes.find((n) => n.id === activeNoteId) || selectedNote || notes[0];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!currentNote) return;
    downloadTextFile(
      `shasthonote-${currentNote.id}.json`,
      JSON.stringify(currentNote, null, 2),
      'application/json;charset=utf-8',
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header (hidden in print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-6 h-6 text-teal-600" />
            <span>{eT.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {eT.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
          >
            <span>{eT.downloadJson}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{eT.printBtn}</span>
          </button>
        </div>
      </div>

      {/* Note Selector (hidden in print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-700 shrink-0">
          {eT.selectNote}:
        </span>
        <select
          value={activeNoteId}
          onChange={(e) => setActiveNoteId(e.target.value)}
          aria-label="Select Health Note"
          className="text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full focus:bg-white outline-hidden"
        >
          {notes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title} ({new Date(n.createdAt).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* PRINTABLE OFFICIAL CLINICAL CONSULTATION BRIEF */}
      {currentNote && (
        <div className="bg-white rounded-2xl border border-slate-300 p-8 sm:p-12 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  SHASTHONOTE AI
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-slate-900 text-white uppercase tracking-wider">
                  Clinical Consultation Brief
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Structured Patient-Reported Medical Summary for Healthcare Provider Review
              </p>
            </div>

            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-900">
                Date: {new Date(currentNote.createdAt).toLocaleDateString()}
              </p>
              <p>Document Ref: #{currentNote.id.toUpperCase()}</p>
              <p>Language: {currentNote.language.toUpperCase()}</p>
            </div>
          </div>

          {/* Section: Chief Concern */}
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chief Complaint / Reason for Visit
            </h3>
            <p className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {currentNote.chiefComplaint || currentNote.title}
            </p>
          </div>

          {/* Section: History of Present Illness (HPI) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 block">Symptom Onset:</span>
              <p className="text-slate-900 font-medium">
                {currentNote.onsetDate || 'Not provided by patient'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 block">Episode Duration:</span>
              <p className="text-slate-900 font-medium">
                {currentNote.duration || 'Not provided by patient'}
              </p>
            </div>
          </div>

          {/* Section: Patient Narrative */}
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Patient's Narrative (Own Words)
            </h3>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-200/80 whitespace-pre-wrap">
              {currentNote.patientDescription}
            </p>
          </div>

          {/* Section: Medications & Allergies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1 text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-teal-700" />
                <span>Current Reported Medications:</span>
              </span>
              <p className="text-slate-700 font-medium">
                {currentNote.existingMedications || 'None reported'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1 text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Known Allergies:</span>
              </span>
              <p className="text-slate-700 font-medium">
                {currentNote.allergies || 'No known allergies reported (NKDA)'}
              </p>
            </div>
          </div>

          {/* Section: Doctor-Facing Structured Brief */}
          {currentNote.doctorBrief && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Doctor-Facing Synthesized Brief
              </h3>
              <pre className="text-xs font-sans text-slate-900 bg-slate-100 p-4 rounded-lg border border-slate-300 leading-relaxed whitespace-pre-wrap">
                {currentNote.doctorBrief}
              </pre>
            </div>
          )}

          {/* Section: Questions to Ask Physician */}
          {currentNote.questionsForDoctor && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Questions the Patient Wishes to Discuss:</span>
              </h3>
              <div className="text-xs text-slate-800 bg-blue-50/40 p-3 rounded-lg border border-blue-200 whitespace-pre-wrap leading-relaxed">
                {currentNote.questionsForDoctor}
              </div>
            </div>
          )}

          {/* Mandatory Clinical Disclaimer Footer */}
          <div className="pt-6 border-t-2 border-slate-200 text-[11px] text-slate-500 space-y-1 leading-snug">
            <p className="font-bold text-slate-700">
              IMPORTANT CLINICAL NOTICE:
            </p>
            <p>
              ShasthoNote AI is an organization and preparation workspace. It is NOT an AI doctor and does not diagnose illnesses, prescribe medications, or recommend dosages. The information above was recorded by the patient and structured with AI assistance to facilitate clinical communication. All medical judgments, diagnoses, and treatment plans must be independently determined by the licensed healthcare professional.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  FileText,
  FileSearch,
  Calendar,
  Sparkles,
  Plus,
  Mic,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react';
import { HealthNote, SourceDocument, Appointment, Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface DashboardViewProps {
  language: Language;
  notes: HealthNote[];
  documents: SourceDocument[];
  appointments: Appointment[];
  onNavigate: (tab: string) => void;
  onSelectNote: (note: HealthNote) => void;
  onSelectDocument: (doc: SourceDocument) => void;
  onOpenEmergencyModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  language,
  notes,
  documents,
  appointments,
  onNavigate,
  onSelectNote,
  onSelectDocument,
  onOpenEmergencyModal,
}) => {
  const t = TRANSLATIONS[language];

  // Calculate readiness of notes (how many have onset, meds, allergies complete)
  const readyNotesCount = notes.filter(
    (n) => n.onsetDate && n.existingMedications && n.allergies
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Triage Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <FileText className="w-96 h-96 -mr-20 -mt-10" />
        </div>

        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-700/60 border border-teal-500/40 text-xs font-medium text-teal-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
            <span>{language === 'bn' ? 'ব্যক্তিগত স্বাস্থ্য তথ্য সুরক্ষিত' : 'Secure Patient Workspace'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.dashboard.welcome}
          </h1>

          <p className="text-sm sm:text-base text-teal-100/90 leading-relaxed">
            {t.dashboard.subtitle}
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('createNote')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.dashboard.createNoteBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('docAnalyzer')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs sm:text-sm border border-white/20 transition-all backdrop-blur-xs"
            >
              <FileSearch className="w-4 h-4 text-teal-300" />
              <span>{t.dashboard.analyzeDocBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.dashboard.stats.activeNotes}
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {notes.length}
            </span>
            <span className="text-xs text-teal-600 font-medium">
              {readyNotesCount} {language === 'bn' ? 'প্রস্তুত' : 'ready'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.dashboard.stats.analyzedReports}
            </span>
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-700">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {documents.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {language === 'bn' ? 'ল্যাব ও প্রেসক্রিপশন' : 'Labs & Rx'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.dashboard.stats.upcomingVisits}
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {appointments.length}
            </span>
            <span className="text-xs text-amber-600 font-medium">
              {language === 'bn' ? 'নির্ধারিত সাক্ষাত' : 'Scheduled'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.dashboard.stats.studySets}
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">3</span>
            <span className="text-xs text-blue-600 font-medium">
              {language === 'bn' ? 'গবেষণা মডিউল' : 'Modules'}
            </span>
          </div>
        </div>
      </div>

      {/* Triage & Readiness Notice */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              {t.dashboard.triageTitle}
            </h3>
            <p className="text-xs text-amber-800/90 mt-0.5 max-w-2xl leading-relaxed">
              {t.dashboard.triageDesc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('createNote')}
          className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg shadow-2xs transition-colors"
        >
          {language === 'bn' ? 'নোট প্রস্তুত করুন' : 'Verify Notes'}
        </button>
      </div>

      {/* Main Two-Column Grid: Recent Consultation Briefs & Medical Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Consultation Notes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {t.dashboard.recentNotes}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('createNote')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              <span>{language === 'bn' ? '+ নতুন' : '+ New'}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2 flex-1">
            {notes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t.dashboard.noNotesYet}
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="py-3.5 flex items-start justify-between gap-3 group hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {note.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-medium shrink-0">
                        {note.language.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {note.chiefComplaint || note.patientDescription}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      {note.existingMedications && (
                        <span className="text-teal-700 truncate max-w-[180px]">
                          Rx: {note.existingMedications}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={() => onSelectNote(note)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {language === 'bn' ? 'দেখুন' : 'Open'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectNote(note);
                        onNavigate('exportCenter');
                      }}
                      className="p-1 text-slate-400 hover:text-teal-700 rounded-md"
                      title="Export Doctor PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Medical Reports & Documents */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-cyan-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {t.dashboard.recentDocuments}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('docAnalyzer')}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
            >
              <span>{language === 'bn' ? '+ আপলোড' : '+ Upload'}</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2 flex-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="py-3.5 flex items-start justify-between gap-3 group hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {doc.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-medium shrink-0">
                      {doc.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {doc.analysisSummary || doc.extractedText.slice(0, 90)}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    {doc.findings && doc.findings.length > 0 && (
                      <span className="text-amber-700 font-medium">
                        {doc.findings.filter((f) => f.status !== 'Normal').length}{' '}
                        {language === 'bn' ? 'ফ্ল্যাগকৃত মান' : 'flagged values'}
                      </span>
                    )}
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectDocument(doc)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 self-center transition-colors"
                >
                  {language === 'bn' ? 'বিশ্লেষণ' : 'Analysis'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety & Educational Boundary Notice */}
      <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-600 border border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{t.common.disclaimerNotice}</span>
        </div>
        <button
          type="button"
          onClick={onOpenEmergencyModal}
          className="text-rose-700 hover:underline font-semibold shrink-0 cursor-pointer"
        >
          {language === 'bn' ? 'জরুরি নির্দেশনা দেখুন' : 'View Emergency Signs'}
        </button>
      </div>
    </div>
  );
};

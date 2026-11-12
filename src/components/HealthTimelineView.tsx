import React from 'react';
import {
  Clock,
  Calendar,
  FileText,
  FileSearch,
  Activity,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { HealthNote, SourceDocument, Appointment, Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface HealthTimelineViewProps {
  language: Language;
  notes: HealthNote[];
  documents: SourceDocument[];
  appointments: Appointment[];
  onSelectNote: (note: HealthNote) => void;
  onSelectDoc: (doc: SourceDocument) => void;
}

export const HealthTimelineView: React.FC<HealthTimelineViewProps> = ({
  language,
  notes,
  documents,
  appointments,
  onSelectNote,
  onSelectDoc,
}) => {
  const t = TRANSLATIONS[language];

  // Merge events into a chronological timeline
  const events = [
    ...notes.map((n) => ({
      id: n.id,
      date: new Date(n.createdAt),
      type: 'note' as const,
      title: n.title,
      summary: n.chiefComplaint || n.patientDescription,
      raw: n,
    })),
    ...documents.map((d) => ({
      id: d.id,
      date: new Date(d.createdAt),
      type: 'document' as const,
      title: d.name,
      summary: d.analysisSummary || d.extractedText.slice(0, 100),
      raw: d,
    })),
    ...appointments.map((a) => ({
      id: a.id,
      date: new Date(a.createdAt),
      type: 'appointment' as const,
      title: `${a.doctorName} (${a.specialty})`,
      summary: `${a.location} • ${a.dateTime}`,
      raw: a,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-teal-600" />
          <span>{language === 'bn' ? 'ব্যক্তিগত স্বাস্থ্য টাইমলাইন' : 'Personal Health Timeline'}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {language === 'bn'
            ? 'আপনার পরামর্শ নোট, ল্যাব রিপোর্ট এবং ডাক্তারের সাক্ষাতের সম্পূর্ণ কালানুক্রমিক ইতিহাস।'
            : 'Chronological clinical history combining patient-reported notes, uploaded diagnostics, and doctor follow-ups.'}
        </p>
      </div>

      {/* Timeline Stream */}
      <div className="relative border-l-2 border-teal-200 ml-4 sm:ml-6 space-y-8 py-2">
        {events.map((ev, idx) => (
          <div key={ev.id} className="relative pl-6 sm:pl-8 group">
            {/* Timeline Dot */}
            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-teal-600 group-hover:scale-125 transition-transform shadow-xs" />

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-teal-300 transition-colors space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {ev.date.toLocaleDateString()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    ev.type === 'note'
                      ? 'bg-teal-50 text-teal-700'
                      : ev.type === 'document'
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {ev.type === 'note'
                    ? 'Consultation Note'
                    : ev.type === 'document'
                    ? 'Medical Report'
                    : 'Appointment'}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {ev.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {ev.summary}
              </p>

              <div className="pt-2 flex justify-end">
                {ev.type === 'note' && (
                  <button
                    type="button"
                    onClick={() => onSelectNote(ev.raw as HealthNote)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    <span>View Note</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {ev.type === 'document' && (
                  <button
                    type="button"
                    onClick={() => onSelectDoc(ev.raw as SourceDocument)}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
                  >
                    <span>View Analysis</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

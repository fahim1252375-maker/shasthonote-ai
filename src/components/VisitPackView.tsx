import React, { useMemo, useState } from 'react';
import { Check, ClipboardCopy, Printer, Stethoscope } from 'lucide-react';
import type { Appointment, HealthNote, Language, Medication, SourceDocument, VitalReading } from '../types';
import { buildVisitPack, visitPackToText } from '../utils/visitPack';

interface VisitPackViewProps {
  language: Language;
  notes: HealthNote[];
  documents: SourceDocument[];
  appointments: Appointment[];
  vitals: VitalReading[];
  medications: Medication[];
  patientName?: string;
}

// Print only the pack: hide the app chrome and show #visit-pack-print on its own.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #visit-pack-print, #visit-pack-print * { visibility: visible !important; }
  #visit-pack-print { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
}
`;

export const VisitPackView: React.FC<VisitPackViewProps> = ({ language, notes, documents, appointments, vitals, medications, patientName }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const [noteId, setNoteId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const note = notes.find((item) => item.id === noteId) ?? notes[0] ?? null;

  const pack = useMemo(
    () => buildVisitPack({ language, note, medications, vitals, documents, appointments }),
    [language, note, medications, vitals, documents, appointments],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(visitPackToText(pack));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      window.alert(tr('Copy is not available in this browser. Use Print instead.', 'এই ব্রাউজারে কপি করা যাচ্ছে না। বদলে Print ব্যবহার করুন।'));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <style>{PRINT_CSS}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            <span>{tr('Doctor Visit Pack', 'ডাক্তার ভিজিট প্যাক')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {tr(
              'One page that pulls together your note, medicines, home readings and flagged labs. Built only from what you saved.',
              'এক পাতায় আপনার নোট, ওষুধ, বাসায় মাপা তথ্য ও চিহ্নিত ল্যাব মান। শুধু আপনার সংরক্ষিত তথ্য থেকে তৈরি।',
            )}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button type="button" onClick={() => void handleCopy()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-400">
            {copied ? <Check className="w-4 h-4 text-teal-600" /> : <ClipboardCopy className="w-4 h-4" />}
            {copied ? tr('Copied', 'কপি হয়েছে') : tr('Copy text', 'লেখা কপি')}
          </button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">
            <Printer className="w-4 h-4" />
            {tr('Print / Save PDF', 'প্রিন্ট / PDF সেভ')}
          </button>
        </div>
      </div>

      {notes.length > 0 && (
        <div>
          <label htmlFor="visit-note" className="block text-xs font-semibold text-slate-700 mb-1">
            {tr('Which note is this visit about?', 'এই ভিজিট কোন নোট নিয়ে?')}
          </label>
          <select
            id="visit-note"
            value={note?.id ?? ''}
            onChange={(e) => setNoteId(e.target.value)}
            className="w-full sm:w-96 text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500/20"
          >
            {notes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <article id="visit-pack-print" className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-5">
        <header className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{pack.title}</h2>
          <p className="text-xs text-slate-500">
            {patientName ? `${patientName} · ` : ''}
            {new Date(pack.generatedAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        {pack.sections.map((section) => (
          <section key={section.id} className={section.id === 'red_flags' ? 'rounded-xl border border-rose-200 bg-rose-50 p-3' : ''}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${section.id === 'red_flags' ? 'text-rose-800' : 'text-slate-500'}`}>{section.heading}</h3>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-800">
              {section.lines.map((line, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-slate-300">•</span>
                  <span className="whitespace-pre-wrap">{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500">{pack.disclaimer}</footer>
      </article>
    </div>
  );
};

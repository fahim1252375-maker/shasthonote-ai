import React, { useMemo, useState } from 'react';
import { FileText, Lightbulb, MessageCircleQuestion, Quote, Send, ShieldAlert } from 'lucide-react';
import type { HealthNote, Language, SourceDocument } from '../types';
import { authenticatedApiFetch } from '../lib/firebase';
import { buildRecordChunks } from '../utils/recordChunks';

interface AskRecordsViewProps {
  language: Language;
  notes: HealthNote[];
  documents: SourceDocument[];
  isGuest: boolean;
}

interface AskResult {
  answer: string;
  foundInSources: boolean;
  citedPassages: Array<{ sourceNumber: number; page: number; quote: string; sourceId: string; sourceTitle: string }>;
  followUpQuestions: string[];
}

const MAX_SELECTED = 6;

export const AskRecordsView: React.FC<AskRecordsViewProps> = ({ language, notes, documents, isGuest }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [truncated, setTruncated] = useState(false);

  const toggle = (key: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_SELECTED) next.add(key);
      return next;
    });
  };

  const chosenNotes = useMemo(() => notes.filter((note) => selected.has(`note:${note.id}`)), [notes, selected]);
  const chosenDocs = useMemo(() => documents.filter((doc) => selected.has(`doc:${doc.id}`)), [documents, selected]);

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || selected.size === 0) return;

    const { chunks, truncated: wasTruncated } = buildRecordChunks(chosenNotes, chosenDocs);
    if (chunks.length === 0) {
      setError(tr('The selected records have no text to search.', 'নির্বাচিত রেকর্ডে খোঁজার মতো লেখা নেই।'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTruncated(wasTruncated);
    try {
      const response = await authenticatedApiFetch('/api/gemini/ask-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, sourceChunks: chunks, language }),
      });
      const json = await response.json();
      if (!response.ok || !json.success || !json.data || typeof json.data.answer !== 'string') {
        throw new Error(json.error || tr('Could not answer from your records.', 'আপনার রেকর্ড থেকে উত্তর দেওয়া যায়নি।'));
      }
      setResult({
        answer: json.data.answer,
        foundInSources: Boolean(json.data.foundInSources),
        citedPassages: Array.isArray(json.data.citedPassages) ? json.data.citedPassages : [],
        followUpQuestions: Array.isArray(json.data.followUpQuestions) ? json.data.followUpQuestions : [],
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : tr('Request failed.', 'অনুরোধ ব্যর্থ হয়েছে।'));
    } finally {
      setLoading(false);
    }
  };

  const noRecords = notes.length === 0 && documents.length === 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageCircleQuestion className="w-6 h-6 text-blue-600" />
          <span>{tr('Ask My Records', 'আমার রেকর্ডকে জিজ্ঞেস করুন')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {tr(
            'Ask a question about your own notes and reports. Answers use only what you select, and every quote is checked against your text.',
            'আপনার নিজের নোট ও রিপোর্ট নিয়ে প্রশ্ন করুন। উত্তরে শুধু আপনার বাছাই করা তথ্য ব্যবহার হয়, আর প্রতিটি উদ্ধৃতি আপনার লেখার সাথে মিলিয়ে দেখা হয়।',
          )}
        </p>
      </div>

      {isGuest && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {tr('Sign in with Google to use this AI feature. Guest demo mode never sends data to the AI server.', 'এই AI ফিচার ব্যবহার করতে Google দিয়ে sign in করুন। Guest demo মোডে কোনো তথ্য AI সার্ভারে যায় না।')}
        </p>
      )}

      {noRecords ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {tr('Save a note or analyze a document first, then come back to ask questions.', 'আগে একটি নোট সংরক্ষণ বা ডকুমেন্ট বিশ্লেষণ করুন, তারপর প্রশ্ন করুন।')}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500">{tr('Notes', 'নোট')}</legend>
              <div className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                {notes.length === 0 && <p className="text-xs text-slate-400">{tr('None', 'কিছু নেই')}</p>}
                {notes.map((note) => (
                  <label key={note.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selected.has(`note:${note.id}`)} onChange={() => toggle(`note:${note.id}`)} className="mt-0.5" />
                    <span>{note.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500">{tr('Documents', 'ডকুমেন্ট')}</legend>
              <div className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                {documents.length === 0 && <p className="text-xs text-slate-400">{tr('None', 'কিছু নেই')}</p>}
                {documents.map((doc) => (
                  <label key={doc.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={selected.has(`doc:${doc.id}`)} onChange={() => toggle(`doc:${doc.id}`)} className="mt-0.5" />
                    <span>{doc.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="text-[11px] text-slate-500">
            {tr(`Select up to ${MAX_SELECTED} records. Selected: ${selected.size}.`, `সর্বোচ্চ ${MAX_SELECTED}টি রেকর্ড বাছুন। বাছাই করা: ${selected.size}টি।`)}
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <label htmlFor="ask-question" className="block text-xs font-semibold text-slate-700">
              {tr('Your question', 'আপনার প্রশ্ন')}
            </label>
            <textarea
              id="ask-question"
              rows={3}
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={tr('e.g. What did my last lab report flag, and what should I ask my doctor?', 'যেমন: আমার শেষ ল্যাব রিপোর্টে কী চিহ্নিত হয়েছে, আর ডাক্তারকে কী জিজ্ঞেস করব?')}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden resize-y"
            />
            <button
              type="button"
              onClick={() => void ask()}
              disabled={loading || isGuest || !question.trim() || selected.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              {loading ? tr('Reading your records…', 'আপনার রেকর্ড পড়া হচ্ছে…') : tr('Ask', 'জিজ্ঞেস করুন')}
            </button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">{tr('Answer', 'উত্তর')}</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{result.answer}</p>
            <p className="text-[11px] text-slate-500">
              {result.foundInSources
                ? tr(`${result.citedPassages.length} quote(s) matched your text exactly.`, `${result.citedPassages.length}টি উদ্ধৃতি আপনার লেখার সাথে হুবহু মিলেছে।`)
                : tr('No quote could be matched to your text, so treat this answer with extra caution.', 'কোনো উদ্ধৃতি আপনার লেখার সাথে মেলেনি, তাই এই উত্তর বাড়তি সতর্কতায় দেখুন।')}
            </p>
            {truncated && (
              <p className="text-[11px] text-amber-700">
                {tr('Your selection was longer than one request allows; only the first part was used.', 'আপনার নির্বাচন একটি অনুরোধের সীমার চেয়ে বড় ছিল; শুধু প্রথম অংশ ব্যবহার হয়েছে।')}
              </p>
            )}
          </div>

          {result.citedPassages.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Quote className="w-4 h-4 text-blue-600" />
                {tr('Verified quotes', 'যাচাই করা উদ্ধৃতি')}
              </h2>
              {result.citedPassages.map((passage, index) => (
                <blockquote key={index} className="border-l-2 border-blue-300 pl-3 text-xs text-slate-700">
                  “{passage.quote}”
                  <footer className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <FileText className="w-3 h-3" />
                    {passage.sourceTitle} · {tr('part', 'অংশ')} {passage.page}
                  </footer>
                </blockquote>
              ))}
            </div>
          )}

          {result.followUpQuestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                {tr('Questions you could ask your doctor', 'ডাক্তারকে যে প্রশ্নগুলো করতে পারেন')}
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                {result.followUpQuestions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {tr(
          'AI can misread or miss things. This is not a diagnosis or medical advice. Matching a quote only shows the words exist in your record, not that they are correct.',
          'AI ভুল পড়তে বা কিছু বাদ দিতে পারে। এটি রোগনির্ণয় বা চিকিৎসা পরামর্শ নয়। উদ্ধৃতি মিলে যাওয়া মানে শুধু শব্দগুলো আপনার রেকর্ডে আছে, সেগুলো সঠিক তা নয়।',
        )}
      </p>
    </div>
  );
};

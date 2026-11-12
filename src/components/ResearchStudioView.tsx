import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  CheckCircle2,
  FileText,
  Quote,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { SourceDocument, Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { authenticatedApiFetch } from '../lib/firebase';
import { chunkDocumentText, DocumentChunk } from '../utils/citationHelper';

interface ResearchStudioViewProps {
  language: Language;
  documents: SourceDocument[];
}

export const ResearchStudioView: React.FC<ResearchStudioViewProps> = ({
  language,
  documents,
}) => {
  const t = TRANSLATIONS[language];
  const rT = t.researchStudio;

  // Selected document IDs
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    documents.map((d) => d.id)
  );
  const [query, setQuery] = useState('');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDocIds(documents.map((document) => document.id));
  }, [documents]);

  // Toggle document selection
  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  // Execute Grounded Research Q&A
  const handleAskQuestion = async () => {
    if (!query.trim()) return;
    if (selectedDocIds.length === 0 && !useGoogleSearch) {
      setErrorMsg(rT.noSourcesSelected);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    // Extract chunks from selected documents
    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
    const allChunks: DocumentChunk[] = [];
    selectedDocs.forEach((doc) => {
      const chunks = chunkDocumentText(doc.id, doc.name, doc.extractedText);
      allChunks.push(...chunks);
    });

    try {
      const res = await authenticatedApiFetch('/api/gemini/grounded-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          sourceChunks: allChunks.slice(0, 8).map((chunk) => ({
            id: chunk.chunkId,
            title: chunk.documentTitle,
            page: chunk.pageNumber || 1,
            text: chunk.text,
          })),
          useGoogleSearch,
          language,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setResearchResult(json.data);
      } else {
        setErrorMsg(json.error || 'Could not complete grounded research.');
      }
    } catch (err) {
      console.error('Research error:', err);
      setErrorMsg('Error contacting grounded research service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <span>{rT.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {rT.subtitle}
        </p>
      </div>

      {/* Source Selection Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {rT.selectSources} ({selectedDocIds.length}/{documents.length})
          </h2>
          <button
            type="button"
            onClick={() =>
              setSelectedDocIds(
                selectedDocIds.length === documents.length
                  ? []
                  : documents.map((d) => d.id)
              )
            }
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            {selectedDocIds.length === documents.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/20'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/50'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded-md flex items-center justify-center shrink-0 text-white ${
                    isSelected ? 'bg-blue-600' : 'border border-slate-300'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {doc.name}
                  </p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {doc.category.replace('_', ' ')} • {doc.extractedText.length} chars
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="relative">
          <textarea
            rows={3}
            value={query}
            maxLength={2000}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={rT.queryPlaceholder}
            className="w-full text-xs sm:text-sm px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all resize-y"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Live Google Search Grounding Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={useGoogleSearch}
              onChange={(e) => setUseGoogleSearch(e.target.checked)}
              className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
            />
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{rT.googleSearchToggle}</span>
          </label>

          <button
            type="button"
            onClick={handleAskQuestion}
            disabled={isLoading || !query.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>{isLoading ? rT.searching : rT.askBtn}</span>
          </button>
        </div>

        {/* Suggested Queries */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-600 font-medium">
            {language === 'bn' ? 'নমুনা প্রশ্ন:' : 'Try:'}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuery(
                'What is the recommended HbA1c target for adults with Type 2 Diabetes and why?'
              )
            }
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Recommended HbA1c Target
          </button>
          <button
            type="button"
            onClick={() =>
              setQuery(
                'What are the microvascular complications and foot screening recommendations?'
              )
            }
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Diabetic Foot Screening
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
        )}
      </div>

      {/* Grounded Research Output */}
      {researchResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {language === 'bn' ? 'তথ্যসূত্রভিত্তিক উত্তর' : 'Evidence-Grounded Answer'}
              </h2>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {selectedDocIds.length > 0 ? `Using ${selectedDocIds.length} uploaded source(s)` : 'Web search requested'}
            </span>
          </div>

          {/* Answer Body */}
          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
            {researchResult.answer}
          </div>

          {/* Source citations returned by the server's quote-validation step */}
          {researchResult.citedPassages && researchResult.citedPassages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'bn' ? 'যাচাইকৃত source উদ্ধৃতি' : 'Quote-checked source citations'}</span>
              </h3>

              <div className="space-y-2.5">
                {researchResult.citedPassages.map((cite: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-blue-900 font-semibold">
                      <span>
                        [Citation {i + 1}] Source #{cite.sourceNumber}
                      </span>
                      <span className="text-[11px] text-blue-700">
                        {rT.pageLabel} {cite.page || 1}
                      </span>
                    </div>
                    <p className="text-slate-700 italic bg-white/70 p-2 rounded-lg border border-blue-200/50">
                      "{cite.quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplementary Medical Search Literature Grounding */}
          {researchResult.medicalSearchInsights && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>AI search-grounded context · Verify original sources</span>
              </span>
              <p className="text-slate-600 leading-relaxed">
                {researchResult.medicalSearchInsights}
              </p>
            </div>
          )}

          {/* Educational Boundary Guarantee */}
          <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Quoted document citations shown above are checked against the selected text. AI summaries can still be incomplete or incorrect; confirm important health information with a qualified clinician.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

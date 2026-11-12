import React, { useState } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Download,
  Share2,
  ChevronRight,
  BookOpen,
  Save,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { Language, MindMapData, StudyResource } from '../types';
import { parseMindMap } from '../utils/mindMap';
import { TRANSLATIONS } from '../lib/translations';
import { authenticatedApiFetch } from '../lib/firebase';

interface MindMapViewProps {
  language: Language;
  /** Saved study resources; those of type "mindmap" can be reopened here. */
  resources: StudyResource[];
  onSaveResource: (resource: StudyResource) => Promise<void>;
  onDeleteResource: (id: string) => Promise<void>;
}

const DEFAULT_MIND_MAP: MindMapData = {
  centralTopic: 'Example: Health Education Topic',
  branches: [
    { title: 'Understand the topic', subtopics: ['Key terms and definitions', 'What the source material explains'] },
    { title: 'Organize the information', subtopics: ['Main concepts', 'Supporting details and examples'] },
    { title: 'Prepare questions', subtopics: ['What remains unclear?', 'What should be confirmed with a qualified professional?'] },
    { title: 'Review and verify', subtopics: ['Check the original source', 'Confirm medical guidance with a clinician'] },
  ],
};

export const MindMapView: React.FC<MindMapViewProps> = ({ language, resources, onSaveResource, onDeleteResource }) => {
  const t = TRANSLATIONS[language];
  const [mindMap, setMindMap] = useState<MindMapData>(DEFAULT_MIND_MAP);
  const [topicInput, setTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeBranch, setActiveBranch] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedMapId, setSavedMapId] = useState<string | null>(null);
  const savedMaps = resources.filter((resource) => resource.type === 'mindmap');

  const handleSaveMap = async () => {
    setErrorMessage(null);
    setSaveStatus('saving');
    try {
      const id = savedMapId ?? `mindmap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await onSaveResource({
        id,
        userId: '',
        title: mindMap.centralTopic.slice(0, 200),
        type: 'mindmap',
        topic: (topicInput.trim() || mindMap.centralTopic).slice(0, 256),
        contentJson: JSON.stringify(mindMap),
        createdAt: new Date().toISOString(),
      });
      setSavedMapId(id);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('idle');
      setErrorMessage(error instanceof Error ? error.message : language === 'bn' ? 'মাইন্ড ম্যাপ সংরক্ষণ করা যায়নি।' : 'Could not save this mind map.');
    }
  };

  const handleOpenMap = (resource: StudyResource) => {
    const parsed = parseMindMap(resource.contentJson);
    if (!parsed) {
      setErrorMessage(language === 'bn' ? 'এই সংরক্ষিত মাইন্ড ম্যাপটি পড়া যাচ্ছে না।' : 'This saved mind map could not be read.');
      return;
    }
    setErrorMessage(null);
    setMindMap(parsed);
    setHasGenerated(true);
    setActiveBranch(null);
    setSavedMapId(resource.id);
    setSaveStatus('saved');
  };

  const handleDeleteMap = async (resource: StudyResource) => {
    const message = language === 'bn' ? 'এই সংরক্ষিত মাইন্ড ম্যাপ মুছে ফেলবেন?' : 'Delete this saved mind map?';
    if (!window.confirm(message)) return;
    try {
      await onDeleteResource(resource.id);
      if (savedMapId === resource.id) {
        setSavedMapId(null);
        setSaveStatus('idle');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : language === 'bn' ? 'মুছতে ব্যর্থ।' : 'Could not delete this mind map.');
    }
  };

  const handleGenerate = async () => {
    if (!topicInput.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const res = await authenticatedApiFetch('/api/gemini/study-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          mode: 'mindmap',
          language,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data || typeof json.data.centralTopic !== 'string' || !Array.isArray(json.data.branches)) {
        throw new Error(json.error || 'The AI response did not contain a valid mind map.');
      }
      const parsed = parseMindMap(json.data);
      if (!parsed) throw new Error('The AI response did not contain any usable mind-map branches.');
      setMindMap(parsed);
      setHasGenerated(true);
      setSavedMapId(null);
      setSaveStatus('idle');
      setActiveBranch(null);
    } catch (err) {
      console.error('Mindmap generation error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Mind map generation is unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>{language === 'bn' ? 'এআই মাইন্ড ম্যাপ জেনারেটর' : 'AI Health Mind Map'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {language === 'bn'
              ? 'মেডিকেল ডকুমেন্টের জটিল স্বাস্থ্য তথ্যকে ভিজ্যুয়াল হায়ারার্কিকাল ম্যাপে রূপান্তর করুন।'
              : 'Visualize complex medical guidelines, pathophysiologies, and clinical steps in an interactive diagram.'}
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 px-2">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Generator Prompt Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={topicInput}
          maxLength={256}
          onChange={(e) => setTopicInput(e.target.value)}
          placeholder={
            language === 'bn'
              ? 'যেকোনো স্বাস্থ্য বিষয় লিখুন (যেমন: হাইপারটেনশন ম্যানেজমেন্ট)'
              : 'Enter any clinical topic (e.g., Hypertension Care, Asthma Action Plan)...'
          }
          className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden w-full"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !topicInput.trim()}
          className="shrink-0 w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>{isGenerating ? 'Generating Map...' : 'Generate AI Mind Map'}</span>
        </button>
      </div>

      {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{errorMessage}</p>}
      {(hasGenerated || savedMaps.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          {hasGenerated && (
            <button
              type="button"
              onClick={() => void handleSaveMap()}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <Save className="h-4 w-4" />
              {saveStatus === 'saving'
                ? language === 'bn' ? 'সংরক্ষণ হচ্ছে…' : 'Saving…'
                : saveStatus === 'saved'
                  ? language === 'bn' ? 'সংরক্ষিত ✓ (আবার চাপলে হালনাগাদ)' : 'Saved ✓ (click to update)'
                  : language === 'bn' ? 'এই ম্যাপ সংরক্ষণ করুন' : 'Save this map'}
            </button>
          )}
          {savedMaps.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <FolderOpen className="h-3.5 w-3.5" />
                {language === 'bn' ? 'সংরক্ষিত' : 'Saved'}
              </span>
              {savedMaps.map((resource) => (
                <span key={resource.id} className={`inline-flex items-center overflow-hidden rounded-lg border text-xs ${savedMapId === resource.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                  <button type="button" onClick={() => handleOpenMap(resource)} className="px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                    {resource.title}
                  </button>
                  <button type="button" onClick={() => void handleDeleteMap(resource)} className="border-l border-slate-200 px-1.5 py-1 text-slate-400 hover:text-rose-600" aria-label={language === 'bn' ? 'মুছুন' : 'Delete'}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {!hasGenerated && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{language === 'bn' ? 'এটি একটি নমুনা কাঠামো, AI-তৈরি বা চিকিৎসা নির্দেশিকা নয়। Generate চাপলে আপনার বিষয় অনুযায়ী AI mind map তৈরি হবে।' : 'This is a sample structure, not AI-generated medical guidance. Generate a map for your own topic.'}</p>}

      {/* Interactive Mind Map Canvas */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-lg border border-slate-800 text-white overflow-hidden relative min-h-[500px] flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Scalable Container */}
        <div
          className="transition-transform duration-200 w-full max-w-4xl space-y-8 relative z-10"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* Central Root Node */}
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 p-1 rounded-2xl shadow-xl ring-4 ring-indigo-500/20">
              <div className="bg-slate-950 px-6 py-3.5 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
                  Central Health Concept
                </span>
                <h2 className="text-base sm:text-xl font-extrabold text-white">
                  {mindMap.centralTopic}
                </h2>
              </div>
            </div>
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {mindMap.branches.map((branch, idx) => {
              const colors = [
                'from-teal-500 to-emerald-600 border-teal-500/30 bg-teal-950/40',
                'from-blue-500 to-indigo-600 border-blue-500/30 bg-blue-950/40',
                'from-amber-500 to-orange-600 border-amber-500/30 bg-amber-950/40',
                'from-purple-500 to-pink-600 border-purple-500/30 bg-purple-950/40',
              ];
              const colorStyle = colors[idx % colors.length];

              return (
                <div
                  key={idx}
                  onClick={() => setActiveBranch(activeBranch === idx ? null : idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${colorStyle} hover:border-white/40 shadow-sm`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                      <span>{branch.title}</span>
                    </h3>
                    <ChevronRight
                      className={`w-4 h-4 text-white/70 transition-transform ${
                        activeBranch === idx ? 'rotate-90' : ''
                      }`}
                    />
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-200">
                    {branch.subtopics.map((sub, sIdx) => (
                      <li
                        key={sIdx}
                        className="flex items-start gap-2 bg-black/20 p-2 rounded-lg border border-white/5 hover:bg-black/40 transition-colors"
                      >
                        <span className="text-white/40 shrink-0">•</span>
                        <span>{sub}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

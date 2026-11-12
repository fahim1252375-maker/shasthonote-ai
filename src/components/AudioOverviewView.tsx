import React, { useEffect, useState } from 'react';
import { Headphones, Play, Pause, Volume2, Clock, BookOpen, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { authenticatedApiFetch } from '../lib/firebase';

interface AudioScript {
  title: string;
  script: string;
  keyPoints: string[];
  durationEstimate?: string;
}

interface AudioOverviewViewProps {
  language: Language;
}

export const AudioOverviewView: React.FC<AudioOverviewViewProps> = ({ language }) => {
  const [sourceText, setSourceText] = useState('');
  const [title, setTitle] = useState('Health Learning Overview');
  const [audioScript, setAudioScript] = useState<AudioScript | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      setErrorMessage(language === 'bn' ? 'প্রথমে স্বাস্থ্য-শিক্ষার টেক্সট দিন।' : 'Enter the health education text first.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);

    try {
      const response = await authenticatedApiFetch('/api/gemini/narration-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, title, language }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.script) {
        throw new Error(result.error || 'Could not generate the audio narration.');
      }

      setAudioScript({
        title: result.data.audioTitle || title,
        script: result.data.script,
        keyPoints: Array.isArray(result.data.keyPoints) ? result.data.keyPoints : [],
        durationEstimate: result.data.durationEstimate,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Audio overview service is unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = () => {
    if (!audioScript?.script) return;
    if (!('speechSynthesis' in window)) {
      setErrorMessage(language === 'bn' ? 'এই ব্রাউজারে speech playback সমর্থিত নয়।' : 'Speech playback is not supported in this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(audioScript.script);
    utterance.rate = playbackSpeed;
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Headphones className="w-6 h-6 text-teal-600" />
          <span>{language === 'bn' ? 'এআই অডিও ওভারভিউ' : 'AI Health Audio Overview'}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {language === 'bn'
            ? 'Gemini একটি শিক্ষামূলক narration script তৈরি করে; আপনার ব্রাউজারের speech engine সেটি পড়ে শোনায়।'
            : 'Gemini drafts an educational narration script; your browser’s speech engine reads it aloud.'}
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="w-4 h-4 text-teal-600" />
          {language === 'bn' ? 'শিক্ষামূলক বিষয়বস্তু' : 'Source material'}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">{language === 'bn' ? 'শিরোনাম' : 'Title'}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">{language === 'bn' ? 'স্বাস্থ্য-শিক্ষার টেক্সট' : 'Health education text'}</span>
          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            rows={5}
            maxLength={10000}
            placeholder={language === 'bn' ? 'এখানে গাইডলাইন বা শিক্ষামূলক লেখা paste করুন…' : 'Paste guideline or educational text here…'}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white resize-y"
          />
          <span className="text-[11px] text-slate-500">{sourceText.length.toLocaleString()} / 10,000</span>
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !sourceText.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? (language === 'bn' ? 'তৈরি হচ্ছে…' : 'Generating…') : (language === 'bn' ? 'Narration তৈরি করুন' : 'Generate narration')}
        </button>
        {errorMessage && <p role="alert" className="text-xs text-rose-700">{errorMessage}</p>}
      </section>

      {audioScript && (
        <>
          <section className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-teal-200">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                {language === 'bn' ? 'শিক্ষামূলক narration' : 'Educational narration'}
              </span>
              <span className="rounded-full border border-teal-500/30 bg-teal-900/60 px-2.5 py-1">
                AI-written script · Browser voice
              </span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{audioScript.title}</h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                <Clock className="h-3.5 w-3.5" />
                {audioScript.durationEstimate || (language === 'bn' ? 'সময় টেক্সটের দৈর্ঘ্যের উপর নির্ভরশীল' : 'Duration depends on script length')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex h-12 items-center gap-2 rounded-full bg-teal-400 px-5 text-sm font-bold text-slate-950 hover:bg-teal-300"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {isPlaying ? (language === 'bn' ? 'থামান' : 'Stop') : (language === 'bn' ? 'শুনুন' : 'Listen')}
              </button>
              <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 p-1">
                {[0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${playbackSpeed === speed ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
              <BookOpen className="h-4 w-4 text-teal-600" />
              {language === 'bn' ? 'Narration transcript' : 'Narration transcript'}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{audioScript.script}</p>
            {audioScript.keyPoints.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <h4 className="mb-2 text-xs font-bold text-slate-800">{language === 'bn' ? 'মূল বিষয়' : 'Key points'}</h4>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                  {audioScript.keyPoints.map((point, index) => <li key={index}>{point}</li>)}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

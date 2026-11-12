import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Mic,
  Square,
  Play,
  Pause,
  Sparkles,
  Save,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Pill,
  ShieldAlert,
  ArrowRight,
  Download,
  RotateCcw,
} from 'lucide-react';
import { HealthNote, Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { authenticatedApiFetch } from '../lib/firebase';
import { detectMissingClinicalInfo } from '../utils/healthCalculators';
import { RedFlagBanner } from './RedFlagBanner';

interface NoteCreatorViewProps {
  language: Language;
  initialNote?: HealthNote | null;
  onSaveNote: (note: HealthNote) => Promise<void> | void;
  onNavigateToExport: (note: HealthNote) => void;
}

export const NoteCreatorView: React.FC<NoteCreatorViewProps> = ({
  language,
  initialNote,
  onSaveNote,
  onNavigateToExport,
}) => {
  const t = TRANSLATIONS[language];
  const formT = t.noteCreator.form;
  const voiceT = t.noteCreator.voice;
  const outT = t.noteCreator.output;

  // Form State
  const [id, setId] = useState(initialNote?.id || `note-${Date.now()}`);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [noteLanguage, setNoteLanguage] = useState<'bn' | 'en' | 'mixed'>(
    initialNote?.language || (language === 'bn' ? 'bn' : 'en')
  );
  const [chiefComplaint, setChiefComplaint] = useState(initialNote?.chiefComplaint || '');
  const [patientDescription, setPatientDescription] = useState(
    initialNote?.patientDescription || ''
  );
  const [onsetDate, setOnsetDate] = useState(initialNote?.onsetDate || '');
  const [duration, setDuration] = useState(initialNote?.duration || '');
  const [symptoms, setSymptoms] = useState(initialNote?.symptoms || '');
  const [reportedMedicalHistory, setReportedMedicalHistory] = useState(
    initialNote?.reportedMedicalHistory || ''
  );
  const [existingMedications, setExistingMedications] = useState(
    initialNote?.existingMedications || ''
  );
  const [allergies, setAllergies] = useState(initialNote?.allergies || '');
  const [questionsForDoctor, setQuestionsForDoctor] = useState(
    initialNote?.questionsForDoctor || ''
  );

  // AI Generated Outputs
  const [doctorBrief, setDoctorBrief] = useState(initialNote?.doctorBrief || '');
  const [patientSummary, setPatientSummary] = useState(initialNote?.patientSummary || '');
  const [missingFlags, setMissingFlags] = useState<string[]>(
    initialNote?.missingInformationFlags || []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (initialNote) {
      setId(initialNote.id);
      setTitle(initialNote.title);
      setNoteLanguage(initialNote.language);
      setChiefComplaint(initialNote.chiefComplaint);
      setPatientDescription(initialNote.patientDescription);
      setOnsetDate(initialNote.onsetDate || '');
      setDuration(initialNote.duration || '');
      setSymptoms(initialNote.symptoms || '');
      setReportedMedicalHistory(initialNote.reportedMedicalHistory || '');
      setExistingMedications(initialNote.existingMedications || '');
      setAllergies(initialNote.allergies || '');
      setQuestionsForDoctor(initialNote.questionsForDoctor || '');
      setDoctorBrief(initialNote.doctorBrief || '');
      setPatientSummary(initialNote.patientSummary || '');
      setMissingFlags(initialNote.missingInformationFlags || []);
    }
  }, [initialNote]);

  // Audio Recording Handlers
  const startRecording = async () => {
    setTranscriptionError(null);
    audioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Audio recording is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const mediaRecorder = new MediaRecorder(stream, supportedMimeType ? { mimeType: supportedMimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = (mediaRecorder.mimeType || 'audio/webm').split(';')[0];
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return blobUrl;
        });

        // Release the microphone before uploading the recording for transcription.
        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed:', err);
      setTranscriptionError(
        err instanceof Error && err.message === 'Audio recording is not supported in this browser.'
          ? err.message
          : language === 'bn'
            ? 'মাইক্রোফোনের অনুমতি পাওয়া যায়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে অনুমতি দিন।'
            : 'Could not access microphone. Please allow microphone permissions in your browser.'
      );
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      recorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudioBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read the recorded audio.'));
        reader.readAsDataURL(blob);
      });
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) throw new Error('Recorded audio was empty.');

      const response = await authenticatedApiFetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: blob.type || 'audio/webm',
          languageHint: noteLanguage,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.transcript) {
        throw new Error(data.error || 'Transcription was unavailable.');
      }

      setPatientDescription((previous) =>
        previous ? `${previous}\n\n[Voice Note]: ${data.transcript}` : data.transcript,
      );
      if (!chiefComplaint) setChiefComplaint(data.transcript.slice(0, 150));
      if (!title) {
        setTitle(language === 'bn' ? 'ভয়েস পরামর্শ নোট' : 'Voice Dictated Consultation Note');
      }
    } catch (error) {
      console.error('Transcription call error:', error);
      setTranscriptionError(
        error instanceof Error ? error.message : 'Failed to communicate with transcription service.',
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // Generate AI summaries through the authenticated server endpoint
  const handleGenerateAISummaries = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await authenticatedApiFetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          chiefComplaint,
          patientDescription,
          onsetDate,
          duration,
          symptoms,
          reportedMedicalHistory,
          existingMedications,
          allergies,
          questionsForDoctor,
          targetLanguage: language,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'AI summary could not be generated.');
      }

      setDoctorBrief(json.data.doctorBrief || '');
      setPatientSummary(json.data.patientSummary || '');
      setMissingFlags(Array.isArray(json.data.missingInformation) ? json.data.missingInformation : []);
      if (Array.isArray(json.data.suggestedQuestions) && !questionsForDoctor) {
        setQuestionsForDoctor(json.data.suggestedQuestions.join('\n'));
      }
    } catch (error) {
      console.error('Summarize error:', error);
      setGenerationError(error instanceof Error ? error.message : 'AI summary service is unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Missing info check from pure utility
  const localMissing = detectMissingClinicalInfo({
    onsetDate,
    duration,
    allergies,
    existingMedications,
    questionsForDoctor,
  });

  const handleSave = async (): Promise<HealthNote | null> => {
    const noteToSave: HealthNote = {
      id,
      userId: 'guest-patient-shastho-01',
      title: title || (language === 'bn' ? 'স্বাস্থ্য পরামর্শ নোট' : 'Consultation Note'),
      language: noteLanguage,
      chiefComplaint,
      patientDescription,
      onsetDate,
      duration,
      symptoms,
      reportedMedicalHistory,
      existingMedications,
      allergies,
      questionsForDoctor,
      doctorBrief,
      patientSummary,
      missingInformationFlags: missingFlags,
      status: 'ready',
      createdAt: initialNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaveError(null);
    try {
      await onSaveNote(noteToSave);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      return noteToSave;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this note.');
      return null;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            <span>{t.noteCreator.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.noteCreator.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? (language === 'bn' ? 'সংরক্ষিত!' : 'Saved!') : t.common.save}</span>
          </button>

          {saveError && <p role="alert" className="text-xs text-rose-700">{saveError}</p>}

          {doctorBrief && (
            <button
              type="button"
              onClick={async () => {
                const savedNote = await handleSave();
                if (savedNote) onNavigateToExport(savedNote);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>{t.common.exportPdf}</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice-to-Text Recording Panel (Module C) */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-slate-50 rounded-2xl p-5 border border-teal-200/70 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-200'
                  : 'bg-teal-600 text-white shadow-xs'
              }`}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {voiceT.recordTitle}
              </h3>
              <p className="text-xs text-slate-600">
                {isRecording
                  ? `${voiceT.recordingActive} (${recordingSeconds}s)`
                  : isTranscribing
                  ? voiceT.transcribing
                  : language === 'bn'
                  ? 'মুখে বাংলায় বা ইংরেজিতে লক্ষণ বলুন — এআই মডেল কথাগুলো টেক্সটে রূপান্তর করবে'
                  : 'Speak your symptoms in Bangla or English — transcribed by the configured AI model'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isTranscribing}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>{voiceT.startRecord}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-sm animate-pulse cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>{voiceT.stopRecord}</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Playback if available */}
        {audioBlobUrl && !isRecording && (
          <div className="mt-4 pt-3 border-t border-teal-200/60 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">
              {voiceT.audioPlayback}:
            </span>
            <audio controls src={audioBlobUrl} className="h-8 max-w-sm" />
          </div>
        )}

        {transcriptionError && (
          <p className="mt-2 text-xs text-rose-600 font-medium">
            {transcriptionError}
          </p>
        )}
      </div>

      {/* Main Two-Column Layout: Input Form vs AI Generated Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Patient Structured Input */}
        <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'bn' ? '১. রোগীর বর্ণনা ও তথ্য প্রদান' : '1. Patient-Reported Information'}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>{language === 'bn' ? 'ভাষা:' : 'Lang:'}</span>
              <select
                value={noteLanguage}
                onChange={(e) => setNoteLanguage(e.target.value as any)}
                aria-label="Note Language"
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5"
              >
                <option value="bn">বাংলা (Bengali)</option>
                <option value="en">English</option>
                <option value="mixed">Mixed (বাংলা + EN)</option>
              </select>
            </div>
          </div>

          {/* Live, on-device warning-sign check (nothing is sent to a server) */}
          <RedFlagBanner
            language={language}
            text={[chiefComplaint, patientDescription, symptoms].join('\n')}
          />

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {formT.title} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              maxLength={256}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={formT.titlePlaceholder}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all"
            />
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {formT.chiefComplaint}
            </label>
            <input
              type="text"
              value={chiefComplaint}
              maxLength={2000}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder={formT.chiefComplaintPlaceholder}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all"
            />
          </div>

          {/* Patient Narrative Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {formT.patientDescription}
            </label>
            <textarea
              rows={4}
              maxLength={50000}
              value={patientDescription}
              onChange={(e) => setPatientDescription(e.target.value)}
              placeholder={formT.patientDescriptionPlaceholder}
              className="w-full text-xs sm:text-sm px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all resize-y"
            />
          </div>

          {/* Onset & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formT.onsetDate}
              </label>
              <input
                type="text"
                maxLength={256}
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
                placeholder={formT.onsetDatePlaceholder}
                className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formT.duration}
              </label>
              <input
                type="text"
                maxLength={256}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder={formT.durationPlaceholder}
                className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Current Medications & Allergies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Pill className="w-3.5 h-3.5 text-teal-600" />
                <span>{formT.medications}</span>
              </label>
              <input
                type="text"
                maxLength={10000}
                value={existingMedications}
                onChange={(e) => setExistingMedications(e.target.value)}
                placeholder={formT.medicationsPlaceholder}
                className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>{formT.allergies}</span>
              </label>
              <input
                type="text"
                maxLength={5000}
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder={formT.allergiesPlaceholder}
                className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Questions for Doctor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>{formT.questions}</span>
            </label>
            <textarea
              rows={2}
              maxLength={10000}
              value={questionsForDoctor}
              onChange={(e) => setQuestionsForDoctor(e.target.value)}
              placeholder={formT.questionsPlaceholder}
              className="w-full text-xs px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition-all resize-y"
            />
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerateAISummaries}
              disabled={isGenerating || (!chiefComplaint && !patientDescription)}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-200" />
              <span>
                {isGenerating
                  ? t.noteCreator.aiActions.generating
                  : t.noteCreator.aiActions.generateBrief}
              </span>
            </button>
            {generationError && (
              <p role="alert" className="mt-2 text-xs text-rose-700">{generationError}</p>
            )}
          </div>
        </div>

        {/* Right Column: AI Structured Consultation Brief & Missing Details */}
        <div className="space-y-4">
          {/* Missing Information Detector (Feature 7) */}
          {localMissing.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{outT.missingFlags} ({localMissing.length})</span>
              </div>
              <p className="text-xs text-amber-800/90 mb-3">
                {outT.missingNotice}
              </p>
              <div className="space-y-2">
                {localMissing.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white/90 rounded-xl border border-amber-200/80 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {language === 'bn' ? item.fieldBn : item.field}
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        {language === 'bn' ? item.messageBn : item.message}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor Brief Output Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {outT.doctorBrief}
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                AI-assisted
              </span>
            </div>

            {doctorBrief ? (
              <pre className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl whitespace-pre-wrap font-sans leading-relaxed border border-slate-200/70">
                {doctorBrief}
              </pre>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                {language === 'bn'
                  ? 'বামে তথ্য লিখে "এআই ডক্টরস ব্রিফ তৈরি করুন"-এ ক্লিক করুন।'
                  : 'Enter symptoms on the left and click "Generate AI Doctor Brief".'}
              </div>
            )}
          </div>

          {/* Patient-Friendly Summary Output Card */}
          {patientSummary && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {outT.patientSummary}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-cyan-50/40 p-3.5 rounded-xl border border-cyan-100">
                {patientSummary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

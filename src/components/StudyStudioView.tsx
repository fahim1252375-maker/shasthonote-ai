import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  Layers,
  FileText,
} from 'lucide-react';
import { Language, Flashcard, QuizQuestion, StudyResource } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { authenticatedApiFetch } from '../lib/firebase';
import { INITIAL_STUDY_RESOURCES } from '../data/mockData';

interface StudyStudioViewProps {
  language: Language;
  resources: StudyResource[];
  onSaveResource: (resource: StudyResource) => Promise<void> | void;
}

export const StudyStudioView: React.FC<StudyStudioViewProps> = ({ language, resources, onSaveResource }) => {
  const t = TRANSLATIONS[language];
  const sT = t.studyStudio;

  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz' | 'guide'>('flashcards');

  // Load sample flashcards & quiz
  const sampleDeck = JSON.parse(INITIAL_STUDY_RESOURCES[0].contentJson).flashcards as Flashcard[];
  const sampleQuiz = JSON.parse(INITIAL_STUDY_RESOURCES[1].contentJson).questions as QuizQuestion[];

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>(sampleDeck);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(sampleQuiz);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // New Generation
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedGuide, setGeneratedGuide] = useState<any>(null);
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Flashcard Handlers
  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Quiz Handlers
  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === quizQuestions[currentQuestionIndex].correctIndex) {
      setQuizScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < quizQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  const currentCard = flashcards[currentCardIndex] || flashcards[0];
  const currentQ = quizQuestions[currentQuestionIndex] || quizQuestions[0];

  const handleGenerateStudySet = async () => {
    if (!topic.trim()) {
      setGenerationError(language === 'bn' ? 'একটি বিষয় লিখুন।' : 'Enter a topic first.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const mode = activeTab === 'guide' ? 'study_guide' : activeTab;
      const response = await authenticatedApiFetch('/api/gemini/study-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, documentText: sourceText, mode, language }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Study material could not be generated.');
      }

      if (mode === 'flashcards') {
        if (!Array.isArray(result.data.flashcards) || result.data.flashcards.length === 0) {
          throw new Error('The AI response did not contain usable flashcards.');
        }
        setFlashcards(result.data.flashcards);
        setFlashcardsGenerated(true);
        setSaveMessage(null);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setMasteredIds([]);
      } else if (mode === 'quiz') {
        if (!Array.isArray(result.data.questions) || result.data.questions.length === 0) {
          throw new Error('The AI response did not contain usable quiz questions.');
        }
        setQuizQuestions(result.data.questions);
        setQuizGenerated(true);
        setSaveMessage(null);
        handleResetQuiz();
      } else {
        setGeneratedGuide(result.data);
        setSaveMessage(null);
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Study generation service is unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCurrentResource = async () => {
    setSaveError(null);
    setSaveMessage(null);
    const type: StudyResource['type'] = activeTab === 'guide' ? 'study_guide' : activeTab;
    const fallbackTitle = activeTab === 'guide' ? 'Sample Study Guide' : activeTab === 'quiz' ? 'Sample Quiz' : 'Sample Flashcards';
    const resourceTopic = topic.trim() || fallbackTitle;
    const content = activeTab === 'guide'
      ? generatedGuide || { title: fallbackTitle, sample: true }
      : activeTab === 'quiz'
        ? { questions: quizQuestions, sample: !quizGenerated }
        : { flashcards, sample: !flashcardsGenerated };
    const contentJson = JSON.stringify(content);
    if (contentJson.length > 95_000) {
      setSaveError(language === 'bn' ? 'এই study set অনেক বড়। সংক্ষিপ্ত করে আবার চেষ্টা করুন।' : 'This study set is too large to save. Shorten it and try again.');
      return;
    }

    const resource: StudyResource = {
      id: `study-${Date.now()}`,
      userId: 'guest-patient-shastho-01',
      title: resourceTopic.slice(0, 256),
      type,
      topic: resourceTopic.slice(0, 256),
      contentJson,
      createdAt: new Date().toISOString(),
    };
    try {
      await onSaveResource(resource);
      setSaveMessage(language === 'bn' ? 'Study set সংরক্ষণ হয়েছে।' : 'Study set saved to your library.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this study set.');
    }
  };

  const handleLoadResource = (resource: StudyResource) => {
    try {
      const content = JSON.parse(resource.contentJson);
      setTopic(resource.topic || resource.title);
      if (resource.type === 'flashcards' && Array.isArray(content.flashcards)) {
        setFlashcards(content.flashcards);
        setFlashcardsGenerated(!content.sample);
        setCurrentCardIndex(0);
        setActiveTab('flashcards');
        setIsFlipped(false);
        setMasteredIds([]);
      } else if (resource.type === 'quiz' && Array.isArray(content.questions)) {
        setQuizQuestions(content.questions);
        setQuizGenerated(!content.sample);
        setActiveTab('quiz');
        handleResetQuiz();
      } else if (resource.type === 'study_guide') {
        setGeneratedGuide(content);
        setActiveTab('guide');
      }
      setSaveError(null);
      setSaveMessage(null);
    } catch {
      setSaveError(language === 'bn' ? 'সংরক্ষিত study set খোলা যায়নি।' : 'This saved study set could not be opened.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <span>{sT.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {sT.subtitle}
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'flashcards'
              ? 'bg-purple-50 text-purple-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-600" />
          <span>{sT.tabs.flashcards}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'quiz'
              ? 'bg-purple-50 text-purple-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-purple-600" />
          <span>{sT.tabs.quiz}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'guide'
              ? 'bg-purple-50 text-purple-800 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>{sT.tabs.guide}</span>
        </button>
      </div>

      <section className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="h-4 w-4 text-purple-600" />
          {language === 'bn' ? 'নিজের AI study set তৈরি করুন' : 'Generate your own AI study set'}
        </div>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          maxLength={256}
          placeholder={language === 'bn' ? 'বিষয়: যেমন Human Cardiovascular System' : 'Topic, e.g. Human Cardiovascular System'}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
        />
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={3}
          maxLength={100000}
          placeholder={language === 'bn' ? 'ঐচ্ছিক: নিজের নোট বা source text paste করুন…' : 'Optional: paste your notes or source text…'}
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
        />
        <button
          type="button"
          onClick={handleGenerateStudySet}
          disabled={isGenerating || !topic.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:bg-slate-300"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? (language === 'bn' ? 'তৈরি হচ্ছে…' : 'Generating…') : (language === 'bn' ? 'বর্তমান ট্যাবের জন্য তৈরি করুন' : `Generate ${activeTab === 'guide' ? 'study guide' : activeTab}`)}
        </button>
        {generationError && <p role="alert" className="text-xs text-rose-700">{generationError}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSaveCurrentResource} className="rounded-xl border border-purple-200 px-4 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-50">{language === 'bn' ? 'বর্তমান সেট সংরক্ষণ' : 'Save current study set'}</button>
          {saveMessage && <span role="status" className="text-xs text-emerald-700">{saveMessage}</span>}
          {saveError && <span role="alert" className="text-xs text-rose-700">{saveError}</span>}
        </div>
        <p className="text-[11px] text-slate-500">{language === 'bn' ? 'AI দিয়ে তৈরি তথ্য পড়াশোনার সহায়ক; clinical decision-এর বিকল্প নয়। Guest mode-এ এটি শুধু এই browser-এ সংরক্ষিত হয়।' : 'AI-generated material is for learning support, not clinical decision-making. Guest-mode saves stay in this browser only.'}</p>
      </section>

      {resources.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">{language === 'bn' ? 'সংরক্ষিত Study Library' : 'Saved Study Library'}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{resource.title}</p>
                  <p className="text-[11px] text-slate-500">{resource.type.replace('_', ' ')} · {new Date(resource.createdAt).toLocaleDateString()}</p>
                </div>
                <button type="button" onClick={() => handleLoadResource(resource)} className="shrink-0 rounded-lg bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-100">{language === 'bn' ? 'খুলুন' : 'Open'}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FLASHCARDS VIEW */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {!flashcardsGenerated && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{language === 'bn' ? 'এগুলো নমুনা flashcards; AI দিয়ে তৈরি নয়।' : 'Sample flashcards — not AI-generated.'}</p>}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Card {currentCardIndex + 1} of {flashcards.length}
            </span>
            <span className="font-semibold text-purple-700">
              {masteredIds.length} Mastered
            </span>
          </div>

          {/* Interactive Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[300px] sm:min-h-[340px] bg-white rounded-3xl border-2 border-slate-200/90 shadow-md p-8 flex flex-col justify-between hover:border-purple-400 transition-all text-center relative overflow-hidden group select-none"
          >
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold uppercase tracking-wider text-purple-600">
                {isFlipped ? 'Answer & Explanation' : 'Concept / Question'}
              </span>
              <span className="text-[11px] text-slate-600 group-hover:text-purple-600 font-medium">
                {sT.flipHint}
              </span>
            </div>

            <div className="py-6 flex items-center justify-center flex-1">
              {!isFlipped ? (
                <p className="text-base sm:text-xl font-bold text-slate-900 max-w-xl leading-relaxed">
                  {currentCard.front}
                </p>
              ) : (
                <div className="space-y-3 max-w-xl text-left">
                  <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
                    {currentCard.back}
                  </p>
                  {currentCard.clinicalSignificance && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/80 text-xs text-purple-900">
                      <span className="font-bold block">Clinical Significance:</span>
                      {currentCard.clinicalSignificance}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMastered(currentCard.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  masteredIds.includes(currentCard.id)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {masteredIds.includes(currentCard.id) ? 'Mastered' : 'Mark as Mastered'}
                </span>
              </button>

              <span className="text-xs text-slate-600 font-medium">Click to flip 🔄</span>
            </div>
          </div>

          {/* Flashcard Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevCard}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{sT.prevCard}</span>
            </button>
            <button
              type="button"
              onClick={handleNextCard}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
            >
              <span>{sT.nextCard}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* QUIZ VIEW */}
      {activeTab === 'quiz' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          {!quizGenerated && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{language === 'bn' ? 'এটি একটি নমুনা quiz; AI দিয়ে তৈরি নয়।' : 'Sample quiz — not AI-generated.'}</p>}
          {!quizCompleted ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  Question {currentQuestionIndex + 1} of {quizQuestions.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {sT.score}: {quizScore}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQ.question}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((opt, idx) => {
                  let optionStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700';

                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold ring-1 ring-emerald-400';
                    } else if (idx === selectedOption) {
                      optionStyle = 'bg-rose-50 border-rose-400 text-rose-900';
                    }
                  } else if (selectedOption === idx) {
                    optionStyle = 'bg-purple-50 border-purple-500 text-purple-900 font-semibold ring-1 ring-purple-400';
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`p-4 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswerSubmitted && idx === currentQ.correctIndex && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {isAnswerSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feedback and Explanation */}
              {isAnswerSubmitted && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Clinical Evidence & Rationale:</span>
                  <p className="text-slate-700 leading-relaxed">{currentQ.explanation}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                {!isAnswerSubmitted ? (
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
                  >
                    <span>
                      {currentQuestionIndex + 1 < quizQuestions.length ? 'Next Question' : 'View Results'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Award className="w-12 h-12 text-purple-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">Quiz Completed!</h2>
              <p className="text-sm text-slate-600">
                You scored <span className="font-bold text-purple-700">{quizScore}</span> out of{' '}
                <span className="font-bold">{quizQuestions.length}</span> (
                {Math.round((quizScore / quizQuestions.length) * 100)}%)
              </p>
              <button
                type="button"
                onClick={handleResetQuiz}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Quiz</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* STUDY GUIDE VIEW */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          {generatedGuide ? (
            <>
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">{generatedGuide.title || topic}</h2>
                <p className="text-xs text-slate-500 mt-1">AI-generated study guide · Review against your source material</p>
              </div>
              <div className="space-y-4">
                {(generatedGuide.keyConcepts || []).map((item: any, index: number) => (
                  <div key={index} className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                    <h3 className="mb-1 text-sm font-bold text-purple-900">{item.concept}</h3>
                    <p className="text-xs leading-relaxed text-slate-700">{item.explanation}</p>
                  </div>
                ))}
                {(generatedGuide.clinicalTakeaways || []).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-900">Key takeaways</h3>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                      {generatedGuide.clinicalTakeaways.map((item: string, index: number) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {(generatedGuide.reviewQuestions || []).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-900">Review questions</h3>
                    <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-700">
                      {generatedGuide.reviewQuestions.map((item: string, index: number) => <li key={index}>{item}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">Sample Study Guide: Type 2 Diabetes</h2>
                <p className="text-xs text-slate-500 mt-1">Synthetic educational demo content · Not personalized medical advice</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">This sample explains common topics discussed in diabetes education. Individual targets and monitoring plans vary by patient and must be confirmed with a qualified healthcare professional.</p>
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <h3 className="mb-1 text-sm font-bold text-purple-900">Glycemic targets</h3>
                <p className="text-xs text-slate-700">HbA1c targets are individualized according to age, health status, treatment risks, and clinician guidance. Do not use a single target as a personal treatment goal.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <h3 className="mb-1 text-sm font-bold text-blue-900">Complication screening</h3>
                <p className="text-xs text-slate-700">Routine eye, kidney, and foot assessments can help clinicians identify complications. Ask your healthcare professional which checks and schedule apply to you.</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <h3 className="mb-1 text-sm font-bold text-emerald-900">Lifestyle and follow-up</h3>
                <p className="text-xs text-slate-700">Nutrition, physical activity, sleep, and follow-up planning should be tailored to individual needs and medical advice.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

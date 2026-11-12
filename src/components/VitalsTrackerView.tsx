import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Download,
  Droplet,
  HeartPulse,
  Minus,
  Plus,
  Scale,
  Thermometer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import type { Language, VitalContext, VitalReading, VitalType } from '../types';
import { downloadTextFile } from '../lib/download';
import { toAsciiDigits } from '../utils/labTrends';
import {
  assessVital,
  filterByDays,
  normalizedUnit,
  normalizedValue,
  sortByMeasuredAt,
  summarizeVitals,
  validateVitalInput,
  VITAL_CONTEXTS,
  VITAL_TYPES,
  VITAL_UNITS,
  vitalsToCsv,
  type VitalLevel,
  type VitalSummary,
} from '../utils/vitals';
import { VITAL_LABELS } from '../utils/visitPack';
import { TrendChart, type TrendSeries } from './TrendChart';

interface VitalsTrackerViewProps {
  language: Language;
  vitals: VitalReading[];
  onSave: (reading: VitalReading) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_ICONS: Record<VitalType, React.ComponentType<{ className?: string }>> = {
  blood_pressure: HeartPulse,
  blood_glucose: Droplet,
  weight: Scale,
  temperature: Thermometer,
  heart_rate: Activity,
  spo2: Wind,
};

const CONTEXT_LABELS: Record<VitalContext, { en: string; bn: string }> = {
  fasting: { en: 'Fasting', bn: 'ফাস্টিং' },
  after_meal: { en: 'After meal (2 h)', bn: 'খাবারের ২ ঘণ্টা পরে' },
  random: { en: 'Random', bn: 'যেকোনো সময়' },
  resting: { en: 'Resting', bn: 'বিশ্রামে' },
  after_activity: { en: 'After activity', bn: 'কার্যকলাপের পরে' },
};

const LEVEL_STYLES: Record<VitalLevel, string> = {
  normal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  watch: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-sky-50 text-sky-800 border-sky-200',
  high: 'bg-orange-50 text-orange-800 border-orange-200',
  urgent: 'bg-rose-50 text-rose-800 border-rose-300',
};

const RANGES: Array<{ days: number | null; en: string; bn: string }> = [
  { days: 7, en: '7 days', bn: '৭ দিন' },
  { days: 30, en: '30 days', bn: '৩০ দিন' },
  { days: 90, en: '90 days', bn: '৯০ দিন' },
  { days: null, en: 'All', bn: 'সব' },
];

const pad2 = (value: number) => String(value).padStart(2, '0');
const toLocalInput = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const defaultContext = (type: VitalType): VitalContext | '' => VITAL_CONTEXTS[type]?.[0] ?? '';

const inputClass =
  'w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden';

export const VitalsTrackerView: React.FC<VitalsTrackerViewProps> = ({ language, vitals, onSave, onDelete }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';

  const [type, setType] = useState<VitalType>('blood_pressure');
  const [rangeDays, setRangeDays] = useState<number | null>(30);
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [unit, setUnit] = useState(VITAL_UNITS.blood_pressure[0]);
  const [context, setContext] = useState<VitalContext | ''>('');
  const [measuredAt, setMeasuredAt] = useState(() => toLocalInput(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseType = (next: VitalType) => {
    setType(next);
    setUnit(VITAL_UNITS[next][0]);
    setContext(defaultContext(next));
    setValue('');
    setValue2('');
    setError(null);
  };

  const ofType = useMemo<VitalReading[]>(() => sortByMeasuredAt(vitals.filter((reading) => reading.type === type)), [vitals, type]);
  const inRange = useMemo<VitalReading[]>(() => filterByDays(ofType, rangeDays), [ofType, rangeDays]);
  const summary = useMemo<VitalSummary>(() => summarizeVitals(inRange), [inRange]);
  const latestAssessment = summary.latest ? assessVital(summary.latest) : null;

  const chartPoints = inRange.slice(-60);
  const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const series: TrendSeries[] =
    type === 'blood_pressure'
      ? [
          { label: tr('Systolic', 'সিস্টোলিক'), color: '#0d9488', values: chartPoints.map((reading) => reading.value) },
          {
            label: tr('Diastolic', 'ডায়াস্টোলিক'),
            color: '#6366f1',
            values: chartPoints.map((reading) => reading.value2 ?? reading.value),
          },
        ]
      : [{ label: tr(VITAL_LABELS[type].en, VITAL_LABELS[type].bn), color: '#0d9488', values: chartPoints.map(normalizedValue) }];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const numeric = Number(toAsciiDigits(value).trim());
    const numeric2 = type === 'blood_pressure' ? Number(toAsciiDigits(value2).trim()) : undefined;
    const validation = validateVitalInput(type, numeric, numeric2, unit);
    if (!validation.ok) {
      setError(language === 'bn' ? (validation.messageBn ?? '') : (validation.messageEn ?? ''));
      return;
    }

    const when = new Date(measuredAt);
    if (Number.isNaN(when.getTime())) {
      setError(tr('Enter a valid date and time.', 'সঠিক তারিখ ও সময় দিন।'));
      return;
    }
    if (when.getTime() > Date.now() + 5 * 60 * 1000) {
      setError(tr('The measurement time cannot be in the future.', 'মাপার সময় ভবিষ্যতের হতে পারে না।'));
      return;
    }

    const now = new Date().toISOString();
    const reading: VitalReading = {
      id: `vital-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: '',
      type,
      value: numeric,
      unit,
      measuredAt: when.toISOString(),
      createdAt: now,
      ...(numeric2 !== undefined ? { value2: numeric2 } : {}),
      ...(context ? { context } : {}),
      ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}),
    };

    setSaving(true);
    try {
      await onSave(reading);
      setValue('');
      setValue2('');
      setNote('');
      setMeasuredAt(toLocalInput(new Date()));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : tr('Could not save this reading.', 'মাপটি সংরক্ষণ করা যায়নি।'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(tr('Delete this reading?', 'এই মাপটি মুছে ফেলবেন?'))) return;
    try {
      await onDelete(id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tr('Could not delete this reading.', 'মাপটি মোছা যায়নি।'));
    }
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `shasthonote-${type}-${stamp}.csv`,
      vitalsToCsv(ofType),
      'text/csv;charset=utf-8',
    );
  };

  const formatReading = (reading: VitalReading) =>
    reading.type === 'blood_pressure' && reading.value2 !== undefined
      ? `${reading.value}/${reading.value2} ${reading.unit}`
      : `${reading.value} ${reading.unit}`;

  const TrendIcon = summary.trend === 'rising' ? TrendingUp : summary.trend === 'falling' ? TrendingDown : Minus;
  const trendText =
    summary.trend === 'rising'
      ? tr('Rising', 'বাড়ছে')
      : summary.trend === 'falling'
        ? tr('Falling', 'কমছে')
        : summary.trend === 'stable'
          ? tr('Stable', 'স্থির')
          : tr('Need 4+ readings', '৪+ মাপ দরকার');

  const recent = [...inRange].reverse().slice(0, 15);
  const contexts = VITAL_CONTEXTS[type];
  const units = VITAL_UNITS[type];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-rose-600" />
          <span>{tr('Vitals & Home Measurements', 'ভাইটালস ও বাসায় মাপা তথ্য')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {tr(
            'Log blood pressure, sugar, weight and more, see your trend, and bring it to your doctor.',
            'রক্তচাপ, সুগার, ওজন ইত্যাদি লিখে রাখুন, ট্রেন্ড দেখুন, আর ডাক্তারের কাছে নিয়ে যান।',
          )}
        </p>
      </div>

      {/* Type selector */}
      <div role="tablist" aria-label={tr('Measurement type', 'পরিমাপের ধরন')} className="flex flex-wrap gap-2">
        {VITAL_TYPES.map((item) => {
          const Icon = TYPE_ICONS[item];
          const active = item === type;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseType(item)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                active ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tr(VITAL_LABELS[item].en, VITAL_LABELS[item].bn)}</span>
            </button>
          );
        })}
      </div>

      {/* Urgent reading alert */}
      {latestAssessment?.level === 'urgent' && (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold">
              {tr('Your latest reading is in a range that needs prompt attention.', 'আপনার সর্বশেষ মাপ এমন সীমায় যেখানে দ্রুত মনোযোগ দরকার।')}
            </p>
            <p>
              {tr(
                'Recheck if you can, and contact a doctor or emergency services (999 in Bangladesh) now, especially if you feel unwell.',
                'সম্ভব হলে আবার মাপুন, এবং এখনই ডাক্তার বা জরুরি সেবার (বাংলাদেশে ৯৯৯) সাথে যোগাযোগ করুন, বিশেষ করে অসুস্থ বোধ করলে।',
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Add reading */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 self-start">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-teal-600" />
            {tr('Add a reading', 'নতুন মাপ যোগ করুন')}
          </h2>

          {type === 'blood_pressure' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="vital-value" className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('Systolic (top)', 'সিস্টোলিক (উপরের)')}
                </label>
                <input id="vital-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="120" className={inputClass} />
              </div>
              <div>
                <label htmlFor="vital-value2" className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('Diastolic (bottom)', 'ডায়াস্টোলিক (নিচের)')}
                </label>
                <input id="vital-value2" inputMode="decimal" value={value2} onChange={(e) => setValue2(e.target.value)} placeholder="80" className={inputClass} />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="vital-value" className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('Value', 'মান')}
                </label>
                <input id="vital-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
              </div>
              {units.length > 1 && (
                <div className="w-28">
                  <label htmlFor="vital-unit" className="block text-xs font-semibold text-slate-700 mb-1">
                    {tr('Unit', 'একক')}
                  </label>
                  <select id="vital-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
                    {units.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {contexts && (
            <div>
              <label htmlFor="vital-context" className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('When was it taken?', 'কখন মাপা হয়েছে?')}
              </label>
              <select id="vital-context" value={context} onChange={(e) => setContext(e.target.value as VitalContext)} className={inputClass}>
                {contexts.map((item) => (
                  <option key={item} value={item}>
                    {tr(CONTEXT_LABELS[item].en, CONTEXT_LABELS[item].bn)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="vital-time" className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Date & time', 'তারিখ ও সময়')}
            </label>
            <input id="vital-time" type="datetime-local" value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="vital-note" className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Note (optional)', 'নোট (ঐচ্ছিক)')}
            </label>
            <input id="vital-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={tr('e.g. after a walk', 'যেমন: হাঁটার পরে')} className={inputClass} />
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            {saving ? tr('Saving…', 'সংরক্ষণ হচ্ছে…') : tr('Save reading', 'মাপ সংরক্ষণ করুন')}
          </button>
        </form>

        {/* Trend + summary */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">{tr('Trend', 'ট্রেন্ড')}</h2>
              <div className="flex items-center gap-1.5">
                {RANGES.map((range) => (
                  <button
                    key={range.en}
                    type="button"
                    onClick={() => setRangeDays(range.days)}
                    aria-pressed={rangeDays === range.days}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      rangeDays === range.days ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {tr(range.en, range.bn)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={ofType.length === 0}
                  className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-700 hover:border-teal-400 disabled:opacity-40"
                  title={tr('Download CSV', 'CSV ডাউনলোড')}
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>
            </div>

            {inRange.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500">
                {tr('No readings in this period yet. Add your first one on the left.', 'এই সময়ে কোনো মাপ নেই। বামে প্রথমটি যোগ করুন।')}
              </p>
            ) : (
              <TrendChart
                series={series}
                xLabels={chartPoints.map((reading) => dateLabel(reading.measuredAt))}
                unit={normalizedUnit(type)}
                ariaLabel={tr(`${VITAL_LABELS[type].en} trend chart`, `${VITAL_LABELS[type].bn} ট্রেন্ড চার্ট`)}
              />
            )}
          </div>

          {summary.latest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('Latest', 'সর্বশেষ')}</p>
                <p className="mt-1 text-base font-bold text-slate-900">{formatReading(summary.latest)}</p>
                {latestAssessment && (
                  <span className={`mt-1 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_STYLES[latestAssessment.level]}`}>
                    {language === 'bn' ? latestAssessment.labelBn : latestAssessment.labelEn}
                  </span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('Average', 'গড়')}</p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {summary.average} <span className="text-xs font-medium text-slate-500">{normalizedUnit(type)}</span>
                </p>
                <p className="text-[10px] text-slate-500">{summary.count} {tr('readings', 'টি মাপ')}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('Range', 'পরিসর')}</p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {summary.min}–{summary.max}
                </p>
                {type === 'blood_pressure' && <p className="text-[10px] text-slate-500">{tr('systolic', 'সিস্টোলিক')}</p>}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('Trend', 'ট্রেন্ড')}</p>
                <p className="mt-1 flex items-center gap-1 text-base font-bold text-slate-900">
                  <TrendIcon className="w-4 h-4 text-teal-600" />
                  <span className="text-sm">{trendText}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent readings */}
      {recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">{tr('Recent readings', 'সাম্প্রতিক মাপ')}</div>
          <ul className="divide-y divide-slate-100">
            {recent.map((reading) => {
              const assessment = assessVital(reading);
              return (
                <li key={reading.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-xs">
                  <span className="w-36 text-slate-500">
                    {new Date(reading.measuredAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-bold text-slate-900">{formatReading(reading)}</span>
                  {reading.context && <span className="text-slate-500">{tr(CONTEXT_LABELS[reading.context].en, CONTEXT_LABELS[reading.context].bn)}</span>}
                  {assessment && (
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_STYLES[assessment.level]}`}>
                      {language === 'bn' ? assessment.labelBn : assessment.labelEn}
                    </span>
                  )}
                  {reading.note && <span className="text-slate-500 italic">{reading.note}</span>}
                  <button
                    type="button"
                    onClick={() => void handleDelete(reading.id)}
                    className="ml-auto p-1 text-slate-400 hover:text-rose-600"
                    aria-label={tr('Delete reading', 'মাপ মুছুন')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500">
        {tr(
          'Ranges shown are general reference values for context only. Your own targets come from your doctor, and a home reading is not a diagnosis.',
          'এখানে দেখানো সীমা শুধু সাধারণ রেফারেন্স। আপনার নিজের লক্ষ্যমাত্রা ডাক্তার ঠিক করেন, আর বাসায় মাপা মান রোগনির্ণয় নয়।',
        )}
      </p>
    </div>
  );
};

import React, { useMemo } from 'react';
import { ArrowRight, HeartPulse, Pill } from 'lucide-react';
import type { Appointment, Language, Medication, VitalReading } from '../types';
import { adherenceSummary, nextDose, dosesForDate, localDateKey, missedDosesToday } from '../utils/medications';
import { assessVital, summarizeVitals, VITAL_TYPES } from '../utils/vitals';
import { VITAL_LABELS } from '../utils/visitPack';

interface TodayPanelProps {
  language: Language;
  medications: Medication[];
  vitals: VitalReading[];
  appointments: Appointment[];
  onNavigate: (tab: string) => void;
}

const LEVEL_DOT: Record<string, string> = {
  normal: 'bg-emerald-500',
  watch: 'bg-amber-500',
  low: 'bg-sky-500',
  high: 'bg-orange-500',
  urgent: 'bg-rose-600',
};

/** Compact "today" summary shown above the dashboard. Shows nothing until the user has used meds or vitals. */
export const TodayPanel: React.FC<TodayPanelProps> = ({ language, medications, vitals, appointments, onNavigate }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const now = new Date();

  const doses = useMemo(() => dosesForDate(medications, localDateKey(now)), [medications]);
  const next = useMemo(() => nextDose(medications, now), [medications]);
  const missed = useMemo(() => missedDosesToday(medications, now), [medications]);
  const adherence = useMemo(() => adherenceSummary(medications, now, 7), [medications]);
  const latestVitals = useMemo(
    () =>
      VITAL_TYPES.map((type) => summarizeVitals(vitals.filter((reading) => reading.type === type)).latest).filter(
        (reading): reading is VitalReading => reading !== null,
      ),
    [vitals],
  );
  const upcoming = appointments.filter((appointment) => appointment.status === 'upcoming');

  if (medications.length === 0 && vitals.length === 0) return null;

  const takenToday = doses.filter((dose) => dose.taken).length;

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      {medications.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('medications')}
          className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition-colors hover:border-teal-300"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Pill className="h-4 w-4 text-teal-600" />
              {tr('Medicines today', 'আজকের ওষুধ')}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-600" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {doses.length === 0
              ? tr('Nothing scheduled today', 'আজ কিছু নির্ধারিত নেই')
              : tr(`${takenToday} of ${doses.length} doses taken`, `${doses.length}টির মধ্যে ${takenToday}টি ডোজ নেওয়া হয়েছে`)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {missed.length > 0
              ? tr(`${missed.length} overdue: ${missed.map((dose) => dose.medName).join(', ')}`, `${missed.length}টি বাকি: ${missed.map((dose) => dose.medName).join(', ')}`)
              : next
                ? tr(`Next: ${next.medName} at ${next.time}`, `পরেরটি: ${next.time}-এ ${next.medName}`)
                : doses.length > 0
                  ? tr('All done for today', 'আজকের সব শেষ')
                  : ''}
            {adherence.percent !== null && ` · ${tr('7-day', '৭ দিন')} ${adherence.percent}%`}
          </p>
        </button>
      )}

      {latestVitals.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('vitals')}
          className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition-colors hover:border-teal-300"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <HeartPulse className="h-4 w-4 text-rose-600" />
              {tr('Latest readings', 'সর্বশেষ মাপ')}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-600" />
          </div>
          <ul className="mt-2 space-y-1">
            {latestVitals.slice(0, 4).map((reading) => {
              const assessment = assessVital(reading);
              const value = reading.type === 'blood_pressure' && reading.value2 !== undefined ? `${reading.value}/${reading.value2}` : reading.value;
              return (
                <li key={reading.id} className="flex items-center gap-2 text-xs text-slate-700">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${assessment ? LEVEL_DOT[assessment.level] : 'bg-slate-300'}`} />
                  <span className="text-slate-500">{tr(VITAL_LABELS[reading.type].en, VITAL_LABELS[reading.type].bn)}</span>
                  <span className="ml-auto font-bold text-slate-900">
                    {value} {reading.unit}
                  </span>
                </li>
              );
            })}
          </ul>
          {upcoming.length > 0 && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              {tr(`${upcoming.length} upcoming appointment(s)`, `${upcoming.length}টি আসন্ন অ্যাপয়েন্টমেন্ট`)}
            </p>
          )}
        </button>
      )}
    </div>
  );
};

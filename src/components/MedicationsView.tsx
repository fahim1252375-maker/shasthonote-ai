import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Circle, Clock, Pill, Plus, ShieldAlert, Trash2, X } from 'lucide-react';
import type { Language, Medication } from '../types';
import {
  adherenceSummary,
  dosesDueNow,
  dosesForDate,
  isValidDateKey,
  isValidTime,
  localDateKey,
  MAX_TIMES_PER_MEDICATION,
  missedDosesToday,
  normalizeTimes,
  setDoseTaken,
} from '../utils/medications';

interface MedicationsViewProps {
  language: Language;
  medications: Medication[];
  onSave: (medication: Medication) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const REMINDER_PREF_KEY = 'shastho:meds:reminders-enabled';

const inputClass =
  'w-full text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden';

export const MedicationsView: React.FC<MedicationsViewProps> = ({ language, medications, onSave, onDelete }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);

  // Re-render every 30 s so "next dose", "missed" and adherence stay current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [remindersOn, setRemindersOn] = useState(() => {
    try {
      return localStorage.getItem(REMINDER_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationsSupported ? Notification.permission : 'unsupported',
  );

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [startDate, setStartDate] = useState(() => localDateKey(new Date()));
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = localDateKey(now);
  const todaysDoses = useMemo(() => dosesForDate(medications, today), [medications, today]);
  const adherence = useMemo(() => adherenceSummary(medications, now, 7), [medications, now]);
  const missed = useMemo(() => missedDosesToday(medications, now), [medications, now]);
  const medsById = useMemo(
    () => new Map<string, Medication>(medications.map((med): [string, Medication] => [med.id, med])),
    [medications],
  );

  // Browser notifications work only while this app/tab is open. We say so in the UI.
  const notifiedKeys = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!remindersOn || permission !== 'granted' || !notificationsSupported) return;
    for (const due of dosesDueNow(medications, now)) {
      const marker = `${due.medId}|${due.key}`;
      if (notifiedKeys.current.has(marker)) continue;
      notifiedKeys.current.add(marker);
      try {
        new Notification(tr('Medicine reminder', 'ওষুধের রিমাইন্ডার'), {
          body: `${due.medName} — ${due.dose} (${due.time})`,
          tag: marker,
        });
      } catch (error) {
        console.warn('Could not show the reminder notification:', error);
      }
    }
    // `tr` depends only on `language`; the interval-driven `now` is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, remindersOn, permission, medications]);

  const toggleReminders = async () => {
    if (!notificationsSupported) return;
    if (remindersOn) {
      setRemindersOn(false);
      try {
        localStorage.setItem(REMINDER_PREF_KEY, 'false');
      } catch {
        /* ignore */
      }
      return;
    }
    let result = Notification.permission;
    if (result === 'default') result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setRemindersOn(true);
      try {
        localStorage.setItem(REMINDER_PREF_KEY, 'true');
      } catch {
        /* ignore */
      }
    }
  };

  const updateTime = (index: number, value: string) =>
    setTimes((previous) => previous.map((item, position) => (position === index ? value : item)));

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanDose = dose.trim();
    if (!cleanName) return setFormError(tr('Enter the medicine name.', 'ওষুধের নাম লিখুন।'));
    if (!cleanDose) return setFormError(tr('Enter the dose as written on your prescription.', 'প্রেসক্রিপশনে যেভাবে লেখা, ডোজ সেভাবে লিখুন।'));
    if (times.some((time) => !isValidTime(time))) return setFormError(tr('Check the reminder times.', 'রিমাইন্ডারের সময় যাচাই করুন।'));
    const normalized = normalizeTimes(times);
    if (normalized.length === 0) return setFormError(tr('Add at least one reminder time.', 'অন্তত একটি রিমাইন্ডারের সময় দিন।'));
    if (!isValidDateKey(startDate)) return setFormError(tr('Choose a valid start date.', 'সঠিক শুরুর তারিখ দিন।'));
    if (endDate && (!isValidDateKey(endDate) || endDate < startDate)) {
      return setFormError(tr('The end date must be on or after the start date.', 'শেষের তারিখ শুরুর তারিখের পরে হতে হবে।'));
    }

    const medication: Medication = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: '',
      name: cleanName.slice(0, 128),
      dose: cleanDose.slice(0, 128),
      times: normalized,
      startDate,
      active: true,
      takenLog: [],
      createdAt: new Date().toISOString(),
      ...(endDate ? { endDate } : {}),
      ...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
    };

    setSaving(true);
    try {
      await onSave(medication);
      setName('');
      setDose('');
      setTimes(['08:00']);
      setEndDate('');
      setNotes('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : tr('Could not save this medicine.', 'ওষুধটি সংরক্ষণ করা যায়নি।'));
    } finally {
      setSaving(false);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : tr('That change could not be saved.', 'পরিবর্তনটি সংরক্ষণ করা যায়নি।'));
    }
  };

  const toggleDose = (medId: string, key: string, taken: boolean) => {
    const medication = medsById.get(medId);
    if (!medication) return;
    void run(() => onSave(setDoseTaken(medication, key, taken)));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-teal-600" />
            <span>{tr('Medicine Reminders', 'ওষুধের রিমাইন্ডার')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {tr('Keep a daily checklist of your medicines and see how consistently you take them.', 'প্রতিদিনের ওষুধের চেকলিস্ট রাখুন এবং কতটা নিয়মিত খাচ্ছেন দেখুন।')}
          </p>
        </div>

        {notificationsSupported && (
          <button
            type="button"
            onClick={() => void toggleReminders()}
            aria-pressed={remindersOn}
            className={`flex items-center gap-1.5 self-start px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              remindersOn ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
            }`}
          >
            {remindersOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {remindersOn ? tr('Browser reminders on', 'ব্রাউজার রিমাইন্ডার চালু') : tr('Turn on browser reminders', 'ব্রাউজার রিমাইন্ডার চালু করুন')}
          </button>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          {tr(
            'This is a reminder and tracking tool only. Enter doses exactly as your prescription says. Never start, stop, or change a medicine because of this app: ask your doctor or pharmacist.',
            'এটি শুধু রিমাইন্ডার ও ট্র্যাকিং টুল। প্রেসক্রিপশনে যেমন লেখা, ঠিক তেমন ডোজ লিখুন। এই অ্যাপের কারণে কোনো ওষুধ শুরু, বন্ধ বা বদলাবেন না: ডাক্তার বা ফার্মাসিস্টকে জিজ্ঞেস করুন।',
          )}
          {permission === 'denied' && (
            <span className="block mt-1 font-semibold">
              {tr('Notifications are blocked in your browser settings.', 'আপনার ব্রাউজারে নোটিফিকেশন বন্ধ করা আছে।')}
            </span>
          )}
          {remindersOn && (
            <span className="block mt-1">
              {tr('Browser reminders only appear while this app is open in a tab.', 'ব্রাউজার রিমাইন্ডার শুধু তখনই আসে যখন এই অ্যাপ কোনো ট্যাবে খোলা থাকে।')}
            </span>
          )}
        </p>
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {actionError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today */}
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('7-day consistency', '৭ দিনের নিয়মিততা')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{adherence.percent === null ? '—' : `${adherence.percent}%`}</p>
              <p className="text-[11px] text-slate-500">
                {adherence.scheduled > 0
                  ? tr(`${adherence.taken} of ${adherence.scheduled} doses marked taken`, `${adherence.scheduled}টির মধ্যে ${adherence.taken}টি নেওয়া হয়েছে`)
                  : tr('No doses scheduled yet', 'এখনো কোনো ডোজ নির্ধারিত নেই')}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('Missed today', 'আজ বাদ পড়েছে')}</p>
              <p className={`mt-1 text-2xl font-bold ${missed.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{missed.length}</p>
              <p className="text-[11px] text-slate-500">
                {missed.length > 0 ? missed.map((dose) => `${dose.medName} ${dose.time}`).join(', ') : tr('Nothing overdue', 'কিছু বাকি নেই')}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              {tr("Today's doses", 'আজকের ডোজ')}
            </div>
            {todaysDoses.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-slate-500">
                {tr('No medicines scheduled for today. Add one to get started.', 'আজকের জন্য কোনো ওষুধ নেই। শুরু করতে একটি যোগ করুন।')}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todaysDoses.map((item) => (
                  <li key={`${item.medId}-${item.key}`}>
                    <button
                      type="button"
                      onClick={() => toggleDose(item.medId, item.key, !item.taken)}
                      aria-pressed={item.taken}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50"
                    >
                      {item.taken ? <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
                      <span className="w-14 text-xs font-semibold text-slate-600">{item.time}</span>
                      <span className={`text-sm ${item.taken ? 'line-through text-slate-400' : 'text-slate-900 font-medium'}`}>
                        {item.medName} <span className="text-xs text-slate-500">— {item.dose}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* All medicines */}
          {medications.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">{tr('My medicines', 'আমার ওষুধ')}</div>
              <ul className="divide-y divide-slate-100">
                {medications.map((med) => (
                  <li key={med.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-xs">
                    <span className={`font-bold ${med.active ? 'text-slate-900' : 'text-slate-400'}`}>{med.name}</span>
                    <span className="text-slate-500">{med.dose}</span>
                    <span className="text-slate-500">{normalizeTimes(med.times).join(', ')}</span>
                    <span className="text-slate-400">
                      {med.startDate}
                      {med.endDate ? ` → ${med.endDate}` : ''}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void run(() => onSave({ ...med, active: !med.active }))}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-teal-300"
                      >
                        {med.active ? tr('Pause', 'বিরতি') : tr('Resume', 'চালু করুন')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(tr(`Delete ${med.name} and its log?`, `${med.name} ও এর লগ মুছে ফেলবেন?`))) void run(() => onDelete(med.id));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        aria-label={tr('Delete medicine', 'ওষুধ মুছুন')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 self-start">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-teal-600" />
            {tr('Add a medicine', 'ওষুধ যোগ করুন')}
          </h2>

          <div>
            <label htmlFor="med-name" className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Medicine name', 'ওষুধের নাম')}
            </label>
            <input id="med-name" value={name} maxLength={128} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Metformin" />
          </div>
          <div>
            <label htmlFor="med-dose" className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Dose (as prescribed)', 'ডোজ (প্রেসক্রিপশন অনুযায়ী)')}
            </label>
            <input id="med-dose" value={dose} maxLength={128} onChange={(e) => setDose(e.target.value)} className={inputClass} placeholder="500 mg" />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">{tr('Reminder times', 'রিমাইন্ডারের সময়')}</span>
            <div className="space-y-1.5">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="time" value={time} onChange={(e) => updateTime(index, e.target.value)} className={inputClass} aria-label={tr(`Time ${index + 1}`, `সময় ${index + 1}`)} />
                  {times.length > 1 && (
                    <button type="button" onClick={() => setTimes((previous) => previous.filter((_, position) => position !== index))} className="p-1.5 text-slate-400 hover:text-rose-600" aria-label={tr('Remove time', 'সময় সরান')}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {times.length < MAX_TIMES_PER_MEDICATION && (
              <button type="button" onClick={() => setTimes((previous) => [...previous, '12:00'])} className="mt-1.5 text-xs font-semibold text-teal-700 hover:underline">
                + {tr('Add another time', 'আরেকটি সময় যোগ করুন')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="med-start" className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('Start date', 'শুরুর তারিখ')}
              </label>
              <input id="med-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="med-end" className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('End date (optional)', 'শেষ তারিখ (ঐচ্ছিক)')}
              </label>
              <input id="med-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="med-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Notes (optional)', 'নোট (ঐচ্ছিক)')}
            </label>
            <input id="med-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder={tr('e.g. with meals', 'যেমন: খাবারের সাথে')} />
          </div>

          {formError && (
            <p role="alert" className="text-xs text-rose-700">
              {formError}
            </p>
          )}

          <button type="submit" disabled={saving} className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors">
            {saving ? tr('Saving…', 'সংরক্ষণ হচ্ছে…') : tr('Add medicine', 'ওষুধ যোগ করুন')}
          </button>
        </form>
      </div>
    </div>
  );
};

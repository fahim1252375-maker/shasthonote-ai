/**
 * Pure scheduling helpers for the Medication Reminder feature.
 *
 * This is a reminder and self-tracking log only. It never suggests doses and cannot
 * know what a clinician prescribed; the user types the name, dose and times.
 * All dates/times are the device's local calendar (no timezone conversion).
 */
import type { Medication } from '../types';

export const MAX_TAKEN_LOG_ENTRIES = 700;
export const MAX_TIMES_PER_MEDICATION = 8;

const pad2 = (value: number) => String(value).padStart(2, '0');

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function localTimeKey(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

/** Sorted, de-duplicated list of valid "HH:MM" strings. */
export function normalizeTimes(times: string[] | undefined): string[] {
  if (!Array.isArray(times)) return [];
  return [...new Set(times.filter(isValidTime))].sort().slice(0, MAX_TIMES_PER_MEDICATION);
}

export function isMedicationActiveOn(med: Medication, dateKey: string): boolean {
  if (!med.active || !isValidDateKey(dateKey) || !isValidDateKey(med.startDate)) return false;
  if (med.endDate && !isValidDateKey(med.endDate)) return false;
  if (dateKey < med.startDate) return false;
  if (med.endDate && dateKey > med.endDate) return false;
  return true;
}

export interface ScheduledDose {
  key: string;
  medId: string;
  medName: string;
  dose: string;
  date: string;
  time: string;
  taken: boolean;
}

export const doseKey = (dateKey: string, time: string) => `${dateKey}@${time}`;

export function dosesForDate(meds: Medication[], dateKey: string): ScheduledDose[] {
  const doses: ScheduledDose[] = [];
  for (const med of meds) {
    if (!isMedicationActiveOn(med, dateKey)) continue;
    const taken = new Set(med.takenLog);
    for (const time of normalizeTimes(med.times)) {
      const key = doseKey(dateKey, time);
      doses.push({ key, medId: med.id, medName: med.name, dose: med.dose, date: dateKey, time, taken: taken.has(key) });
    }
  }
  return doses.sort((a, b) => (a.time === b.time ? a.medName.localeCompare(b.medName) : a.time.localeCompare(b.time)));
}

/** Return a copy of the medication with one dose marked taken / not taken. */
export function setDoseTaken(med: Medication, key: string, taken: boolean): Medication {
  const log = new Set(med.takenLog);
  if (taken) log.add(key);
  else log.delete(key);
  // Keep the document small: drop the oldest entries first (keys sort chronologically).
  const pruned = [...log].sort().slice(-MAX_TAKEN_LOG_ENTRIES);
  return { ...med, takenLog: pruned };
}

export interface AdherenceSummary {
  scheduled: number;
  taken: number;
  /** 0–100, or null when nothing was scheduled in the window. */
  percent: number | null;
}

/**
 * Adherence over the last `days` days ending today. Doses later today that are
 * not yet due are not counted against the user.
 */
export function adherenceSummary(meds: Medication[], now: Date, days = 7): AdherenceSummary {
  const today = localDateKey(now);
  const nowTime = localTimeKey(now);
  let scheduled = 0;
  let taken = 0;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dateKey = addDays(today, -offset);
    for (const dose of dosesForDate(meds, dateKey)) {
      if (dateKey === today && dose.time > nowTime && !dose.taken) continue;
      scheduled += 1;
      if (dose.taken) taken += 1;
    }
  }

  return { scheduled, taken, percent: scheduled === 0 ? null : Math.round((taken / scheduled) * 100) };
}

/** The next not-yet-taken dose today at or after the current time. */
export function nextDose(meds: Medication[], now: Date): ScheduledDose | null {
  const nowTime = localTimeKey(now);
  return dosesForDate(meds, localDateKey(now)).find((dose) => !dose.taken && dose.time >= nowTime) ?? null;
}

/**
 * Doses that became due within the last `windowMinutes` minutes (inclusive of now)
 * and have not been marked taken — used to fire a browser notification once.
 */
export function dosesDueNow(meds: Medication[], now: Date, windowMinutes = 10): ScheduledDose[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return dosesForDate(meds, localDateKey(now)).filter((dose) => {
    if (dose.taken) return false;
    const [hours, minutes] = dose.time.split(':').map(Number);
    const doseMinutes = hours * 60 + minutes;
    return doseMinutes <= nowMinutes && nowMinutes - doseMinutes <= windowMinutes;
  });
}

export function missedDosesToday(meds: Medication[], now: Date, graceMinutes = 60): ScheduledDose[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return dosesForDate(meds, localDateKey(now)).filter((dose) => {
    if (dose.taken) return false;
    const [hours, minutes] = dose.time.split(':').map(Number);
    return nowMinutes - (hours * 60 + minutes) > graceMinutes;
  });
}

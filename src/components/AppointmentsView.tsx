import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
} from 'lucide-react';
import { Appointment, Language, HealthNote } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface AppointmentsViewProps {
  language: Language;
  appointments: Appointment[];
  notes: HealthNote[];
  onAddAppointment: (apt: Appointment) => Promise<void> | void;
  /** Saves changes to an existing appointment in place (checklist ticks, status). */
  onUpdateAppointment: (apt: Appointment) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onNavigateToNote: (noteId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  language,
  appointments,
  notes,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onNavigateToNote,
}) => {
  const t = TRANSLATIONS[language];

  const [showAddModal, setShowAddModal] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [linkedNoteId, setLinkedNoteId] = useState(notes[0]?.id || '');
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !dateTime) return;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      userId: 'guest-patient-shastho-01',
      doctorName,
      specialty: specialty || 'General Medicine',
      dateTime,
      location: location || 'Consultation Clinic',
      linkedNoteId,
      checklist: [
        'Bring ShasthoNote Consultation Summary PDF',
        'Recent lab reports and test copies',
        'Current daily medication packaging',
        'Arrive 15 minutes before scheduled slot',
      ],
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    };

    setSaveError(null);
    try {
      await onAddAppointment(newApt);
      setShowAddModal(false);
      setDoctorName('');
      setSpecialty('');
      setDateTime('');
      setLocation('');
      setLinkedNoteId('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this appointment.');
    }
  };

  // Ticks are stored on the appointment itself so they survive a refresh and sync with the account.
  const toggleCheck = async (apt: Appointment, itemIdx: number) => {
    const done = new Set(apt.checklistDone ?? []);
    if (done.has(itemIdx)) done.delete(itemIdx);
    else done.add(itemIdx);
    setSaveError(null);
    try {
      await onUpdateAppointment({ ...apt, checklistDone: [...done].sort((a, b) => a - b) });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this change.');
    }
  };

  const changeStatus = async (apt: Appointment, status: Appointment['status']) => {
    setSaveError(null);
    try {
      await onUpdateAppointment({ ...apt, status });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this change.');
    }
  };

  const removeAppointment = async (apt: Appointment) => {
    const message = language === 'bn' ? 'এই অ্যাপয়েন্টমেন্ট মুছে ফেলবেন?' : 'Delete this appointment?';
    if (!window.confirm(message)) return;
    setSaveError(null);
    try {
      await onDeleteAppointment(apt.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not delete this appointment.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            <span>{language === 'bn' ? 'ডাক্তারের সাক্ষাত ও প্রস্তুতি' : 'Doctor Appointments & Prep'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {language === 'bn'
              ? 'ডাক্তার দেখানোর সময়সূচি ও প্রস্তুতি চেকলিস্ট পরিচালনা করুন।'
              : 'Organize your upcoming consultations and preparation checklists.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'bn' ? 'নতুন সাক্ষাত' : 'Schedule Visit'}</span>
        </button>
      </div>

      {saveError && !showAddModal && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {saveError}
        </p>
      )}

      {/* Appointment Cards */}
      <div className="space-y-4">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 hover:border-teal-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {apt.doctorName}
                </h3>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  {apt.specialty}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>{apt.dateTime}</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{apt.location}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-md px-2 py-0.5 font-semibold ${
                  apt.status === 'upcoming'
                    ? 'bg-teal-50 text-teal-800'
                    : apt.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {apt.status === 'upcoming'
                  ? language === 'bn' ? 'আসন্ন' : 'Upcoming'
                  : apt.status === 'completed'
                    ? language === 'bn' ? 'সম্পন্ন' : 'Completed'
                    : language === 'bn' ? 'বাতিল' : 'Cancelled'}
              </span>
              {apt.status === 'upcoming' ? (
                <>
                  <button type="button" onClick={() => void changeStatus(apt, 'completed')} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:border-emerald-400">
                    {language === 'bn' ? 'সম্পন্ন করুন' : 'Mark completed'}
                  </button>
                  <button type="button" onClick={() => void changeStatus(apt, 'cancelled')} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:border-amber-400">
                    {language === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => void changeStatus(apt, 'upcoming')} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:border-teal-400">
                  {language === 'bn' ? 'আবার আসন্ন করুন' : 'Reopen'}
                </button>
              )}
              <button type="button" onClick={() => void removeAppointment(apt)} className="ml-auto rounded-lg px-2 py-1 font-semibold text-slate-400 hover:text-rose-600">
                {language === 'bn' ? 'মুছুন' : 'Delete'}
              </button>
            </div>

            {apt.linkedNoteId && notes.some((note) => note.id === apt.linkedNoteId) && (
              <button type="button" onClick={() => onNavigateToNote(apt.linkedNoteId!)} className="inline-flex items-center gap-1 rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50">
                <FileText className="h-3.5 w-3.5" />
                {language === 'bn' ? 'সংযুক্ত নোট খুলুন' : 'Open linked consultation note'}
              </button>
            )}

            {/* Preparation Checklist */}
            {apt.checklist && apt.checklist.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Consultation Preparation Checklist:
                </h4>
                <div className="space-y-1.5">
                  {apt.checklist.map((item, idx) => {
                    const isDone = (apt.checklistDone ?? []).includes(idx);
                    return (
                      <div
                        key={idx}
                        role="checkbox"
                        aria-checked={isDone}
                        tabIndex={0}
                        onClick={() => void toggleCheck(apt, idx)}
                        onKeyDown={(event) => {
                          if (event.key === ' ' || event.key === 'Enter') {
                            event.preventDefault();
                            void toggleCheck(apt, idx);
                          }
                        }}
                        className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-teal-600 text-white'
                              : 'border border-slate-300 hover:border-teal-400'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3" />}
                        </div>
                        <span className={isDone ? 'line-through text-slate-400' : ''}>
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {language === 'bn' ? 'নতুন ডাক্তার সাক্ষাত যোগ করুন' : 'Schedule Medical Consultation'}
            </h2>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Doctor or Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  maxLength={256}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Nusrat Jahan"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specialty
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  maxLength={128}
                  placeholder="e.g. Internal Medicine, Diabetology"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="text"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  maxLength={64}
                  placeholder="e.g. Nov 15, 2026 at 06:00 PM"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital or Clinic Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={256}
                  placeholder="e.g. Square Hospital, Dhaka"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'সংযুক্ত পরামর্শ নোট' : 'Link a consultation note'}
                </label>
                <select
                  value={linkedNoteId}
                  onChange={(e) => setLinkedNoteId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
                >
                  <option value="">{language === 'bn' ? 'কোনো নোট নয়' : 'No linked note'}</option>
                  {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
                </select>
              </div>

              {saveError && <p role="alert" className="text-xs text-rose-700">{saveError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
                >
                  Save Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

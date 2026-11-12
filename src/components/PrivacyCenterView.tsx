import React, { useRef, useState } from 'react';
import { Database, Download, FileUp, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import type { Language } from '../types';
import type { AiConsentState } from '../lib/consent';
import type { BackupData } from '../utils/backup';

export interface ImportOutcome {
  imported: number;
  skipped: number;
  failed: number;
}

interface PrivacyCenterViewProps {
  language: Language;
  isGuest: boolean;
  userEmail?: string;
  counts: Record<keyof BackupData, number>;
  consentState: AiConsentState;
  onSetConsent: (granted: boolean) => void;
  onExport: () => void;
  onExportEncrypted: (passphrase: string) => Promise<void>;
  onImport: (fileText: string, passphrase?: string) => Promise<ImportOutcome>;
  onDeleteAll: () => Promise<void>;
}

const CONFIRM_WORD = 'DELETE';

export const PrivacyCenterView: React.FC<PrivacyCenterViewProps> = ({
  language,
  isGuest,
  userEmail,
  counts,
  consentState,
  onSetConsent,
  onExport,
  onExportEncrypted,
  onImport,
  onDeleteAll,
}) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const fileInput = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupMessage, setBackupMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [importMessage, setImportMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const rows: Array<[string, string, number]> = [
    ['Health notes', 'স্বাস্থ্য নোট', counts.notes],
    ['Medical documents', 'মেডিকেল ডকুমেন্ট', counts.documents],
    ['Appointments', 'অ্যাপয়েন্টমেন্ট', counts.appointments],
    ['Study sets & mind maps', 'স্টাডি সেট ও মাইন্ড ম্যাপ', counts.studyResources],
    ['Vitals readings', 'ভাইটালস মাপ', counts.vitals],
    ['Medicines', 'ওষুধ', counts.medications],
  ];
  const total = rows.reduce((sum, row) => sum + row[2], 0);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportMessage(null);
    const encryptedFile = file.name.toLowerCase().endsWith('.shasthonote');
    const maximumBytes = encryptedFile ? 38 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maximumBytes) {
      setImportMessage({ tone: 'error', text: tr(`That file is too large (${encryptedFile ? '38' : '25'} MB limit).`, `ফাইলটি অনেক বড় (সীমা ${encryptedFile ? '৩৮' : '২৫'} MB)।`) });
      return;
    }
    setImporting(true);
    try {
      const outcome = await onImport(await file.text(), backupPassphrase);
      setImportMessage({
        tone: outcome.failed > 0 ? 'error' : 'ok',
        text: tr(
          `Imported ${outcome.imported} record(s). Skipped ${outcome.skipped} invalid, ${outcome.failed} failed to save.`,
          `${outcome.imported}টি রেকর্ড ইমপোর্ট হয়েছে। ${outcome.skipped}টি অবৈধ বাদ গেছে, ${outcome.failed}টি সংরক্ষণ ব্যর্থ।`,
        ),
      });
    } catch (error) {
      setImportMessage({ tone: 'error', text: error instanceof Error ? error.message : tr('Import failed.', 'ইমপোর্ট ব্যর্থ হয়েছে।') });
    } finally {
      setImporting(false);
    }
  };

  const handleEncryptedExport = async () => {
    setBackupMessage(null);
    if (backupPassphrase.length < 12) {
      setBackupMessage({ tone: 'error', text: tr('Use at least 12 characters for a strong backup passphrase.', 'শক্তিশালী backup passphrase-এর জন্য অন্তত ১২টি অক্ষর দিন।') });
      return;
    }
    setEncrypting(true);
    try {
      await onExportEncrypted(backupPassphrase);
      setBackupMessage({ tone: 'ok', text: tr('Encrypted backup downloaded. Your passphrase was not saved; keep it safe.', 'Encrypted backup ডাউনলোড হয়েছে। Passphrase সংরক্ষণ করা হয়নি—নিরাপদে রাখুন।') });
    } catch (error) {
      setBackupMessage({ tone: 'error', text: error instanceof Error ? error.message : tr('Encrypted backup failed.', 'Encrypted backup তৈরি হয়নি।') });
    } finally {
      setEncrypting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== CONFIRM_WORD) return;
    setDeleting(true);
    setDeleteMessage(null);
    try {
      await onDeleteAll();
      setConfirmText('');
      setDeleteMessage({ tone: 'ok', text: tr('Your data was deleted.', 'আপনার ডেটা মুছে ফেলা হয়েছে।') });
    } catch (error) {
      setDeleteMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : tr('Deletion failed. Some records may remain; please try again.', 'মুছতে ব্যর্থ। কিছু রেকর্ড থেকে যেতে পারে; আবার চেষ্টা করুন।'),
      });
    } finally {
      setDeleting(false);
    }
  };

  const card = 'bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3';
  const tone = (value: 'ok' | 'error') => (value === 'ok' ? 'text-emerald-700' : 'text-rose-700');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-teal-600" />
          <span>{tr('Privacy & Data Center', 'প্রাইভেসি ও ডেটা সেন্টার')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {tr('You control your data: choose AI access, take a copy, or delete everything.', 'ডেটা আপনার নিয়ন্ত্রণে: AI ব্যবহার ঠিক করুন, কপি নিন, বা সব মুছে ফেলুন।')}
        </p>
      </div>

      <section className={card} aria-labelledby="privacy-ai">
        <h2 id="privacy-ai" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-teal-600" />
          {tr('AI data use', 'AI-তে ডেটা ব্যবহার')}
        </h2>
        {isGuest ? (
          <p className="text-xs text-slate-600">
            {tr('Guest demo mode never sends anything to the AI server. Sign in to choose.', 'Guest demo মোডে কিছুই AI সার্ভারে যায় না। বেছে নিতে sign in করুন।')}
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-slate-600">
              {tr(
                'Only the text, audio, image or PDF you select for an AI request is sent through this app’s server to Google’s Gemini API.',
                'AI অনুরোধের জন্য আপনার নির্বাচিত লেখা, অডিও, ছবি বা PDF-ই এই অ্যাপের সার্ভার হয়ে Google-এর Gemini API-তে যায়।',
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  consentState === 'granted' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {consentState === 'granted' ? tr('AI features allowed', 'AI ফিচার অনুমোদিত') : tr('AI features off', 'AI ফিচার বন্ধ')}
              </span>
              <button
                type="button"
                onClick={() => onSetConsent(consentState !== 'granted')}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400"
              >
                {consentState === 'granted' ? tr('Turn AI off', 'AI বন্ধ করুন') : tr('Allow AI features', 'AI ফিচার চালু করুন')}
              </button>
            </div>
          </>
        )}
      </section>

      <section className={card} aria-labelledby="privacy-inventory">
        <h2 id="privacy-inventory" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-teal-600" />
          {tr('What is stored', 'কী সংরক্ষিত আছে')}
        </h2>
        <p className="text-xs text-slate-600">
          {isGuest
            ? tr('Guest data lives only in this browser (localStorage).', 'Guest ডেটা শুধু এই ব্রাউজারেই (localStorage) থাকে।')
            : tr(`Saved to your private account${userEmail ? ` (${userEmail})` : ''} in Firestore. Original uploaded files are not stored. Offline support also keeps a local IndexedDB cache in this browser; use a trusted, locked device and sign out on shared devices.`, `আপনার ব্যক্তিগত অ্যাকাউন্টে${userEmail ? ` (${userEmail})` : ''} Firestore-এ সংরক্ষিত। মূল upload করা ফাইল সংরক্ষণ করা হয় না। Offline সুবিধার জন্য এই browser-এর IndexedDB-তেও cache থাকে; বিশ্বস্ত ও lock করা device ব্যবহার করুন এবং shared device-এ sign out করুন।`)}
        </p>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 text-xs">
          {rows.map(([en, bn, count]) => (
            <li key={en} className="flex items-center justify-between px-3 py-2">
              <span className="text-slate-700">{tr(en, bn)}</span>
              <span className="font-bold text-slate-900">{count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="privacy-backup">
        <h2 id="privacy-backup" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-teal-600" />
          {tr('Backup & restore', 'ব্যাকআপ ও রিস্টোর')}
        </h2>
        <p className="text-xs text-slate-600">
          {tr(
            'Download a standard (unencrypted) JSON backup or protect it with a passphrase using AES-256-GCM encryption. Encrypted backups are processed in this browser; your passphrase is never uploaded or stored.',
            'সাধারণ (unencrypted) JSON backup ডাউনলোড করুন, অথবা AES-256-GCM encryption দিয়ে passphrase-এ সুরক্ষিত করুন। Encrypted backup এই browser-এই তৈরি হয়; passphrase upload বা সংরক্ষণ করা হয় না।',
          )}
        </p>
        <div className="space-y-1.5">
          <label htmlFor="backup-passphrase" className="block text-xs font-semibold text-slate-700">
            {tr('Backup passphrase (12+ characters)', 'Backup passphrase (১২+ অক্ষর)')}
          </label>
          <input
            id="backup-passphrase"
            type="password"
            value={backupPassphrase}
            onChange={(event) => setBackupPassphrase(event.target.value)}
            autoComplete="new-password"
            maxLength={1024}
            placeholder={tr('Create or enter your backup passphrase', 'Backup passphrase তৈরি বা লিখুন')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-hidden focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
          />
          <p className="text-[11px] text-slate-500">
            {tr('You must remember this passphrase. There is no recovery option if it is lost.', 'এই passphrase মনে রাখতে হবে। হারালে পুনরুদ্ধারের কোনো ব্যবস্থা নেই।')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={total === 0}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            <Download className="w-4 h-4" />
            {tr('Download backup (JSON)', 'ব্যাকআপ ডাউনলোড (JSON)')}
          </button>
          <button
            type="button"
            onClick={() => void handleEncryptedExport()}
            disabled={total === 0 || encrypting || backupPassphrase.length < 12}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            <ShieldCheck className="h-4 w-4" />
            {encrypting ? tr('Encrypting…', 'এনক্রিপ্ট হচ্ছে…') : tr('Download encrypted backup', 'Encrypted backup ডাউনলোড')}
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-teal-400 disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" />
            {importing ? tr('Importing…', 'ইমপোর্ট হচ্ছে…') : tr('Restore from backup', 'ব্যাকআপ থেকে রিস্টোর')}
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json,.shasthonote" className="hidden" onChange={(e) => void handleFile(e)} />
        </div>
        {backupMessage && (
          <p role="status" className={`text-xs font-semibold ${tone(backupMessage.tone)}`}>
            {backupMessage.text}
          </p>
        )}
        {importMessage && (
          <p role="status" className={`text-xs font-semibold ${tone(importMessage.tone)}`}>
            {importMessage.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-3" aria-labelledby="privacy-delete">
        <h2 id="privacy-delete" className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" />
          {tr('Delete all my data', 'আমার সব ডেটা মুছুন')}
        </h2>
        <p className="text-xs leading-relaxed text-rose-900">
          {isGuest
            ? tr('This clears the guest demo data stored in this browser and restores the sample content.', 'এটি এই ব্রাউজারে থাকা guest demo ডেটা মুছে নমুনা কনটেন্ট ফিরিয়ে আনবে।')
            : tr(
                'This permanently deletes all notes, documents, appointments, study sets, vitals and medicines in your account, and your profile record. It cannot be undone. It does not delete your Google sign-in account.',
                'এটি আপনার অ্যাকাউন্টের সব নোট, ডকুমেন্ট, অ্যাপয়েন্টমেন্ট, স্টাডি সেট, ভাইটালস ও ওষুধ এবং প্রোফাইল রেকর্ড স্থায়ীভাবে মুছে ফেলবে। ফেরানো যাবে না। আপনার Google sign-in অ্যাকাউন্ট মুছবে না।',
              )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="delete-confirm" className="text-xs font-semibold text-rose-900">
            {tr(`Type ${CONFIRM_WORD} to confirm`, `নিশ্চিত করতে ${CONFIRM_WORD} লিখুন`)}
          </label>
          <input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="w-32 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs outline-hidden focus:ring-2 focus:ring-rose-300"
          />
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={confirmText !== CONFIRM_WORD || deleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:bg-slate-300"
          >
            {deleting ? tr('Deleting…', 'মোছা হচ্ছে…') : tr('Delete everything', 'সব মুছুন')}
          </button>
        </div>
        {deleteMessage && (
          <p role="status" className={`text-xs font-semibold ${tone(deleteMessage.tone)}`}>
            {deleteMessage.text}
          </p>
        )}
      </section>
    </div>
  );
};

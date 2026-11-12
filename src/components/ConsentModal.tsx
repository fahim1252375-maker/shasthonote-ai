import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Language } from '../types';

interface ConsentModalProps {
  language: Language;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/** Asks once per account before any text/file may be sent to the AI server. */
export const ConsentModal: React.FC<ConsentModalProps> = ({ language, isOpen, onAccept, onDecline }) => {
  if (!isOpen) return null;
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h2 id="consent-title" className="text-base font-bold text-slate-900">
            {tr('Before you use AI features', 'AI ফিচার ব্যবহারের আগে')}
          </h2>
        </div>

        <ul className="space-y-2 text-xs leading-relaxed text-slate-700 list-disc pl-5">
          <li>
            {tr(
              'When you use an AI feature, only the text, audio, image or PDF you select is sent through this app’s server to Google’s Gemini API.',
              'AI ফিচার ব্যবহার করলে শুধু আপনার নির্বাচিত লেখা, অডিও, ছবি বা PDF এই অ্যাপের সার্ভার হয়ে Google-এর Gemini API-তে যায়।',
            )}
          </li>
          <li>{tr('Saved notes, vitals and medicines are never sent unless you choose them for an AI request.', 'সংরক্ষিত নোট, ভাইটালস ও ওষুধ আপনি AI অনুরোধের জন্য বেছে না নিলে পাঠানো হয় না।')}</li>
          <li>{tr('Avoid names, phone numbers, addresses and other identifying details if you can.', 'সম্ভব হলে নাম, ফোন নম্বর, ঠিকানা ও পরিচয় বোঝায় এমন তথ্য এড়িয়ে চলুন।')}</li>
          <li>{tr('AI output can be wrong. It is not a diagnosis or medical advice: confirm with a qualified clinician.', 'AI-এর উত্তর ভুল হতে পারে। এটি রোগনির্ণয় বা চিকিৎসা পরামর্শ নয়: যোগ্য চিকিৎসকের সাথে নিশ্চিত করুন।')}</li>
          <li>{tr('You can change this choice, export your data or delete it any time in the Privacy Center.', 'এই সিদ্ধান্ত বদলানো, ডেটা এক্সপোর্ট বা মুছে ফেলা যায় যেকোনো সময় Privacy Center থেকে।')}</li>
        </ul>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDecline} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {tr('Not now (no AI)', 'এখন না (AI ছাড়া)')}
          </button>
          <button type="button" onClick={onAccept} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700">
            {tr('I understand — allow AI features', 'বুঝেছি — AI ফিচার চালু করুন')}
          </button>
        </div>
      </div>
    </div>
  );
};

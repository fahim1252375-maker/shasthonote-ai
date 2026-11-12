import React, { useMemo } from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';
import type { Language } from '../types';
import { detectRedFlags, highestRedFlagSeverity } from '../utils/redFlags';

interface RedFlagBannerProps {
  language: Language;
  /** Free text to scan; scanning happens locally in the browser and nothing is sent anywhere. */
  text: string;
}

/**
 * Live safety banner. Shown only when warning phrases are detected.
 * It is intentionally loud for emergencies and calm for "talk to a doctor today" cases.
 */
export const RedFlagBanner: React.FC<RedFlagBannerProps> = ({ language, text }) => {
  const matches = useMemo(() => detectRedFlags(text), [text]);
  const severity = highestRedFlagSeverity(matches);
  if (!severity) return null;

  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const isEmergency = severity === 'emergency';
  // The most severe item's advice leads; it is the one the person must act on.
  const lead = matches[0];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-2xl border p-4 space-y-2 ${
        isEmergency ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isEmergency ? (
          <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-bold">
            {isEmergency
              ? tr('Your note mentions possible emergency warning signs', 'আপনার নোটে সম্ভাব্য জরুরি বিপদচিহ্নের কথা আছে')
              : tr('Your note mentions symptoms worth checking soon', 'আপনার নোটে এমন লক্ষণের কথা আছে যা দ্রুত দেখানো দরকার')}
          </p>
          <p className="text-xs leading-relaxed">{language === 'bn' ? lead.adviceBn : lead.adviceEn}</p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-1.5 pl-7">
        {matches.map((match) => (
          <li
            key={match.id}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
              match.severity === 'emergency' ? 'border-rose-300 bg-white text-rose-800' : 'border-amber-300 bg-white text-amber-800'
            }`}
          >
            {language === 'bn' ? match.labelBn : match.labelEn}
          </li>
        ))}
      </ul>

      <p className="pl-7 text-[11px] opacity-80">
        {tr(
          'This automatic check looks for keywords on your device only. It can miss things and is not a diagnosis. If you feel unsafe, get help now.',
          'এই স্বয়ংক্রিয় যাচাই শুধু আপনার ডিভাইসেই কিছু শব্দ খোঁজে। এটি সবকিছু ধরতে পারে না এবং রোগনির্ণয় নয়। নিরাপদ মনে না হলে এখনই সহায়তা নিন।',
        )}
      </p>
    </div>
  );
};

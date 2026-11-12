import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X } from 'lucide-react';
import { Language } from '../types';

interface EmergencyModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  language,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-300 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {language === 'bn'
                  ? 'জরুরি স্বাস্থ্য সতর্কবার্তা ও লক্ষণসমূহ'
                  : 'Emergency Medical Red Flags'}
              </h2>
              <span className="text-xs text-rose-600 font-semibold uppercase tracking-wider">
                Immediate Hospital Attention
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
          {language === 'bn'
            ? 'স্বাস্থ্যনোট এআই কোনো জরুরি সেবা বা রোগ নির্ণয়কারী ব্যবস্থা নয়। আপনার বা পরিবারের কারো যদি নিচের কোনো লক্ষণ দেখা দেয়, তবে অ্যাপে নোট না লিখে সরাসরি জরুরি সেবা নিন:'
            : 'ShasthoNote AI is an organization workspace, NOT an emergency response system. If you or someone else experience any of the following symptoms, seek immediate emergency medical care:'}
        </p>

        {/* Red Flag List */}
        <div className="space-y-2 text-xs text-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <span className="text-rose-600 font-bold">1.</span>
            <span>
              <strong>Chest Discomfort:</strong> Sudden crushing substernal heaviness or tightness radiating to the left arm, neck, jaw, or back, accompanied by sweating or nausea.
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <span className="text-rose-600 font-bold">2.</span>
            <span>
              <strong>Severe Dyspnea:</strong> Acute inability to catch breath or breathing accompanied by blue/pale lips.
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <span className="text-rose-600 font-bold">3.</span>
            <span>
              <strong>Stroke Signs (FAST):</strong> Sudden facial drooping, unilateral arm/leg weakness, or slurred/incomprehensible speech.
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <span className="text-rose-600 font-bold">4.</span>
            <span>
              <strong>Anaphylaxis:</strong> Rapidly swelling tongue, lips, throat tightness, or generalized hives after an insect sting, medication, or food.
            </span>
          </div>
        </div>

        {/* Emergency Hotlines */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
              National Emergency Call:
            </span>
            <span className="text-base font-extrabold text-rose-400">
              999 (Bangladesh) • Use your local emergency number elsewhere
            </span>
          </div>
          <PhoneCall className="w-5 h-5 text-rose-400" />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            {language === 'bn' ? 'আমি বুঝেছি, বন্ধ করুন' : 'I Understand, Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

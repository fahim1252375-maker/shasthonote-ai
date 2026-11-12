import React, { useMemo, useState } from 'react';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import type { Language, SourceDocument } from '../types';
import { buildLabSeries, type LabStatus } from '../utils/labTrends';
import { TrendChart } from './TrendChart';

interface LabTrendsViewProps {
  language: Language;
  documents: SourceDocument[];
  onOpenDocument: (documentId: string) => void;
}

const STATUS_STYLES: Record<LabStatus, string> = {
  normal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  high: 'bg-orange-50 text-orange-800 border-orange-200',
  low: 'bg-sky-50 text-sky-800 border-sky-200',
  flagged: 'bg-amber-50 text-amber-800 border-amber-200',
  unknown: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const LabTrendsView: React.FC<LabTrendsViewProps> = ({ language, documents, onOpenDocument }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';

  const allSeries = useMemo(() => buildLabSeries(documents), [documents]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [onlyTrends, setOnlyTrends] = useState(false);

  const visible = onlyTrends ? allSeries.filter((series) => series.points.length >= 2) : allSeries;
  const selected = visible.find((series) => series.key === selectedKey) ?? visible[0] ?? null;

  const statusLabel = (status: LabStatus) =>
    ({
      normal: tr('In range', 'স্বাভাবিক সীমায়'),
      high: tr('Above range', 'সীমার উপরে'),
      low: tr('Below range', 'সীমার নিচে'),
      flagged: tr('Flagged', 'চিহ্নিত'),
      unknown: tr('No range', 'সীমা নেই'),
    })[status];

  const dateText = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-indigo-600" />
          <span>{tr('Lab Trends', 'ল্যাব ট্রেন্ড')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {tr(
            'See how the same test changes across the reports you have saved.',
            'সংরক্ষিত রিপোর্টগুলোতে একই পরীক্ষার মান কীভাবে বদলাচ্ছে দেখুন।',
          )}
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          {tr(
            'Values were read automatically from your uploads and can contain errors. Dates are when you saved each report, not necessarily when the sample was taken. Always check the original report, and ask your doctor what a change means.',
            'মানগুলো আপলোড থেকে স্বয়ংক্রিয়ভাবে নেওয়া, তাই ভুল থাকতে পারে। তারিখ হলো রিপোর্ট সংরক্ষণের দিন, নমুনা নেওয়ার দিন নাও হতে পারে। সবসময় মূল রিপোর্ট দেখে নিন, আর পরিবর্তনের মানে ডাক্তারকে জিজ্ঞেস করুন।',
          )}
        </p>
      </div>

      {allSeries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {tr(
            'No numeric lab values yet. Analyze and save a lab report in the Document Analyzer to see results here.',
            'এখনো কোনো সংখ্যাভিত্তিক ল্যাব মান নেই। Document Analyzer-এ একটি ল্যাব রিপোর্ট বিশ্লেষণ ও সংরক্ষণ করলে এখানে দেখা যাবে।',
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden self-start">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">{tr('Tests', 'পরীক্ষা')} ({visible.length})</span>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={onlyTrends} onChange={(e) => setOnlyTrends(e.target.checked)} />
                {tr('Only with 2+ results', 'কমপক্ষে ২টি ফলাফল')}
              </label>
            </div>
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {visible.map((series) => {
                const latest = series.points[series.points.length - 1];
                const active = selected?.key === series.key;
                return (
                  <li key={series.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(series.key)}
                      aria-current={active}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs ${active ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <span>
                        <span className="block font-semibold text-slate-900">{series.name}</span>
                        <span className="text-slate-500">
                          {latest.value}
                          {series.unit ? ` ${series.unit}` : ''} · {series.points.length} {tr('results', 'টি ফলাফল')}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[series.latestStatus]}`}>
                        {statusLabel(series.latestStatus)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected && (
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">{selected.name}</h2>
                  {(selected.refLow !== undefined || selected.refHigh !== undefined) && (
                    <span className="text-[11px] text-slate-500">
                      {tr('Reference', 'রেফারেন্স')}:{' '}
                      {selected.refLow !== undefined && selected.refHigh !== undefined
                        ? `${selected.refLow}–${selected.refHigh}`
                        : selected.refHigh !== undefined
                          ? `< ${selected.refHigh}`
                          : `> ${selected.refLow}`}
                      {selected.unit ? ` ${selected.unit}` : ''}
                    </span>
                  )}
                </div>

                <TrendChart
                  series={[{ label: selected.name, color: '#4f46e5', values: selected.points.map((point) => point.value) }]}
                  xLabels={selected.points.map((point) => dateText(point.date))}
                  band={{ low: selected.refLow, high: selected.refHigh }}
                  unit={selected.unit}
                  ariaLabel={tr(`${selected.name} trend chart`, `${selected.name} ট্রেন্ড চার্ট`)}
                />
                {selected.points.length < 2 && (
                  <p className="text-[11px] text-slate-500">
                    {tr('Only one result so far. Save another report with this test to see a trend.', 'এখনো মাত্র একটি ফলাফল। ট্রেন্ড দেখতে এই পরীক্ষার আরেকটি রিপোর্ট সংরক্ষণ করুন।')}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {[...selected.points].reverse().map((point, index) => (
                    <li key={`${point.docId}-${index}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-xs">
                      <span className="w-24 text-slate-500">{dateText(point.date)}</span>
                      <span className={`font-bold ${point.flagged ? 'text-orange-700' : 'text-slate-900'}`}>
                        {point.value}
                        {selected.unit ? ` ${selected.unit}` : ''}
                      </span>
                      <button type="button" onClick={() => onOpenDocument(point.docId)} className="ml-auto text-teal-700 font-semibold hover:underline">
                        {point.docName}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

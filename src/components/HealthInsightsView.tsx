import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  Pill,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Appointment, Language, Medication, SourceDocument, VitalReading } from '../types';
import { downloadTextFile } from '../lib/download';
import { buildHealthInsightsExport } from '../utils/healthInsightsExport';
import {
  buildHealthInsights,
  getHealthOverviewStats,
  type HealthInsight,
  type InsightSeverity,
} from '../utils/healthInsights';

interface Props {
  language: Language;
  vitals: VitalReading[];
  medications: Medication[];
  documents: SourceDocument[];
  appointments: Appointment[];
  onNavigate: (tab: string) => void;
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  onClick: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, iconClass, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:p-5"
  >
    <div className="flex items-center justify-between gap-3">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${iconClass}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <ArrowUpRight size={16} className="text-slate-300 transition-colors group-hover:text-teal-700" aria-hidden="true" />
    </div>
    <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
    <div className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{label}</div>
  </button>
);

const SEVERITY_STYLES: Record<InsightSeverity, { card: string; icon: string }> = {
  urgent: { card: 'border-rose-200 bg-rose-50/60', icon: 'bg-rose-100 text-rose-700' },
  review: { card: 'border-amber-200 bg-amber-50/60', icon: 'bg-amber-100 text-amber-800' },
  info: { card: 'border-slate-200 bg-slate-50/70', icon: 'bg-slate-100 text-slate-700' },
};

const InsightCard: React.FC<{ insight: HealthInsight; language: Language }> = ({ insight, language }) => {
  const bn = language === 'bn';
  const style = SEVERITY_STYLES[insight.severity];
  const StatusIcon = insight.severity === 'urgent'
    ? AlertTriangle
    : insight.severity === 'review'
      ? ShieldCheck
      : CheckCircle2;
  const severityLabel = bn
    ? insight.severity === 'urgent' ? 'জরুরি' : insight.severity === 'review' ? 'যাচাই' : 'তথ্য'
    : insight.severity;

  return (
    <article className={`rounded-xl border p-4 sm:p-5 ${style.card}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${style.icon}`}>
          <StatusIcon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{insight.title[language]}</h3>
            <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {severityLabel}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-700">{insight.detail[language]}</p>
          <p className="mt-2 text-xs leading-5 text-slate-700">
            <strong>{bn ? 'করণীয়: ' : 'Next step: '}</strong>{insight.action[language]}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {bn ? 'উৎস: ' : 'Source: '}{insight.source[language]}
          </p>
        </div>
      </div>
    </article>
  );
};

export const HealthInsightsView: React.FC<Props> = ({
  language,
  vitals,
  medications,
  documents,
  appointments,
  onNavigate,
}) => {
  const bn = language === 'bn';
  const now = useMemo(() => new Date(), []);
  const insights = useMemo(
    () => buildHealthInsights({ vitals, medications, documents, appointments, now }),
    [vitals, medications, documents, appointments, now],
  );
  const stats = useMemo(
    () => getHealthOverviewStats({ medications, appointments, now }),
    [medications, appointments, now],
  );
  const urgentCount = insights.filter((insight) => insight.severity === 'urgent').length;

  const handleExport = () => {
    const content = buildHealthInsightsExport({
      insights,
      language,
      generatedAt: new Date(),
      counts: {
        vitalReadings: vitals.length,
        medicationRecords: medications.length,
        activeMedications: stats.activeMedicationCount,
        documents: documents.length,
        appointments: appointments.length,
        upcomingAppointments: stats.upcomingAppointmentCount,
      },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`shasthonote-health-overview-${stamp}.txt`, content);
  };

  const metrics = [
    {
      label: bn ? 'ভাইটাল রিডিং' : 'Vital readings',
      value: vitals.length,
      icon: Activity,
      iconClass: 'bg-teal-50 text-teal-800',
      tab: 'vitals',
    },
    {
      label: bn ? 'সক্রিয় ওষুধ' : 'Active medicines',
      value: stats.activeMedicationCount,
      icon: Pill,
      iconClass: 'bg-violet-50 text-violet-800',
      tab: 'medications',
    },
    {
      label: bn ? 'মেডিকেল ডকুমেন্ট' : 'Medical documents',
      value: documents.length,
      icon: FileText,
      iconClass: 'bg-cyan-50 text-cyan-800',
      tab: 'docAnalyzer',
    },
    {
      label: bn ? 'আসন্ন অ্যাপয়েন্টমেন্ট' : 'Upcoming appointments',
      value: stats.upcomingAppointmentCount,
      icon: CalendarDays,
      iconClass: 'bg-amber-50 text-amber-800',
      tab: 'appointments',
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{bn ? 'স্বাস্থ্য রেকর্ড' : 'Health records'}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {bn ? 'সংরক্ষিত স্বাস্থ্য তথ্যের সারাংশ' : 'A summary of your saved health records'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {bn
              ? 'আপনার সংরক্ষিত মাপ, ওষুধ, রিপোর্ট ও অ্যাপয়েন্টমেন্ট থেকে এই সারাংশ তৈরি হয়। এটি রোগ নির্ণয় বা চিকিৎসার নির্দেশনা নয়।'
              : 'This page summarizes your saved measurements, medicines, documents and appointments. It does not diagnose conditions or direct treatment.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('visitPack')}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <ClipboardList size={16} aria-hidden="true" />
            {bn ? 'ডাক্তার ভিজিট প্যাক' : 'Prepare visit pack'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <Download size={16} aria-hidden="true" />
            {bn ? 'সারাংশ ডাউনলোড' : 'Export overview'}
          </button>
        </div>
      </header>

      <section aria-label={bn ? 'রেকর্ডের পরিসংখ্যান' : 'Record totals'} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.tab}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            iconClass={metric.iconClass}
            onClick={() => onNavigate(metric.tab)}
          />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
        <section aria-labelledby="health-insights-heading" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="health-insights-heading" className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <Activity size={18} className="text-teal-800" aria-hidden="true" />
                {bn ? 'রেকর্ড থেকে পর্যবেক্ষণ' : 'Observations from saved records'}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {bn ? 'প্রতিটি আইটেমের উৎস ও পরবর্তী পদক্ষেপ দেখুন।' : 'Each item shows the record it came from and a possible next step.'}
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {insights.length} {bn ? 'টি পর্যবেক্ষণ' : 'items'}
            </span>
          </div>
          <div className="space-y-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} language={language} />
            ))}
          </div>
          {urgentCount > 0 && (
            <p role="status" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-900">
              {bn
                ? 'এক বা একাধিক রিডিং জরুরি রেফারেন্স-চেক ট্রিগার করেছে। অ্যাপের ফলাফল দিয়ে জরুরি পরিস্থিতি মূল্যায়ন করবেন না।'
                : 'One or more readings triggered an urgent reference check. Do not use this app to assess an emergency.'}
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck size={17} className="text-teal-800" aria-hidden="true" />
              {bn ? 'এই সারাংশ কীভাবে তৈরি হয়' : 'How this summary is built'}
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-5 text-slate-700">
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />{bn ? 'শুধু এই workspace-এ লোড করা রেকর্ড ব্যবহার করা হয়।' : 'It uses records loaded into this workspace.'}</li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />{bn ? 'পর্যবেক্ষণগুলো নির্দিষ্ট কোড করা নিয়মে তৈরি; এখানে AI দিয়ে রোগ নির্ণয় করা হয় না।' : 'Observations come from explicit rules; AI is not used here to diagnose.'}</li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />{bn ? 'তারিখ বা মান অবৈধ হলে সেই রেকর্ড বর্তমান পর্যবেক্ষণে ব্যবহার করা হয় না।' : 'Records with invalid dates or numeric values are not used for current observations.'}</li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />{bn ? 'সন্দেহ বা জরুরি অবস্থায় চিকিৎসকের পরামর্শ নিন।' : 'Ask a clinician when a result is unclear or urgent care may be needed.'}</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">{bn ? 'দ্রুত কাজ' : 'Quick actions'}</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {[
                { label: bn ? 'নতুন ভাইটাল রেকর্ড' : 'Add a vital reading', tab: 'vitals', icon: HeartPulse },
                { label: bn ? 'ওষুধের তালিকা' : 'Review medicines', tab: 'medications', icon: Pill },
                { label: bn ? 'রিপোর্ট বিশ্লেষণ' : 'Open document library', tab: 'docAnalyzer', icon: FileText },
                { label: bn ? 'অ্যাপয়েন্টমেন্ট' : 'Open appointments', tab: 'appointments', icon: CalendarDays },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.tab}
                    type="button"
                    onClick={() => onNavigate(action.tab)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:text-teal-800"
                  >
                    <span className="flex items-center gap-2"><Icon size={16} aria-hidden="true" />{action.label}</span>
                    <ArrowUpRight size={15} className="text-slate-400" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

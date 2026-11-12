import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CornerDownLeft, FileSearch, FileText, Pill, Search, Sparkles, Compass } from 'lucide-react';
import type { Language, WorkspaceMode } from '../types';
import { searchAll, type SearchableData, type SearchHit, type SearchKind } from '../utils/search';

export interface PaletteCommand {
  id: string;
  tab: string;
  workspace: WorkspaceMode;
  en: string;
  bn: string;
}

export const NAV_COMMANDS: PaletteCommand[] = [
  { id: 'dashboard', tab: 'dashboard', workspace: 'documentation', en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  { id: 'createNote', tab: 'createNote', workspace: 'documentation', en: 'New health note', bn: 'নতুন স্বাস্থ্য নোট' },
  { id: 'docAnalyzer', tab: 'docAnalyzer', workspace: 'documentation', en: 'Document analyzer', bn: 'ডকুমেন্ট বিশ্লেষক' },
  { id: 'vitals', tab: 'vitals', workspace: 'documentation', en: 'Vitals tracker', bn: 'ভাইটালস ট্র্যাকার' },
  { id: 'medications', tab: 'medications', workspace: 'documentation', en: 'Medicine reminders', bn: 'ওষুধের রিমাইন্ডার' },
  { id: 'labTrends', tab: 'labTrends', workspace: 'documentation', en: 'Lab trends', bn: 'ল্যাব ট্রেন্ড' },
  { id: 'visitPack', tab: 'visitPack', workspace: 'documentation', en: 'Doctor visit pack', bn: 'ডাক্তার ভিজিট প্যাক' },
  { id: 'timeline', tab: 'timeline', workspace: 'documentation', en: 'Health timeline', bn: 'স্বাস্থ্য টাইমলাইন' },
  { id: 'appointments', tab: 'appointments', workspace: 'documentation', en: 'Appointments', bn: 'অ্যাপয়েন্টমেন্ট' },
  { id: 'exportCenter', tab: 'exportCenter', workspace: 'documentation', en: 'Export center', bn: 'এক্সপোর্ট সেন্টার' },
  { id: 'privacyCenter', tab: 'privacyCenter', workspace: 'documentation', en: 'Privacy & data center', bn: 'প্রাইভেসি ও ডেটা সেন্টার' },
  { id: 'research', tab: 'research', workspace: 'research', en: 'Grounded research', bn: 'গ্রাউন্ডেড রিসার্চ' },
  { id: 'askRecords', tab: 'askRecords', workspace: 'research', en: 'Ask my records', bn: 'আমার রেকর্ডকে জিজ্ঞেস করুন' },
  { id: 'mindmap', tab: 'mindmap', workspace: 'research', en: 'Mind maps', bn: 'মাইন্ড ম্যাপ' },
  { id: 'studyStudio', tab: 'studyStudio', workspace: 'research', en: 'Study studio', bn: 'স্টাডি স্টুডিও' },
  { id: 'audioOverview', tab: 'audioOverview', workspace: 'research', en: 'Audio overviews', bn: 'অডিও ওভারভিউ' },
  { id: 'nearbyCare', tab: 'nearbyCare', workspace: 'research', en: 'Nearby care locator', bn: 'কাছের চিকিৎসাসেবা' },
];

const KIND_ICON: Record<SearchKind, React.ComponentType<{ className?: string }>> = {
  note: FileText,
  document: FileSearch,
  appointment: Calendar,
  study: Sparkles,
  medication: Pill,
};

const KIND_LABEL: Record<SearchKind, { en: string; bn: string }> = {
  note: { en: 'Note', bn: 'নোট' },
  document: { en: 'Document', bn: 'ডকুমেন্ট' },
  appointment: { en: 'Appointment', bn: 'অ্যাপয়েন্টমেন্ট' },
  study: { en: 'Study set', bn: 'স্টাডি সেট' },
  medication: { en: 'Medicine', bn: 'ওষুধ' },
};

type PaletteItem =
  | { type: 'command'; key: string; command: PaletteCommand }
  | { type: 'hit'; key: string; hit: SearchHit };

interface CommandPaletteProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  data: SearchableData;
  onSelectHit: (hit: SearchHit) => void;
  onNavigate: (tab: string, workspace: WorkspaceMode) => void;
}

/** Ctrl/⌘+K palette: jump to any screen or search every saved record. All local, nothing is sent anywhere. */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ language, isOpen, onClose, data, onSelectHit, onNavigate }) => {
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const needle = query.trim().toLocaleLowerCase();
    const commands = NAV_COMMANDS.filter((command) => !needle || command.en.toLowerCase().includes(needle) || command.bn.includes(needle)).map(
      (command): PaletteItem => ({ type: 'command', key: `cmd:${command.id}`, command }),
    );
    if (!needle) return commands;
    const hits = searchAll(query, data, 12).map((hit): PaletteItem => ({ type: 'hit', key: `${hit.kind}:${hit.id}`, hit }));
    return [...hits, ...commands.slice(0, 5)];
  }, [query, data]);

  useEffect(() => {
    setActive((previous) => Math.min(previous, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!isOpen) return null;

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.type === 'command') onNavigate(item.command.tab, item.command.workspace);
    else onSelectHit(item.hit);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((previous) => (items.length === 0 ? 0 : (previous + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((previous) => (items.length === 0 ? 0 : (previous - 1 + items.length) % items.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label={tr('Search and jump', 'খুঁজুন ও যান')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={tr('Search notes, reports, medicines… or jump to a screen', 'নোট, রিপোর্ট, ওষুধ খুঁজুন… বা কোনো স্ক্রিনে যান')}
            aria-label={tr('Search', 'খুঁজুন')}
            className="w-full bg-transparent py-3.5 text-sm outline-hidden"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">Esc</kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {items.length === 0 && <li className="px-4 py-8 text-center text-xs text-slate-500">{tr('Nothing found.', 'কিছু পাওয়া যায়নি।')}</li>}
          {items.map((item, index) => {
            const isActive = index === active;
            const Icon = item.type === 'command' ? Compass : KIND_ICON[item.hit.kind];
            return (
              <li key={item.key} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={`flex w-full items-start gap-3 px-4 py-2 text-left ${isActive ? 'bg-teal-50' : ''}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-900">
                      {item.type === 'command' ? tr(item.command.en, item.command.bn) : item.hit.title}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {item.type === 'command' ? tr('Go to screen', 'স্ক্রিনে যান') : `${tr(KIND_LABEL[item.hit.kind].en, KIND_LABEL[item.hit.kind].bn)} · ${item.hit.snippet}`}
                    </span>
                  </span>
                  {isActive && <CornerDownLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

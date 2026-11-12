import React from 'react';
import {
  Activity,
  Sparkles as InsightsIcon,
  BookOpen,
  FileText,
  Globe,
  AlertTriangle,
  User as UserIcon,
  LogIn,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Mic,
  FileSearch,
  Calendar,
  Layers,
  Sparkles,
  Headphones,
  MapPin,
  Clock,
  Download,
  HeartPulse,
  Pill,
  FlaskConical,
  ClipboardList,
  MessageCircleQuestion,
  Search,
} from 'lucide-react';
import { Language, WorkspaceMode, UserProfile } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  workspace: WorkspaceMode;
  onWorkspaceChange: (ws: WorkspaceMode) => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenEmergencyModal: () => void;
  onOpenSearch: () => void;
}

const DOCUMENTATION_TABS = [
  'dashboard',
  'healthInsights',
  'createNote',
  'docAnalyzer',
  'vitals',
  'medications',
  'labTrends',
  'visitPack',
  'timeline',
  'appointments',
  'exportCenter',
  'privacyCenter',
];
const RESEARCH_TABS = ['research', 'askRecords', 'mindmap', 'studyStudio', 'audioOverview', 'nearbyCare'];

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  workspace,
  onWorkspaceChange,
  currentTab,
  onTabChange,
  user,
  onSignIn,
  onSignOut,
  onOpenEmergencyModal,
  onOpenSearch,
}) => {
  const t = TRANSLATIONS[language];
  const tr = (en: string, bn: string) => (language === 'bn' ? bn : en);

  const documentationItems: Array<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string }> = [
    { id: 'dashboard', icon: Activity, label: t.nav.dashboard },
    { id: 'healthInsights', icon: InsightsIcon, label: tr('Health Insights', 'স্বাস্থ্য বিশ্লেষণ') },
    { id: 'createNote', icon: FileText, label: t.nav.createNote },
    { id: 'docAnalyzer', icon: FileSearch, label: t.nav.docAnalyzer },
    { id: 'vitals', icon: HeartPulse, label: tr('Vitals', 'ভাইটালস') },
    { id: 'medications', icon: Pill, label: tr('Medicines', 'ওষুধ') },
    { id: 'labTrends', icon: FlaskConical, label: tr('Lab Trends', 'ল্যাব ট্রেন্ড') },
    { id: 'visitPack', icon: ClipboardList, label: tr('Visit Pack', 'ভিজিট প্যাক') },
    { id: 'timeline', icon: Clock, label: t.nav.timeline },
    { id: 'appointments', icon: Calendar, label: t.nav.appointments },
    { id: 'exportCenter', icon: Download, label: t.nav.exportCenter },
    { id: 'privacyCenter', icon: ShieldCheck, label: tr('Privacy', 'প্রাইভেসি') },
  ];
  const researchItems: Array<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string }> = [
    { id: 'research', icon: BookOpen, label: t.nav.research },
    { id: 'askRecords', icon: MessageCircleQuestion, label: tr('Ask My Records', 'রেকর্ডকে জিজ্ঞেস') },
    { id: 'mindmap', icon: Layers, label: t.nav.mindmap },
    { id: 'studyStudio', icon: Sparkles, label: t.nav.studyStudio },
    { id: 'audioOverview', icon: Headphones, label: t.nav.audioOverview },
    { id: 'nearbyCare', icon: MapPin, label: t.nav.nearbyCare },
  ];
  const navItems = workspace === 'documentation' ? documentationItems : researchItems;
  const activeClass = workspace === 'documentation' ? 'bg-teal-50 text-teal-800 font-semibold' : 'bg-blue-50 text-blue-800 font-semibold';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner with Brand, Workspace Switcher, Emergency Trigger & Auth */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-500/20">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  {language === 'bn' ? 'স্বাস্থ্যনোট এআই' : 'ShasthoNote AI'}
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-slate-700 hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Dual Experience Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                onWorkspaceChange('documentation');
                if (!DOCUMENTATION_TABS.includes(currentTab)) {
                  onTabChange('dashboard');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                workspace === 'documentation'
                  ? 'bg-white text-teal-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>{t.workspaces.documentation}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onWorkspaceChange('research');
                if (!RESEARCH_TABS.includes(currentTab)) {
                  onTabChange('research');
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                workspace === 'research'
                  ? 'bg-white text-blue-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.workspaces.research}</span>
            </button>
          </div>

          {/* Right Controls: Emergency guidance, Language toggle, User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global search (Ctrl/⌘+K) */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title={tr('Search (Ctrl/⌘+K)', 'খুঁজুন (Ctrl/⌘+K)')}
              aria-label={tr('Search', 'খুঁজুন')}
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline text-slate-500">{tr('Search', 'খুঁজুন')}</span>
              <kbd className="hidden xl:inline rounded border border-slate-200 bg-white px-1 text-[10px] text-slate-500">Ctrl K</kbd>
            </button>

            {/* Emergency Guidance Trigger */}
            <button
              type="button"
              onClick={onOpenEmergencyModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="Emergency Guidance (Red Flags)"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span className="hidden md:inline font-semibold">
                {language === 'bn' ? 'জরুরি নির্দেশনা' : 'Emergency Signs'}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => onLanguageChange(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>

            {/* User Auth Info */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold ring-1 ring-teal-300">
                  {user.displayName ? user.displayName[0] : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-slate-900 leading-none">
                    {user.displayName || 'Patient'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সাইন ইন' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Navigation Sub-Bar */}
        <nav
          aria-label={tr('Workspace sections', 'ওয়ার্কস্পেসের অংশ')}
          className="flex items-center space-x-1 overflow-x-auto py-2 text-xs border-t border-slate-100 no-scrollbar"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  active ? activeClass : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

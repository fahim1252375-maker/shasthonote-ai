import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Sparkles,
  Building2,
  Navigation,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { authenticatedApiFetch } from '../lib/firebase';

interface NearbyCareViewProps {
  language: Language;
}

export const NearbyCareView: React.FC<NearbyCareViewProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const cT = t.nearbyCare;

  const [locationQuery, setLocationQuery] = useState('');
  const [specialty, setSpecialty] = useState('Diabetology & Internal Medicine');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [placesData, setPlacesData] = useState<any>(null);

  const handleSearch = async () => {
    if (!locationQuery.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    setPlacesData(null);
    try {
      const res = await authenticatedApiFetch('/api/gemini/nearby-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationQuery,
          specialty,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Nearby care search is unavailable.');
      }
      setPlacesData(json.data);
    } catch (err) {
      console.error('Nearby care search error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Nearby care search is unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-teal-600" />
          <span>{cT.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {cT.subtitle}
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'এলাকা বা শহর:' : 'Area or City:'}
            </label>
            <input
              type="text"
              value={locationQuery}
              maxLength={200}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder={cT.searchPlaceholder}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'চিকিৎসা বিভাগ / স্পেশালিটি:' : 'Medical Specialty:'}
            </label>
            <input
              type="text"
              value={specialty}
              maxLength={120}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder={cT.specialtyPlaceholder}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !locationQuery.trim()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            <span>{isLoading ? 'Searching Google Maps...' : cT.findBtn}</span>
          </button>
        </div>
        {errorMessage && <p role="alert" className="text-xs text-rose-700">{errorMessage}</p>}
      </div>

      {/* Results */}
      {placesData && (
        <div className="space-y-3">
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">AI-generated place suggestions may be incomplete or outdated. Confirm the facility, address, availability, and contact details directly before travelling.</p>
          {/* Facilities List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {placesData.recommendations?.map((facility: any, i: number) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-teal-300 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {facility.name}
                    </h3>
                  </div>

                  <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-semibold">
                    {facility.type}
                  </span>

                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{facility.address}</span>
                  </p>

                  {facility.practicalTip && (
                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200/60">
                      <span className="font-semibold block text-[11px] text-teal-800">
                        Visit Preparation Tip:
                      </span>
                      {facility.practicalTip}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                  <span>AI-suggested · Verify before visiting</span>
                  <Navigation className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Consultation Checklist */}
          {placesData.preparationChecklist && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>{cT.prepChecklistTitle}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {placesData.preparationChecklist.map((item: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-teal-50/40 rounded-xl border border-teal-100 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

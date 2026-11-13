import React, { useEffect, useState } from 'react';
import {
  FileSearch,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  FileText,
  Table,
  Check,
  RotateCcw,
} from 'lucide-react';
import { SourceDocument, Language } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { authenticatedApiFetch } from '../lib/firebase';

interface DocumentAnalyzerViewProps {
  language: Language;
  onSaveDocument: (doc: SourceDocument) => Promise<void> | void;
  selectedDocument?: SourceDocument | null;
}

export const DocumentAnalyzerView: React.FC<DocumentAnalyzerViewProps> = ({
  language,
  onSaveDocument,
  selectedDocument,
}) => {
  const t = TRANSLATIONS[language];
  const docT = t.docAnalyzer;

  const [docName, setDocName] = useState(
    selectedDocument?.name || 'Complete Blood Count (CBC) - Lab Report.pdf'
  );
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(selectedDocument?.id || null);

  useEffect(() => {
    setEditingDocumentId(selectedDocument?.id || null);
  }, [selectedDocument?.id]);
  const [category, setCategory] = useState<'lab_report' | 'prescription' | 'discharge_summary'>(
    (selectedDocument?.category as any) || 'lab_report'
  );
  const [textContent, setTextContent] = useState(selectedDocument?.extractedText || '');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState('image/jpeg');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Analysis result
  const [analysis, setAnalysis] = useState<any>(
    selectedDocument
      ? {
          documentType: selectedDocument.category,
          plainLanguageExplanation: selectedDocument.analysisSummary,
          extractedFindings: selectedDocument.findings,
          ocrConfidence: selectedDocument.ocrConfidence || 'High (98%)',
        }
      : null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load realistic synthetic demo
  const handleLoadSample = (sampleType: 'cbc' | 'prescription') => {
    setEditingDocumentId(null);
    setImageBase64(null);
    setDocumentMimeType('image/jpeg');
    setPdfBase64(null);
    setImagePreview(null);
    if (sampleType === 'cbc') {
      setDocName('Complete Blood Count (CBC) - Diagnostic Lab.pdf');
      setCategory('lab_report');
      setTextContent(`PATIENT REPORT: Complete Blood Count & Routine Hemogram
Date of Specimen: 2026-10-24 | Lab ID: LAB-DH-89241
Referring Physician: Dr. K. M. Rahman, MBBS, FCPS

RESULTS:
- Hemoglobin (Hb): 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL) [LOW]
- Total RBC Count: 3.9 x 10^12/L (Reference: 4.0 - 5.2 x 10^12/L) [LOW]
- Packed Cell Volume (PCV/Hematocrit): 34.5% (Reference: 36.0 - 46.0%) [LOW]
- Mean Corpuscular Volume (MCV): 76.2 fL (Reference: 80.0 - 96.0 fL) [LOW]
- Mean Corpuscular Hemoglobin (MCH): 25.1 pg (Reference: 27.0 - 32.0 pg) [LOW]
- Total WBC Count: 6,800 /uL (Reference: 4,000 - 11,000 /uL) [NORMAL]
- Platelet Count: 245,000 /uL (Reference: 150,000 - 450,000 /uL) [NORMAL]
- ESR (Westergren): 18 mm in 1st hr (Reference: 0 - 20 mm) [NORMAL]

IMPRESSION:
Microcytic hypochromic indices suggestive of mild iron deficiency or hemoglobinopathy trait. Serum ferritin and iron studies recommended for clinical correlation.`);
    } else {
      setDocName('Outpatient Medical Prescription.jpg');
      setCategory('prescription');
      setTextContent(`PRESCRIPTION RECORD:
Date: 2026-11-02
Doctor: Dr. Nusrat Jahan, FCPS (Medicine)
Diagnosis: Uncontrolled Hypertension + Dyslipidemia

Rx:
1. Tab. Amlodipine 5mg - 1+0+0 (Daily morning after breakfast) x 30 days
2. Tab. Atorvastatin 10mg - 0+0+1 (Daily night after dinner) x 30 days
3. Tab. Paracetamol 500mg - SOS if fever or headache (Max 3 daily)

Advice:
- Low sodium diet (< 2g sodium/day)
- 30 mins brisk walking daily
- Recheck BP in 2 weeks`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditingDocumentId(null);
    setDocName(file.name);
    setErrorMsg(null);
    setIsReadingFile(false);
    setAnalysis(null);
    setTextContent('');
    setImageBase64(null);
    setDocumentMimeType(file.type || 'image/jpeg');
    setPdfBase64(null);
    setImagePreview(null);

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Please choose a file smaller than 10 MB.');
      e.target.value = '';
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (file.type.startsWith('image/')) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrorMsg('Please upload a JPEG, PNG, or WEBP image.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      setIsReadingFile(true);
      reader.onloadend = () => setIsReadingFile(false);
      reader.onload = () => {
        const fullBase64 = String(reader.result || '');
        setImagePreview(fullBase64);
        setImageBase64(fullBase64.split(',')[1] || null);
      };
      reader.onerror = () => setErrorMsg('Could not read the selected image.');
      reader.readAsDataURL(file);
    } else if (isPdf) {
      const reader = new FileReader();
      setIsReadingFile(true);
      reader.onloadend = () => setIsReadingFile(false);
      reader.onload = () => {
        const fullBase64 = String(reader.result || '');
        setPdfBase64(fullBase64.split(',')[1] || null);
      };
      reader.onerror = () => setErrorMsg('Could not read the selected PDF.');
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      setIsReadingFile(true);
      reader.onloadend = () => setIsReadingFile(false);
      reader.onload = () => setTextContent(String(reader.result || ''));
      reader.onerror = () => setErrorMsg('Could not read the selected text file.');
      reader.readAsText(file);
    } else {
      setErrorMsg('Unsupported file. Upload a PDF, JPEG, PNG, WEBP, or TXT file.');
      e.target.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (isReadingFile) {
      setErrorMsg('Please wait until the selected file has finished loading.');
      return;
    }
    if (!textContent && !imageBase64 && !pdfBase64) {
      setErrorMsg('Please select a file or load a synthetic sample first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await authenticatedApiFetch('/api/gemini/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          pdfBase64,
          mimeType: imageBase64 ? documentMimeType : pdfBase64 ? 'application/pdf' : undefined,
          textContent,
          category,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data && typeof json.data === 'object') {
        setAnalysis(json.data);
        const findings = Array.isArray(json.data.extractedFindings)
          ? json.data.extractedFindings.slice(0, 5).filter((finding: any) => finding && typeof finding.testOrItem === 'string' && typeof finding.value === 'string')
            .map((finding: any) => ({
              testOrItem: finding.testOrItem.slice(0, 256),
              value: finding.value.slice(0, 256),
              ...(typeof finding.referenceRange === 'string' ? { referenceRange: finding.referenceRange.slice(0, 256) } : {}),
              status: (typeof finding.status === 'string' ? finding.status : 'Unclear').slice(0, 64),
            }))
          : [];

        // Save into documents collection
        const newDoc: SourceDocument = {
          id: editingDocumentId || `doc-${Date.now()}`,
          userId: '', // Parent assigns the authenticated UID or guest ID before persistence.
          name: docName.slice(0, 256),
          category,
          fileType: imageBase64 ? 'image' : pdfBase64 ? 'pdf' : 'text',
          extractedText: textContent || [
            json.data.documentType || docName,
            ...(Array.isArray(json.data.extractedFindings) ? json.data.extractedFindings.map((finding: any) => `${finding.testOrItem || 'Item'}: ${finding.value || 'Not extracted'}${finding.referenceRange ? ` (Reference: ${finding.referenceRange})` : ''} [${finding.status || 'Unclear'}]`) : []),
            json.data.plainLanguageExplanation || '',
          ].filter(Boolean).join('\n'),
          analysisSummary: typeof json.data.plainLanguageExplanation === 'string' ? json.data.plainLanguageExplanation.slice(0, 50000) : '',
          ocrConfidence: typeof json.data.ocrConfidence === 'string' ? json.data.ocrConfidence.slice(0, 64) : 'Unknown',
          findings,
          createdAt: new Date().toISOString(),
        };
        await onSaveDocument(newDoc);
        setEditingDocumentId(newDoc.id);
      } else {
        setErrorMsg(json.error || 'Document analysis could not be completed.');
      }
    } catch (err) {
      console.error('Document analysis error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Document analysis service is unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-cyan-600" />
          <span>{docT.title}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {docT.subtitle}
        </p>
      </div>

      {/* Upload & Sample Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              {language === 'bn' ? 'ডকুমেন্ট টাইপ:' : 'Document Category:'}
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              aria-label="Document Category"
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-medium"
            >
              <option value="lab_report">Laboratory Test (CBC, Lipid, HbA1c)</option>
              <option value="prescription">Doctor Prescription</option>
              <option value="discharge_summary">Hospital Discharge Summary</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {language === 'bn' ? 'নমুনা টেস্ট:' : 'Quick Demo:'}
            </span>
            <button
              type="button"
              onClick={() => handleLoadSample('cbc')}
              className="px-2.5 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition-colors"
            >
              CBC Lab Report
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('prescription')}
              className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
            >
              Prescription
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <label className="border-2 border-dashed border-slate-200 hover:border-cyan-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
          <Upload className="w-8 h-8 text-cyan-600 mb-2" />
          <span className="text-sm font-semibold text-slate-700">
            {docT.uploadDropzone}
          </span>
          <span className="text-xs text-slate-600 mt-1">
            {docT.supportedTypes}
          </span>
          <input
            type="file"
            accept=".pdf,image/*,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {docName && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200/70">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="font-semibold truncate">{docName}</span>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isReadingFile}
              className="shrink-0 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>{isAnalyzing ? docT.extracting : 'Analyze with AI'}</span>
            </button>
          </div>
        )}

        {imagePreview && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-600 mb-1">
              {language === 'bn' ? 'ছবি প্রিভিউ:' : 'Image Preview:'}
            </p>
            <img
              src={imagePreview}
              alt="Uploaded Document"
              className="max-h-60 rounded-xl border border-slate-200 object-contain bg-black/5 p-2"
            />
          </div>
        )}

        {textContent && !imagePreview && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-600 mb-1">
              {language === 'bn' ? 'ডকুমেন্টের টেক্সট:' : 'Document Text Preview:'}
            </p>
            <pre className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-sans max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-700">
              {textContent}
            </pre>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>
        )}
      </div>

      {/* Analysis Output Results */}
      {analysis && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {docT.resultsTitle}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">OCR Reliability:</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                  {analysis.ocrConfidence || 'High'}
                </span>
              </div>
            </div>

            {/* Findings Table */}
            {analysis.extractedFindings && analysis.extractedFindings.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{docT.findingsTable}</span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Parameter / Item</th>
                        <th className="py-2.5 px-3">Result Value</th>
                        <th className="py-2.5 px-3">Standard Reference Range</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.extractedFindings.map((row: any, i: number) => {
                        const isFlagged =
                          row.status && row.status.toLowerCase().includes('low') ||
                          row.status && row.status.toLowerCase().includes('flag') ||
                          row.status && row.status.toLowerCase().includes('high');

                        return (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {row.testOrItem}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {row.value}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {row.referenceRange || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isFlagged
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {row.status || 'Normal'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Plain Language Explanation */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {docT.plainExplanation}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100 leading-relaxed">
                {analysis.plainLanguageExplanation}
              </p>
            </div>

            {/* Questions to Discuss with Doctor */}
            {analysis.clarificationForDoctor && analysis.clarificationForDoctor.length > 0 && (
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
                <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>{docT.clarifications}</span>
                </h3>
                <ul className="list-disc list-inside text-xs text-blue-800/95 space-y-1">
                  {analysis.clarificationForDoctor.map((q: string, idx: number) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clinical Disclaimer */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{docT.disclaimer}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

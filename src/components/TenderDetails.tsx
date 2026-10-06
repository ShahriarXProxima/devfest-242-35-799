/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { useAppStore, useT, SAMPLE_TENDER_JSON } from '../store';
import { FileCode, Upload, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Robust JSON Validator for requirements.json schema.
 */
function validateRequirementsJson(data: any, lang: 'en' | 'bn'): string | null {
  if (!data || typeof data !== 'object') {
    return lang === 'en' ? 'Invalid JSON file structure.' : 'ভুল জেএসওএন ফাইল স্ট্রাকচার।';
  }
  if (!data.tender || typeof data.tender !== 'object') {
    return lang === 'en' ? 'Missing "tender" object in JSON.' : 'জেএসওএন ফাইলে "tender" অবজেক্ট অনুপস্থিত।';
  }
  
  const { tender_id, title, procuring_entity, bidder, submission_deadline } = data.tender;
  if (!tender_id || !title || !procuring_entity || !bidder || !submission_deadline) {
    return lang === 'en'
      ? 'The "tender" object is missing required fields (tender_id, title, procuring_entity, bidder, submission_deadline).'
      : '"tender" অবজেক্টে প্রয়োজনীয় তথ্য অনুপস্থিত (tender_id, title, procuring_entity, bidder, submission_deadline)।';
  }

  if (!Array.isArray(data.requirements)) {
    return lang === 'en' ? 'Missing or invalid "requirements" array in JSON.' : 'জেএসওএন ফাইলে "requirements" তালিকা অনুপস্থিত বা ভুল।';
  }

  for (let i = 0; i < data.requirements.length; i++) {
    const req = data.requirements[i];
    if (!req || typeof req !== 'object') {
      return lang === 'en' 
        ? `Requirement at list index ${i} is not a valid object.` 
        : `ইনডেক্স ${i}-এ থাকা দলিল চাহিদাটি সঠিক অবজেক্ট নয়।`;
    }
    if (req.id === undefined || req.order === undefined || req.mandatory === undefined || req.has_expiry === undefined) {
      return lang === 'en'
        ? `Requirement at list index ${i} is missing mandatory attributes (id, order, mandatory, has_expiry).`
        : `ইনডেক্স ${i}-এ থাকা দলিল চাহিদায় আবশ্যক ক্ষেত্র অনুপস্থিত (id, order, mandatory, has_expiry)।`;
    }
    if (typeof req.order !== 'number') {
      return lang === 'en'
        ? `Requirement at list index ${i} has an invalid "order" property (must be a number).`
        : `ইনডেক্স ${i}-এ থাকা দলিল চাহিদার "order" সংখ্যা হতে হবে।`;
    }
  }

  return null; // Valid
}

/**
 * Dynamic date formatter helper.
 */
export function formatDeadlineDate(dateStr: string, lang: 'en' | 'bn'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  try {
    return date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', options);
  } catch (e) {
    return dateStr;
  }
}

export default function TenderDetails() {
  const { state, dispatch } = useAppStore();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseRequirementsFile = async (file: File) => {
    setErrorMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const validationError = validateRequirementsJson(json, state.language);
      if (validationError) {
        setErrorMsg(validationError);
        return;
      }

      dispatch({
        type: 'LOAD_REQUIREMENTS',
        payload: {
          tender: json.tender,
          requirements: json.requirements
        }
      });
    } catch (err: any) {
      setErrorMsg(state.language === 'en'
        ? `Failed to load: ${err.message || 'Invalid JSON format'}`
        : `লোড করা যায়নি: ${err.message || 'ভুল জেএসওএন ফরম্যাট'}`
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseRequirementsFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.json')) {
      parseRequirementsFile(file);
    } else if (file) {
      setErrorMsg(state.language === 'en'
        ? 'Invalid file type. Please upload a .json file.'
        : 'ভুল ফাইল টাইপ। অনুগ্রহ করে একটি .json ফাইল আপলোড করুন।'
      );
    }
  };

  const handleLoadDemo = () => {
    dispatch({
      type: 'LOAD_REQUIREMENTS',
      payload: SAMPLE_TENDER_JSON,
    });
    setErrorMsg(null);
  };

  return (
    <section id="details" className="bg-white border border-slate-200 rounded-xl p-6 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
            {t('tender_details')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {state.language === 'en' ? 'Tender project specifications & constraints' : 'দরপত্রের বিবরণ ও শর্তাবলী'}
          </p>
        </div>
        
        {!state.tender && (
          <button
            onClick={handleLoadDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            {t('load_sample_json')}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold flex items-start gap-2 animate-pulse">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {state.tender ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-50/50 rounded-lg p-4 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('tender_id')} / {t('submission_deadline')}</span>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
              <span className="font-mono font-semibold text-slate-800 text-sm bg-slate-100/80 px-2 py-0.5 rounded">
                {state.tender.tender_id}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {t('submission_deadline')}: <strong className="text-slate-800 font-sans">{formatDeadlineDate(state.tender.submission_deadline, state.language)}</strong>
              </span>
            </div>
            
            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project Title</span>
              <h3 className="text-base font-semibold text-slate-900 mt-1 leading-snug">
                {state.tender.title}
              </h3>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 p-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('procuring_entity')}</span>
            <span className="text-sm font-medium text-slate-800 block mt-1">{state.tender.procuring_entity}</span>
          </div>

          <div className="col-span-1 md:col-span-2 p-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('bidder_name')}</span>
            <span className="text-sm font-medium text-slate-800 block mt-1">{state.tender.bidder}</span>
          </div>
          
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              {state.language === 'en' 
                ? `${state.requirements.length} requirements loaded successfully.` 
                : `${state.requirements.length}টি দলিল চাহিদা সফলভাবে লোড হয়েছে।`}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer"
            >
              {state.language === 'en' ? 'Load another JSON...' : 'অন্য জেএসওএন ফাইল লোড করুন...'}
            </button>
          </div>
        </div>
      ) : (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-50/50' 
              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10'
          }`}
        >
          <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 transition-colors mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            {state.language === 'en' ? 'Open requirements.json or drop it here' : 'requirements.json খুলুন অথবা এখানে ড্রপ করুন'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {state.language === 'en' 
              ? 'Select the custom JSON containing standard requirements checklist metadata to initialize matching.' 
              : 'দরপত্রের জন্য প্রস্তুত করা নির্দিষ্ট চাহিদার বিবরণ ফাইলটি নির্বাচন করুন।'}
          </p>
          <div className="mt-4 text-xs font-mono text-indigo-600 bg-white shadow-xs border border-indigo-100 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
            {state.language === 'en' ? 'Open requirements.json' : 'requirements.json ফাইল ওপেন করুন'}
          </div>
        </div>
      )}

      {/* Hidden input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* JSON schema guide for user reference if no tender is loaded */}
      {!state.tender && (
        <div className="mt-6 bg-slate-50 border border-slate-100 rounded-lg p-4">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            {state.language === 'en' ? 'File Format Help (JSON Scheme)' : 'ফাইল ফরম্যাট সংক্রান্ত নির্দেশনা'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            {state.language === 'en' 
              ? 'Tenders must define a "tender" object with metadata and a "requirements" list. Requirements flag mandatory items and fields requiring expiry validations.' 
              : 'জেএসওএন ফাইলে একটি "tender" অবজেক্ট এবং একটি "requirements" তালিকা থাকতে হবে। প্রতিটি আইটেমে ম্যান্ডেটরি এবং মেয়াদোত্তীর্ণ যাচাইকরণ অপশন দেওয়া যায়।'}
          </p>
          <details className="mt-2 text-[11px] text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700 hover:text-indigo-600">
              {state.language === 'en' ? 'View Sample JSON Code' : 'নমুনা জেএসওএন কোড দেখুন'}
            </summary>
            <pre className="mt-2 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto max-h-48 leading-relaxed">
{`{
  "tender": {
    "tender_id": "T-2026-904",
    "title": "Supply and Installation of Solar Irrigation Systems",
    "procuring_entity": "Department of Renewable Energy Development",
    "bidder": "GreenTech Power Solutions Ltd.",
    "submission_deadline": "2026-11-30"
  },
  "requirements": [
    {
      "id": "req-01",
      "order": 1,
      "title_en": "Valid Trade License",
      "title_bn": "বৈধ ট্রেড লাইসেন্স",
      "mandatory": true,
      "has_expiry": true
    }
  ]
}`}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

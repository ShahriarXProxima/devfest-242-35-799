/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore, useT } from '../store';
import { HelpCircle, X, RefreshCw, Layers, ShieldCheck, FileCheck, Check, Sparkles } from 'lucide-react';
import { loadSamplePack } from '../lib/samplePackLoader';

export default function Header() {
  const { state, dispatch } = useAppStore();
  const t = useT();
  const [showHelp, setShowHelp] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const handleLoadSamplePack = async () => {
    setShowDemoMenu(false);
    await loadSamplePack({
      dispatch,
      currentFiles: state.files,
      addAlert: (msg) => dispatch({ type: 'ADD_ALERT', payload: msg }),
      setProcessing: (val) => dispatch({ type: 'SET_GLOBAL_PROCESSING', payload: val }),
      t
    });
  };

  const handleToggleLanguage = () => {
    dispatch({
      type: 'SET_LANGUAGE',
      payload: state.language === 'en' ? 'bn' : 'en',
    });
  };

  const handleReset = () => {
    if (window.confirm(t('start_over_confirm'))) {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark (Single Text Element) */}
          <a href="#" className="text-lg font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>TenderBuilder</span>
          </a>

          {/* Zone 2: Navigation Anchor Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <a href="#details" className="hover:text-slate-900 transition-colors whitespace-nowrap">
              {t('tender_details')}
            </a>
            <a href="#checklist" className="hover:text-slate-900 transition-colors whitespace-nowrap">
              {t('requirements_checklist')}
            </a>
            <a href="#files" className="hover:text-slate-900 transition-colors whitespace-nowrap">
              {t('uploaded_files')}
            </a>
            <a href="#package" className="hover:text-slate-900 transition-colors whitespace-nowrap">
              {t('generate_package')}
            </a>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-3">
            {/* "How it Works" help toggle */}
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors rounded-lg cursor-pointer font-sans"
              title={t('how_it_works')}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('how_it_works')}</span>
            </button>

            {/* Demo Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors rounded-lg cursor-pointer font-sans border border-amber-200/60 bg-amber-50/30"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Demo</span>
              </button>
              
              {showDemoMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDemoMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
                    <button
                      onClick={handleLoadSamplePack}
                      disabled={state.globalProcessing}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {state.globalProcessing ? 'Loading Sample Pack...' : 'Load Sample Pack'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Segmented EN | বাংলা switcher */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none">
              <button
                onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: 'en' })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  state.language === 'en'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_LANGUAGE', payload: 'bn' })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  state.language === 'bn'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                বাংলা
              </button>
            </div>

            {/* Start Over Action with warning check */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer font-sans"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t('start_over_btn')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Fully Localized Interactive Help Dialog Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fade-in" 
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                {t('how_it_works_title')}
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] font-sans">
              {/* Step 1 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-xs font-mono shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t('how_it_works_step1_title')}</h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{t('how_it_works_step1_desc')}</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-xs font-mono shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t('how_it_works_step2_title')}</h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{t('how_it_works_step2_desc')}</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-xs font-mono shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t('how_it_works_step3_title')}</h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{t('how_it_works_step3_desc')}</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-xs font-mono shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{t('how_it_works_step4_title')}</h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{t('how_it_works_step4_desc')}</p>
                </div>
              </div>

              {/* Privacy block */}
              <div className="mt-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-900">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">{t('secure_localized_title')}</h4>
                  <p className="text-[11px] text-emerald-800 font-medium leading-relaxed mt-1">
                    {t('secure_localized_desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer font-sans"
              >
                {t('close_modal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

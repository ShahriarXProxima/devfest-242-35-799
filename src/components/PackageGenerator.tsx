/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, useT, useRequirementsStatus } from '../store';
import { buildPackage } from '../lib/pdfBuilder';
import { renderPdfPageToCanvas } from '../lib/pdfInfo';
import { isBlocking } from '../lib/status';
import { Tender } from '../types';
import { FileDown, CheckCircle, AlertTriangle, ListOrdered, Sparkles, RefreshCw, X, Eye } from 'lucide-react';

/**
 * Thumbnail Previewer for the Compiled PDF's Page 1 (Coversheet).
 * Runs fully offline safely on canvas.
 */
function CompiledPdfPreview({ bytes }: { bytes: Uint8Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!canvasRef.current) return;
      setLoading(true);
      try {
        await renderPdfPageToCanvas(bytes, 1, canvasRef.current, 0.45);
      } catch (err) {
        console.error('Failed to render coversheet thumbnail:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    render();
    return () => {
      active = false;
    };
  }, [bytes]);

  return (
    <div className="relative w-32 h-44 bg-slate-100 rounded-lg border border-slate-350 overflow-hidden flex items-center justify-center shadow-md shrink-0">
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-xs font-semibold text-slate-400">
          ...
        </span>
      )}
      <canvas ref={canvasRef} className="w-full h-full object-cover" />
    </div>
  );
}

export default function PackageGenerator() {
  const { state } = useAppStore();
  const t = useT();
  const { isAllValid, statuses, totalFilesSize } = useRequirementsStatus();

  // Calculate counts for the sticky footer
  const mandatoryReqs = state.requirements.filter(r => r.mandatory);
  const readyMandatoryCount = mandatoryReqs.filter(r => statuses[r.id] === 'ok').length;
  const totalMandatory = mandatoryReqs.length;

  const [compiling, setCompiling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compiledPdf, setCompiledPdf] = useState<Uint8Array | null>(null);
  const [genSignature, setGenSignature] = useState<string>('');

  // Signature calculation to detect if checklist state changed after compiling
  const currentSignature = JSON.stringify({
    matches: state.matches,
    expiry: state.expiryDates,
    fileIds: state.files.map(f => f.id)
  });

  const isOutdated = compiledPdf !== null && genSignature !== '' && genSignature !== currentSignature;

  // Clear compiled package if reset is triggered
  useEffect(() => {
    if (!state.tender) {
      setCompiledPdf(null);
      setGenSignature('');
    }
  }, [state.tender]);

  // Compile Blocker Lists with ordering details
  const blockerItems: Array<{ id: string; label: string; order: number; reason: string }> = [];
  if (state.tender) {
    state.requirements.forEach(req => {
      const s = statuses[req.id] || 'missing';
      if (isBlocking(s)) {
        const title = state.language === 'bn' ? (req.title_bn || req.title_en) : (req.title_en || req.title_bn);
        let reasonStr = '';
        if (s === 'missing') reasonStr = state.language === 'en' ? 'document missing' : 'দলিল সংযুক্ত নেই';
        if (s === 'expired') reasonStr = state.language === 'en' ? 'document expired' : 'দলিলটি মেয়াদোত্তীর্ণ';
        if (s === 'expiry_needed') reasonStr = state.language === 'en' ? 'expiry date required' : 'মেয়াদের তারিখ প্রয়োজন';

        blockerItems.push({
          id: req.id,
          order: req.order,
          label: title,
          reason: reasonStr
        });
      }
    });
  }

  const isBlocked = blockerItems.length > 0 || !state.tender || state.requirements.length === 0;

  const scrollToRow = (reqId: string) => {
    const el = document.getElementById(`row-${reqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToPackageSection = () => {
    const el = document.getElementById('package');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCompile = () => {
    if (!state.tender) return;
    setCompiling(true);
    setErrorMsg(null);

    // Yield control to UI thread briefly so compilation spinner renders first
    setTimeout(async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const bytes = await buildPackage({
          tender: state.tender as Tender,
          requirements: state.requirements,
          matches: state.matches,
          files: state.files,
          generatedAt: todayStr
        });

        setCompiledPdf(bytes);
        setGenSignature(currentSignature);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(t('err_generate_failed'));
      } finally {
        setCompiling(false);
      }
    }, 120);
  };

  const handleDownload = () => {
    if (!compiledPdf || !state.tender) return;

    try {
      const blob = new Blob([compiledPdf as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Sanitise illegal filename characters: replace / \ ? % * : | " < > with _
      const safeTenderId = state.tender.tender_id.replace(/[\/\\?%*:|"<>\s]/g, '_');
      const filename = `${safeTenderId}_Package.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean resources
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to trigger package download', e);
    }
  };

  if (!state.tender) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 py-12">
        <FileDown className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700">{t('generate_package')}</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          {t('no_tender_loaded')}
        </p>
      </div>
    );
  }

  // Calculate live TOC start page numbers for the successes display
  let cumulativePage = 1; // cover sheet is page 1
  const successToc: Array<{ order: number; title: string; start: number; file: string }> = [];

  const sortedReqs = [...state.requirements].sort((a, b) => a.order - b.order);
  sortedReqs.forEach(req => {
    const fileId = state.matches[req.id];
    if (fileId) {
      const file = state.files.find(f => f.id === fileId);
      if (file) {
        successToc.push({
          order: req.order,
          title: state.language === 'bn' ? (req.title_bn || req.title_en) : (req.title_en || req.title_bn),
          start: cumulativePage + 1,
          file: file.name
        });
        cumulativePage += file.pageCount;
      }
    }
  });

  return (
    <>
      <section id="package" className="bg-white border border-slate-200 rounded-xl p-6 transition-all scroll-mt-20">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
            {t('generate_package')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {state.language === 'en'
              ? 'Compile, pagination stamp, and download the finalized tender package PDF offline'
              : 'দরপত্রের দলিলসমূহ একত্রিত করে চূড়ান্ত ও সুবিন্যস্ত কভার পেজসহ ডাউনলোড করুন'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* --- MAIN GENERATION OR SUCCESS CARD VIEWER --- */}
        {compiledPdf ? (
          <div className="space-y-6">
            {/* SUCCESS DASHBOARD CARD */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start ${
              isOutdated 
                ? 'bg-amber-50/40 border-amber-200' 
                : 'bg-emerald-50/30 border-emerald-250/60'
            }`}>
              <div className="flex gap-3">
                {isOutdated ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-sans">
                    {isOutdated ? t('regenerate_warning') : t('success_panel_title')}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {state.language === 'en'
                      ? `Assembled package contains ${cumulativePage} pages total.`
                      : `তৈরিকৃত ফাইলটিতে মোট ${cumulativePage}টি পৃষ্ঠা রয়েছে।`}
                  </p>
                </div>
              </div>

              {isOutdated && (
                <button
                  onClick={handleCompile}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 font-sans"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {state.language === 'en' ? 'Regenerate Package' : 'পুনরায় তৈরি করুন'}
                </button>
              )}
            </div>

            {/* COMPILED FILES TOC SUMMARY & VISUAL COVERSHEET PREVIEW */}
            <div className="flex flex-col sm:flex-row gap-6 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
              {/* PDF coversheet canvas preview */}
              <div className="mx-auto sm:mx-0 shrink-0">
                <CompiledPdfPreview bytes={compiledPdf} />
              </div>

              {/* Compilation TOC blueprint */}
              <div className="flex-1 min-w-0 font-sans">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2.5">
                  {t('assembly_guidelines')}
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 text-slate-500 font-mono">
                    <span className="font-semibold text-slate-600">00. {t('cover_page_title')}</span>
                    <span>pp. 1</span>
                  </div>
                  
                  {successToc.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between text-xs py-1.5 border-b border-slate-200/50 text-slate-700 font-mono">
                      <div className="truncate mr-3">
                        <span className="font-semibold block text-slate-800">
                          {item.order.toString().padStart(2, '0')}. {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                          file: {item.file}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800 whitespace-nowrap">
                        {t('doc_start_page_label')} {item.start}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* DOWNLOAD TRIGGER ACTION BUTTON */}
            <button
              onClick={handleDownload}
              className={`w-full py-4 px-6 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                isOutdated
                  ? 'bg-amber-100 text-amber-800 border border-amber-250 hover:bg-amber-200/55'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <FileDown className="w-4.5 h-4.5" />
              <span>{t('download_package_btn')}</span>
            </button>
          </div>
        ) : (
          /* COMPILATION TRIGGER AND BLOCKERS REASONS VIEWER */
          <div className="space-y-6">
            {/* Blocker details list box */}
            {isBlocked ? (
              <div className="p-4 bg-red-50/40 border border-red-100 rounded-xl font-sans">
                <h4 className="text-xs font-bold text-red-950 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                  {t('cannot_generate_yet')}
                </h4>
                <ul className="space-y-1.5 pl-1.5">
                  {blockerItems.map((item) => (
                    <li 
                      key={item.id} 
                      onClick={() => scrollToRow(item.id)}
                      className="text-xs text-red-800 hover:text-red-950 cursor-pointer font-medium hover:underline flex items-center gap-2 leading-relaxed animate-fade-in"
                    >
                      <span className="text-red-400 select-none">•</span>
                      <span>
                        #{item.order.toString().padStart(2, '0')}. {item.label} ({item.reason})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2 font-sans text-emerald-900">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t('ready_to_generate')}
                </span>
              </div>
            )}

            {/* Spinner or main compiler trigger */}
            {compiling ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3 font-sans">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-600">
                  {t('compiling_spinner')}
                </p>
              </div>
            ) : (
              <button
                disabled={isBlocked}
                onClick={handleCompile}
                className={`w-full py-4 px-6 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  isBlocked
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Sparkles className="w-4.5 h-4.5" />
                <span>
                  {state.language === 'en' ? 'Assemble & Build Package' : 'প্যাকেজ তৈরি করুন'}
                </span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* --- STICKY VIEWPORT FOOTER BAR --- */}
      {/* 15% Mobile Sticky Height Cap satisfied: bar is only 52px tall, visible only when tender exists */}
      {state.tender && (
        <div className="fixed bottom-0 left-0 right-0 z-45 bg-white border-t border-slate-200/80 shadow-2xl px-4 py-2.5 flex items-center justify-between gap-4 font-sans animate-slide-up sm:px-6 md:px-8">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
              {state.language === 'en' ? 'Requirements checklist' : 'দলিল সংযুক্তির অগ্রগতি'}
            </span>
            <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
              {t('progress_bar_ready').replace('{ready}', readyMandatoryCount.toString()).replace('{total}', totalMandatory.toString())}
            </span>
          </div>

          <button
            onClick={compiledPdf ? handleDownload : scrollToPackageSection}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs inline-flex items-center gap-1.5 ${
              compiledPdf
                ? isOutdated
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : isBlocked
                  ? 'bg-slate-150 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            disabled={!compiledPdf && isBlocked}
          >
            {compiledPdf ? (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>{isOutdated ? (state.language === 'en' ? 'Regenerate' : 'পুনরায় তৈরি') : (state.language === 'en' ? 'Download PDF' : 'ডাউনলোড করুন')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('sticky_generate_btn')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}

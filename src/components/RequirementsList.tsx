/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, useT, useRequirementsStatus } from '../store';
import { STATUS_UI_CONFIGS, isBlocking } from '../lib/status';
import { canMatchFile } from '../lib/matching';
import { renderPdfPageToCanvas } from '../lib/pdfInfo';
import { UploadedFile, Requirement, Status } from '../types';
import { ShieldCheck, X, Eye, Filter, ShieldAlert, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * PDF Previewer Modal
 */
interface PreviewModalProps {
  file: UploadedFile;
  onClose: () => void;
  language: 'en' | 'bn';
}

function PreviewModal({ file, onClose, language }: PreviewModalProps) {
  const [page, setPage] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!canvasRef.current) return;
      setRendering(true);
      try {
        await renderPdfPageToCanvas(file.bytes, page, canvasRef.current, 0.75);
      } catch (err) {
        console.error('Failed to render page inside preview modal:', err);
      } finally {
        if (active) setRendering(false);
      }
    };
    render();
    return () => {
      active = false;
    };
  }, [file, page]);

  return (
    <div 
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fade-in" 
      role="dialog" 
      aria-modal="true" 
      aria-label="PDF Preview Panel"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/60">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-800 truncate max-w-[340px]" title={file.name}>
            {language === 'en' ? `PDF Preview: ${file.name}` : `পিডিএফ প্রিভিউ: ${file.name}`}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PDF Render Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex justify-center items-center relative min-h-[360px]">
          {rendering && (
            <div className="absolute inset-0 bg-slate-100/70 flex items-center justify-center text-xs font-semibold text-slate-500 font-sans">
              {language === 'en' ? 'Loading Page...' : 'পৃষ্ঠা লোড হচ্ছে...'}
            </div>
          )}
          <canvas ref={canvasRef} className="shadow-lg bg-white rounded border border-slate-200/60 max-w-full" />
        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg bg-white transition-colors cursor-pointer font-sans"
          >
            {language === 'en' ? 'Previous' : 'পূর্ববর্তী'}
          </button>
          
          <span className="text-xs font-mono font-bold text-slate-700">
            {language === 'en' ? `Page ${page} of ${file.pageCount}` : `পৃষ্ঠা ${page} এর ${file.pageCount}`}
          </span>

          <button
            disabled={page >= file.pageCount}
            onClick={() => setPage(p => Math.min(file.pageCount, p + 1))}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg bg-white transition-colors cursor-pointer font-sans"
          >
            {language === 'en' ? 'Next' : 'পরবর্তী'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequirementsList() {
  const { state, dispatch } = useAppStore();
  const t = useT();
  const { statuses, isAllValid } = useRequirementsStatus();
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  
  // Filtering states
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [showOnlyProblems, setShowOnlyProblems] = useState<boolean>(false);
  const [showBlockingLogs, setShowBlockingLogs] = useState<boolean>(true);

  const handleMatchChange = (requirementId: string, fileId: string) => {
    if (fileId) {
      dispatch({
        type: 'SET_MATCH',
        payload: { requirementId, fileId },
      });
    } else {
      dispatch({
        type: 'CLEAR_MATCH',
        payload: requirementId,
      });
    }
  };

  const handleExpiryChange = (requirementId: string, date: string) => {
    dispatch({
      type: 'SET_EXPIRY',
      payload: { requirementId, date },
    });
  };

  const handleClearMatch = (requirementId: string) => {
    dispatch({
      type: 'CLEAR_MATCH',
      payload: requirementId,
    });
  };

  // Determine active step index for the 3-step guide strip
  let activeStep = 1;
  if (state.tender) {
    activeStep = state.files.length === 0 ? 2 : 3;
  }

  // Calculate status statistics
  const totalMandatory = state.requirements.filter(r => r.mandatory).length;
  const readyMandatoryCount = state.requirements.filter(r => r.mandatory && statuses[r.id] === 'ok').length;

  const counts: Record<'all' | Status, number> = {
    all: state.requirements.length,
    ok: 0,
    missing: 0,
    expired: 0,
    expiry_needed: 0,
    not_provided: 0
  };

  state.requirements.forEach(req => {
    const s = statuses[req.id] || 'missing';
    counts[s]++;
  });

  // Extract list of all blocking problems in plain language
  const blockingIssues: string[] = [];
  state.requirements.forEach(req => {
    const s = statuses[req.id] || 'missing';
    const reqTitle = state.language === 'bn' ? (req.title_bn || req.title_en) : (req.title_en || req.title_bn);
    if (isBlocking(s)) {
      if (s === 'missing') {
        blockingIssues.push(t('err_msg_missing').replace('{order}', req.order.toString()).replace('{title}', reqTitle));
      } else if (s === 'expired') {
        blockingIssues.push(t('err_msg_expired').replace('{order}', req.order.toString()).replace('{title}', reqTitle));
      } else if (s === 'expiry_needed') {
        blockingIssues.push(t('err_msg_expiry_needed').replace('{order}', req.order.toString()).replace('{title}', reqTitle));
      }
    }
  });

  // Filter criteria logic
  const filteredRequirements = state.requirements.filter(req => {
    const s = statuses[req.id] || 'missing';
    
    // Problem filter overrides status filter if checked
    if (showOnlyProblems) {
      return isBlocking(s);
    }
    
    if (statusFilter !== 'all') {
      return s === statusFilter;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 3-Step Guided Workflow strip at top of checklist panel */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        <div className={`py-2 px-3 text-center rounded-lg font-sans text-xs font-bold transition-all ${
          activeStep === 1 
            ? 'bg-white text-indigo-700 shadow-xs' 
            : 'text-slate-500'
        }`}>
          {t('guide_step_1')}
        </div>
        <div className={`py-2 px-3 text-center rounded-lg font-sans text-xs font-bold transition-all ${
          activeStep === 2 
            ? 'bg-white text-indigo-700 shadow-xs animate-pulse' 
            : activeStep > 2 
              ? 'text-emerald-600 font-semibold' 
              : 'text-slate-400'
        }`}>
          {t('guide_step_2')}
        </div>
        <div className={`py-2 px-3 text-center rounded-lg font-sans text-xs font-bold transition-all ${
          activeStep === 3 
            ? 'bg-white text-indigo-700 shadow-xs' 
            : 'text-slate-400'
        }`}>
          {t('guide_step_3')}
        </div>
      </div>

      {/* Empty States guidance prior to load */}
      {!state.tender ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center py-16">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-30 text-indigo-600 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {state.language === 'en' ? 'Step 1: Open requirements.json' : 'ধাপ ১: চাহিদাপত্র requirements.json লোড করুন'}
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            {state.language === 'en'
              ? 'Tender package compiling requires checklist parameters. Please upload the custom requirements JSON or load our sample template above.'
              : 'টেন্ডার প্যাকেজ প্রস্তুত করতে চাহিদাপত্রের বিবরণ প্রয়োজন। অনুগ্রহ করে আপনার দরপত্র জেএসওএন ফাইলটি খুলুন অথবা উপরের ডেমো চাহিদাপত্র লোড করুন।'}
          </p>
        </div>
      ) : state.files.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center py-16">
          <UploadIcon animate className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {state.language === 'en' ? 'Step 2: Add your PDF files' : 'ধাপ ২: আপনার দরপত্রের পিডিএফ ফাইলগুলো আপলোড করুন'}
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            {state.language === 'en'
              ? 'Checklist loaded. Next, upload all of your PDF tender folders in the "Uploaded Files" box below to start document matchmaking.'
              : 'দলিলের তালিকা লোড হয়েছে। এবার নিচের ফাইল আপলোডার বক্সে আপনার দরপত্রের প্রয়োজনীয় পিডিএফগুলো আপলোড করুন।'}
          </p>
        </div>
      ) : (
        <section id="checklist" className="bg-white border border-slate-200 rounded-xl p-6 transition-all">
          {/* Main header row */}
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
              {t('requirements_checklist')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {state.language === 'en' 
                ? 'Map uploaded PDFs to corresponding tender checklist requirements and manage expiry' 
                : 'চাহিদাপত্রের দলিলের সাথে আপলোডকৃত ফাইলের জোড় তৈরি করুন ও মেয়াদ ঠিক করুন'}
            </p>
          </div>

          {/* Progress Summary bar */}
          <div className="mb-6 p-4 bg-slate-50/80 border border-slate-200/60 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {state.language === 'en' ? 'Fulfilment Progress' : 'সংযুক্তির অগ্রগতি'}
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-0.5 font-sans">
                  {t('progress_bar_ready').replace('{ready}', readyMandatoryCount.toString()).replace('{total}', totalMandatory.toString())}
                </h3>
              </div>
              
              {/* Optional Show only problems toggle */}
              <label className="inline-flex items-center gap-2 cursor-pointer font-sans select-none">
                <input
                  type="checkbox"
                  checked={showOnlyProblems}
                  onChange={(e) => {
                    setShowOnlyProblems(e.target.checked);
                    if (e.target.checked) setStatusFilter('all');
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:outline-hidden w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-600">
                  {t('toggle_show_problems')}
                </span>
              </label>
            </div>

            {/* Clickable counts filters chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-4 border-t border-slate-200/60 pt-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                Filter:
              </span>

              {(['all', 'ok', 'missing', 'expired', 'expiry_needed', 'not_provided'] as const).map((filterOpt) => {
                const isActive = statusFilter === filterOpt && !showOnlyProblems;
                const count = counts[filterOpt];
                
                // Active custom styling
                let activeColor = 'bg-indigo-600 text-white';
                if (filterOpt === 'ok') activeColor = 'bg-emerald-600 text-white';
                if (filterOpt === 'missing' || filterOpt === 'expired') activeColor = 'bg-rose-600 text-white';
                if (filterOpt === 'expiry_needed') activeColor = 'bg-amber-600 text-white';

                return (
                  <button
                    key={filterOpt}
                    disabled={showOnlyProblems}
                    onClick={() => setStatusFilter(filterOpt)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                      isActive 
                        ? activeColor 
                        : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <span>
                      {filterOpt === 'all' ? t('filter_all') : 
                       filterOpt === 'ok' ? t('filter_ok') : 
                       filterOpt === 'missing' ? t('filter_missing') : 
                       filterOpt === 'expired' ? t('filter_expired') : 
                       filterOpt === 'expiry_needed' ? t('filter_expiry_needed') : t('filter_not_provided')}
                    </span>
                    <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible logs list of all blocking problems */}
          {blockingIssues.length > 0 && (
            <div className="mb-6 border border-red-200 bg-red-50/30 rounded-xl overflow-hidden animate-fade-in font-sans">
              <button 
                onClick={() => setShowBlockingLogs(!showBlockingLogs)}
                className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-red-50/20"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0" />
                  <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                    {t('blocking_header')} ({blockingIssues.length})
                  </span>
                </div>
                {showBlockingLogs ? <ChevronUp className="w-4 h-4 text-red-600" /> : <ChevronDown className="w-4 h-4 text-red-600" />}
              </button>
              
              {showBlockingLogs && (
                <div className="px-4 pb-4 pt-1 border-t border-red-100 font-sans">
                  <ul className="space-y-1.5">
                    {blockingIssues.map((issue, idx) => (
                      <li key={idx} className="text-xs text-red-800 flex items-start gap-1.5 font-medium leading-relaxed">
                        <span className="text-red-500 select-none">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* DESKTOP LAPTOP LISTING VIEW (hidden on mobile, optimized for 1280px screen widths) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px] font-sans">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50">
                  <th className="py-3 px-4 w-[6%]">Order</th>
                  <th className="py-3 px-4 w-[28%]">{t('requirement_col')}</th>
                  <th className="py-3 px-4 w-[14%]">{t('status_col')}</th>
                  <th className="py-3 px-4 w-[26%]">{t('assigned_file_col')}</th>
                  <th className="py-3 px-4 w-[26%]">{t('expiry_date_col')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequirements.map((req) => {
                  const status = statuses[req.id] || 'missing';
                  const config = STATUS_UI_CONFIGS[status];
                  const matchedFileId = state.matches[req.id] || '';
                  const expiryDate = state.expiryDates[req.id] || '';

                  // Detailed expired explanation sentence
                  const isExpired = status === 'expired';

                  return (
                    <tr key={req.id} id={`row-${req.id}`} className="hover:bg-slate-50/40 transition-colors">
                      {/* Order */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-500 font-medium align-top">
                        #{req.order.toString().padStart(2, '0')}
                      </td>

                      {/* Requirement Name */}
                      <td className="py-4 px-4 pr-6 align-top">
                        <div className="text-xs font-semibold text-slate-800 leading-snug">
                          {state.language === 'bn' 
                            ? (req.title_bn || req.title_en || '') 
                            : (req.title_en || req.title_bn || '')
                          }
                        </div>
                        {/* Unboxed inline meta tags with dot separators */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                          <span className={req.mandatory ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
                            {req.mandatory ? t('mandatory_tag') : t('optional_tag')}
                          </span>
                          {req.has_expiry && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span className="text-amber-600 font-medium">{t('has_expiry_tag')}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status Badges with color & symbol indicators */}
                      <td className="py-4 px-4 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono select-none" aria-hidden="true">{config.icon}</span>
                            <span className={`text-xs ${config.textClass}`}>
                              {t(config.labelKey)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* File Selector */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2 max-w-[240px]">
                          <select
                            value={matchedFileId}
                            onChange={(e) => handleMatchChange(req.id, e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-indigo-500 focus:outline-hidden text-slate-700 truncate cursor-pointer focus:ring-1 focus:ring-indigo-500"
                            aria-label={t('assigned_file_col')}
                          >
                            <option value="">{t('select_file_placeholder')}</option>
                            {state.files.map((file) => {
                              const isSelfMatched = matchedFileId === file.id;

                              // Check if matched to any OTHER requirement
                              const matchedElsewhereId = Object.keys(state.matches).find(
                                rId => state.matches[rId] === file.id && rId !== req.id
                              );
                              const matchedElsewhereReq = matchedElsewhereId 
                                ? state.requirements.find(r => r.id === matchedElsewhereId) 
                                : null;

                              // Check duplicate rules
                              const matchCheck = canMatchFile(file.id, req.id, state);
                              const isBlockedByDuplicate = !matchCheck.allowed;

                              const disabled = (matchedElsewhereReq !== null) || isBlockedByDuplicate;

                              let labelSuffix = '';
                              if (matchedElsewhereReq) {
                                const elsewhereTitle = state.language === 'bn'
                                  ? (matchedElsewhereReq.title_bn || matchedElsewhereReq.title_en)
                                  : (matchedElsewhereReq.title_en || matchedElsewhereReq.title_bn);
                                labelSuffix = ` - [${t('already_used_prefix')} "${elsewhereTitle}"]`;
                              } else if (isBlockedByDuplicate) {
                                labelSuffix = ` - [${t('blocked_duplicate')}]`;
                              }

                              return (
                                <option 
                                  key={file.id} 
                                  value={file.id} 
                                  disabled={disabled && !isSelfMatched}
                                >
                                  {file.name} ({file.pageCount} p.){labelSuffix}
                                </option>
                              );
                            })}
                          </select>
                          
                          {matchedFileId && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  const f = state.files.find(item => item.id === matchedFileId);
                                  if (f) setPreviewFile(f);
                                }}
                                className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                                title={t('preview_btn')}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleClearMatch(req.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title={t('clear_match_tooltip')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiry Date input or "Link file first" note */}
                      <td className="py-4 px-4 align-top">
                        {req.has_expiry ? (
                          matchedFileId ? (
                            <div className="flex flex-col gap-1 max-w-[200px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={expiryDate}
                                  onChange={(e) => handleExpiryChange(req.id, e.target.value)}
                                  className="text-xs bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:border-indigo-500 focus:outline-hidden text-slate-700 font-mono focus:ring-1 focus:ring-indigo-500 w-full cursor-pointer"
                                  aria-label={t('expiry_date_col')}
                                />
                                {expiryDate && (
                                  <button
                                    onClick={() => handleExpiryChange(req.id, '')}
                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
                                    title={state.language === 'en' ? 'Clear Date' : 'তারিখ মুছুন'}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {state.tender && (
                                <span className="text-[9px] text-slate-400 font-mono mt-0.5 block leading-none">
                                  {state.language === 'en' ? 'Deadline: ' : 'শেষ সময়: '}{state.tender.submission_deadline}
                                </span>
                              )}
                              {/* Expired plain explanation sentence underneath */}
                              {isExpired && (
                                <p className="text-[10px] text-red-600 font-medium leading-normal mt-1 max-w-[160px] animate-pulse">
                                  {t('expired_detail_text')
                                    .replace('{expiry}', expiryDate)
                                    .replace('{deadline}', state.tender?.submission_deadline || '')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {state.language === 'en' ? 'Link file first' : 'ফাইল সংযুক্ত করুন'}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-300 font-mono font-medium block">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RESPONSIVE MOBILE CARD-LIST VIEW (displays under 768px screen sizes by stacking) */}
          <div className="md:hidden space-y-4">
            {filteredRequirements.map((req) => {
              const status = statuses[req.id] || 'missing';
              const config = STATUS_UI_CONFIGS[status];
              const matchedFileId = state.matches[req.id] || '';
              const expiryDate = state.expiryDates[req.id] || '';
              const isExpired = status === 'expired';

              return (
                <div 
                  key={req.id} 
                  id={`row-${req.id}`}
                  className={`p-4 border rounded-xl space-y-3.5 transition-all ${
                    isBlocking(status) ? 'border-red-100 bg-red-50/10' : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Top order + mandatory tags */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <span className="font-mono text-xs text-slate-400 font-bold">
                      #{req.order.toString().padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className={req.mandatory ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
                        {req.mandatory ? t('mandatory_tag') : t('optional_tag')}
                      </span>
                      {req.has_expiry && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-600 font-semibold">{t('has_expiry_tag')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title and live status badge */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 leading-snug">
                      {state.language === 'bn' 
                        ? (req.title_bn || req.title_en || '') 
                        : (req.title_en || req.title_bn || '')
                      }
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-xs font-mono select-none" aria-hidden="true">{config.icon}</span>
                      <span className={`text-xs ${config.textClass}`}>
                        {t(config.labelKey)}
                      </span>
                    </div>
                  </div>

                  {/* PDF Match dropdown selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                      {t('assigned_file_col')}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={matchedFileId}
                        onChange={(e) => handleMatchChange(req.id, e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:border-indigo-500 focus:outline-hidden text-slate-700 truncate cursor-pointer"
                      >
                        <option value="">{t('select_file_placeholder')}</option>
                        {state.files.map((file) => {
                          const isSelfMatched = matchedFileId === file.id;

                          const matchedElsewhereId = Object.keys(state.matches).find(
                            rId => state.matches[rId] === file.id && rId !== req.id
                          );
                          const matchedElsewhereReq = matchedElsewhereId 
                            ? state.requirements.find(r => r.id === matchedElsewhereId) 
                            : null;

                          const matchCheck = canMatchFile(file.id, req.id, state);
                          const isBlockedByDuplicate = !matchCheck.allowed;

                          const disabled = (matchedElsewhereReq !== null) || isBlockedByDuplicate;

                          let labelSuffix = '';
                          if (matchedElsewhereReq) {
                            const elsewhereTitle = state.language === 'bn'
                              ? (matchedElsewhereReq.title_bn || matchedElsewhereReq.title_en)
                              : (matchedElsewhereReq.title_en || matchedElsewhereReq.title_bn);
                            labelSuffix = ` - [${t('already_used_prefix')} "${elsewhereTitle}"]`;
                          } else if (isBlockedByDuplicate) {
                            labelSuffix = ` - [${t('blocked_duplicate')}]`;
                          }

                          return (
                            <option 
                              key={file.id} 
                              value={file.id} 
                              disabled={disabled && !isSelfMatched}
                            >
                              {file.name} ({file.pageCount} p.){labelSuffix}
                            </option>
                          );
                        })}
                      </select>
                      
                      {matchedFileId && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const f = state.files.find(item => item.id === matchedFileId);
                              if (f) setPreviewFile(f);
                            }}
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleClearMatch(req.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expiry inputs (mobile stack) */}
                  {req.has_expiry && (
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      {matchedFileId ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                            {state.language === 'en' ? 'Expiry Date' : 'মেয়াদের তারিখ'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={expiryDate}
                              onChange={(e) => handleExpiryChange(req.id, e.target.value)}
                              className="text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:border-indigo-500 focus:outline-hidden text-slate-700 font-mono w-full"
                            />
                            {expiryDate && (
                              <button
                                onClick={() => handleExpiryChange(req.id, '')}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {state.tender && (
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">
                              {state.language === 'en' ? 'Deadline: ' : 'শেষ সময়: '}{state.tender.submission_deadline}
                            </span>
                          )}
                          {isExpired && (
                            <p className="text-[10px] text-red-600 font-medium mt-1 animate-pulse leading-normal">
                              {t('expired_detail_text')
                                .replace('{expiry}', expiryDate)
                                .replace('{deadline}', state.tender?.submission_deadline || '')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {state.language === 'en' ? 'Link file first to set expiry' : 'মেয়াদ সেট করতে ফাইল সংযুক্ত করুন'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Render the full screen modal if triggered */}
      {previewFile && (
        <PreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)} 
          language={state.language} 
        />
      )}
    </div>
  );
}

/**
 * Native Custom Icon represent step loaders.
 */
function UploadIcon({ className = '', animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`${className} ${animate ? 'animate-bounce' : ''}`}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

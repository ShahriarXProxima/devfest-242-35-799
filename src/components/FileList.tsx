/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useAppStore, useT, useRequirementsStatus } from '../store';
import { renderPdfPageToCanvas } from '../lib/pdfInfo';
import { processFilesPipeline } from '../lib/fileProcessor';
import { Upload, Trash2, ShieldAlert, FileText, X, AlertTriangle } from 'lucide-react';

/**
 * Clean helper to render a small canvas preview of the first page of the PDF.
 * Uses bytes.slice() to avoid detachment bugs.
 */
function PdfPreviewThumbnail({ bytes }: { bytes: Uint8Array }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!canvasRef.current) return;
      setLoading(true);
      try {
        await renderPdfPageToCanvas(bytes, 1, canvasRef.current, 0.4);
      } catch (err) {
        console.error('Failed to render thumbnail preview', err);
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
    <div className="relative w-14 h-18 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-[9px] text-slate-400">
          ...
        </span>
      )}
      <canvas ref={canvasRef} className="w-full h-full object-cover" />
    </div>
  );
}

/**
 * Format bytes to readable string (KB, MB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface UploadAlert {
  id: string;
  message: string;
}

export default function FileList() {
  const { state, dispatch } = useAppStore();
  const { totalFilesSize, totalPagesCount } = useRequirementsStatus();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const isProcessing = processing || state.globalProcessing;

  const duplicateFilesCount = state.files.filter(f => f.duplicateGroupId !== null).length;

  const addAlert = (message: string) => {
    dispatch({ type: 'ADD_ALERT', payload: message });
  };

  const removeAlert = (id: string) => {
    dispatch({ type: 'REMOVE_ALERT', payload: id });
  };

  const processFiles = async (fileList: FileList | File[]) => {
    setProcessing(true);
    try {
      await processFilesPipeline({
        fileList,
        currentFiles: state.files,
        addAlert,
        dispatch,
        t
      });
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
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
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (fileId: string) => {
    dispatch({
      type: 'REMOVE_FILE',
      payload: fileId
    });
  };

  return (
    <section id="files" className="bg-white border border-slate-200 rounded-xl p-6 transition-all">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
          {t('uploaded_files')}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {state.language === 'en' 
            ? 'Manage and inspect up to 30 PDF documents matching tender specifications' 
            : 'দরপত্রের কাগজপত্রের সাথে মেলানোর জন্য ৩০টি পর্যন্ত পিডিএফ ফাইল আপলোড করুন'}
        </p>
      </div>

      {/* Dismissible upload alerts */}
      {state.alerts.length > 0 && (
        <div className="space-y-2 mb-4">
          {state.alerts.map(alert => (
            <div 
              key={alert.id}
              className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{alert.message}</span>
              </div>
              <button
                onClick={() => removeAlert(alert.id)}
                className="p-1 hover:bg-amber-100 rounded-md transition-colors text-amber-600 cursor-pointer"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Large Drag & Drop Canvas */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50/50' 
            : 'border-slate-200 hover:border-indigo-400 bg-slate-50/30 hover:bg-indigo-50/10'
        }`}
      >
        <Upload className={`w-10 h-10 mb-3 transition-transform ${isProcessing ? 'animate-bounce text-indigo-500' : 'text-slate-400 group-hover:scale-105'}`} />
        <p className="text-sm font-semibold text-slate-700">
          {isProcessing 
            ? (state.language === 'en' ? 'Verifying & processing PDF files...' : 'পিডিএফ যাচাইকরণ ও প্রক্রিয়াকরণ করা হচ্ছে...') 
            : t('drag_drop_placeholder')}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {t('limit_warning')}
        </p>
        
        <button
          type="button"
          disabled={isProcessing}
          className="mt-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-lg px-4 py-2 cursor-pointer transition-colors"
        >
          {t('choose_files_btn')}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        multiple
        className="hidden"
      />

      {/* File Stats Summary Row */}
      {state.files.length > 0 && (
        <div className="grid grid-cols-3 gap-4 my-6 p-4 bg-slate-50/80 border border-slate-100 rounded-xl">
          <div className="text-center md:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t('total_files')}</span>
            <span className="text-base font-mono font-semibold text-slate-800">{state.files.length} / 30</span>
          </div>
          <div className="text-center md:text-left border-x border-slate-200/60 px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t('total_size')}</span>
            <span className={`text-base font-mono font-semibold ${totalFilesSize > 45 * 1024 * 1024 ? 'text-amber-600' : 'text-slate-800'}`}>
              {formatBytes(totalFilesSize)} / 50 MB
            </span>
          </div>
          <div className="text-center md:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t('total_pages')}</span>
            <span className="text-base font-mono font-semibold text-slate-800">{totalPagesCount} {t('pages')}</span>
          </div>
        </div>
      )}

      {/* Summary Banner for Duplicates */}
      {duplicateFilesCount > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3 text-amber-950 animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold font-sans">
              {t('duplicate_banner_title').replace('{count}', duplicateFilesCount.toString())}
            </h4>
            <p className="text-[11px] text-amber-800 mt-1 leading-relaxed font-medium">
              {t('duplicate_banner_desc')}
            </p>
          </div>
        </div>
      )}

      {/* File List Grid */}
      {state.files.length > 0 ? (
        <div className="space-y-3 mt-4">
          {state.files.map((file) => {
            // Check if file is matched to a specific requirement
            const matchedReq = state.requirements.find(r => state.matches[r.id] === file.id);

            return (
              <div
                key={file.id}
                className={`flex items-start justify-between gap-4 p-3 border rounded-xl hover:shadow-xs transition-shadow ${
                  file.duplicateGroupId ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex gap-3 min-w-0">
                  {/* Dynamic canvas visual preview */}
                  <PdfPreviewThumbnail bytes={file.bytes} />
                  
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate max-w-md" title={file.name}>
                      {file.name}
                    </h4>
                    
                    {/* Tiny metadata with unboxed layout format */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono">
                      <span>{formatBytes(file.size)}</span>
                      <span aria-hidden="true">•</span>
                      <span>{file.pageCount} {t('pages')}</span>
                      <span aria-hidden="true">•</span>
                      <span className="truncate max-w-[120px]" title={file.hash}>
                        hash:{file.hash.slice(0, 12)}
                      </span>
                    </div>

                    {/* Linked requirement or "Not matched" badge (Zero-Pill compliant) */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {matchedReq ? (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5 font-semibold flex items-center gap-1">
                          <span>{t('matched_to_prefix')}:</span>
                          <span className="truncate max-w-[200px]">
                            {state.language === 'bn' 
                              ? (matchedReq.title_bn || matchedReq.title_en) 
                              : (matchedReq.title_en || matchedReq.title_bn)
                            }
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium font-sans">
                          {t('not_matched_tag')}
                        </span>
                      )}
                    </div>

                    {/* Duplicate warning with other filenames */}
                    {file.duplicateGroupId && (
                      <div className="flex items-start gap-1.5 mt-2.5 text-[11px] text-amber-700 font-semibold bg-amber-100/30 border border-amber-200/50 rounded-lg px-2.5 py-1.5 max-w-xl">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span>{t('duplicate_of_prefix')}: </span>
                          <span className="font-sans font-medium text-amber-800">
                            {state.files
                              .filter(f => f.hash === file.hash && f.id !== file.id)
                              .map(f => f.name)
                              .join(', ')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove action */}
                <button
                  onClick={() => handleRemove(file.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title={t('remove_file_tooltip')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 bg-slate-50/40 border border-slate-100 rounded-xl mt-4">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium">{t('no_files')}</p>
        </div>
      )}
    </section>
  );
}

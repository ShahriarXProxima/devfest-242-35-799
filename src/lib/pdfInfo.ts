/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use the local worker file bundled by Vite instead of a CDN URL.
// This avoids version mismatches and CDN availability issues.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

/**
 * Safely clean up a PDFDocumentProxy.
 * pdfjs-dist v6 removed destroy() in favor of cleanup().
 */
async function cleanupPdf(pdf: pdfjsLib.PDFDocumentProxy): Promise<void> {
  try {
    if (typeof pdf.cleanup === 'function') {
      await pdf.cleanup();
    } else if (typeof (pdf as any).destroy === 'function') {
      await (pdf as any).destroy();
    }
  } catch {
    // Ignore cleanup errors — they don't affect the parsed result.
  }
}

/**
 * Parses an uploaded PDF and retrieves its total page count.
 * Safe from the ArrayBuffer detachment bug.
 * Falls back to parsing without a worker if the worker fails.
 */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const slicedBytes = bytes.slice();
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: slicedBytes,
      useWorkerFetch: false,
    });
    const pdf = await loadingTask.promise;
    const count = pdf.numPages;
    await cleanupPdf(pdf);
    return count;
  } catch (firstError) {
    // Fallback: try again with the worker disabled entirely
    console.warn('PDF worker failed, retrying without worker:', firstError);
    try {
      const fallbackBytes = bytes.slice();
      const loadingTask = pdfjsLib.getDocument({
        data: fallbackBytes,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableAutoFetch: true,
      });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;
      await cleanupPdf(pdf);
      return count;
    } catch (secondError) {
      console.error('PDF parsing failed even without worker:', secondError);
      throw secondError;
    }
  }
}

/**
 * Renders the first page of a PDF to a canvas element for offline visual preview.
 * Safe from the ArrayBuffer detachment bug.
 */
export async function renderPdfPageToCanvas(
  bytes: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 0.8
): Promise<void> {
  const slicedBytes = bytes.slice();
  try {
    const loadingTask = pdfjsLib.getDocument({ data: slicedBytes, useWorkerFetch: false });
    const pdf = await loadingTask.promise;
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const renderContext: any = {
        canvasContext: ctx,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
    } finally {
      await cleanupPdf(pdf);
    }
  } catch (error) {
    console.error('Error rendering PDF page preview:', error);
    // Render a placeholder warning inside the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.height = 150;
      canvas.width = 120;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 120, 150);
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px sans-serif';
      ctx.fillText('Preview Fail', 10, 75);
    }
  }
}

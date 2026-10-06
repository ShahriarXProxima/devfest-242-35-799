/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjsLib from 'pdfjs-dist';

// Dynamically set worker source to match the exact installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Parses an uploaded PDF and retrieves its total page count.
 * Safe from the ArrayBuffer detachment bug.
 */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  const slicedBytes = bytes.slice();
  try {
    const loadingTask = pdfjsLib.getDocument({ data: slicedBytes });
    const pdf = await loadingTask.promise;
    const count = pdf.numPages;
    // Free resource
    await (pdf as any).destroy();
    return count;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw new Error('Invalid or corrupted PDF file');
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
    const loadingTask = pdfjsLib.getDocument({ data: slicedBytes });
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
      await (pdf as any).destroy();
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

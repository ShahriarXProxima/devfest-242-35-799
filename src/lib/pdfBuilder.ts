/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Tender, Requirement, UploadedFile } from '../types';

interface BuildPackageParams {
  tender: Tender;
  requirements: Requirement[];
  matches: Record<string, string>;
  files: UploadedFile[];
  generatedAt: string; // YYYY-MM-DD
}

interface BuildTenderParams {
  tender: Tender;
  requirements: Requirement[];
  files: UploadedFile[];
  matches: Record<string, string>;
}

/**
 * Sanitises input strings to standard WinAnsiEncoding bounds.
 * Replaces non-ASCII or high-Unicode characters with '?' to prevent Helvetica drawing crashes.
 */
function sanitiseText(text: string | undefined): string {
  if (!text) return '';
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    // basic Western ASCII range
    if (code > 127) {
      return '?';
    }
    return char;
  }).join('');
}

/**
 * High-tolerance helper to modify page boxes safely, protecting against pdf-lib typing variations.
 */
function safeSetMediaBox(page: any, x: number, y: number, w: number, h: number) {
  try {
    page.setMediaBox(x, y, w, h);
  } catch (e) {
    try {
      page.setMediaBox({ x, y, width: w, height: h });
    } catch (e2) {
      console.error('Failed to adjust page MediaBox', e2);
    }
  }
}

function safeSetCropBox(page: any, x: number, y: number, w: number, h: number) {
  try {
    page.setCropBox(x, y, w, h);
  } catch (e) {
    try {
      page.setCropBox({ x, y, width: w, height: h });
    } catch (e2) {
      console.error('Failed to adjust page CropBox', e2);
    }
  }
}

/**
 * Pure, robust PDF Builder taking full inputs, calculating Y upfront, and managing footer space.
 */
export async function buildPackage({
  tender,
  requirements,
  matches,
  files,
  generatedAt
}: BuildPackageParams): Promise<Uint8Array> {
  // Create output PDF
  const mergedDoc = await PDFDocument.create();
  
  // Embed Helvetica
  const fontHelvetica = await mergedDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);
  
  // --- STEP 1: CALCULATE CUMULATIVE OFFSETS & TOTAL PAGES Y ---
  const sortedReqs = [...requirements].sort((a, b) => a.order - b.order);
  const includedReqs = sortedReqs.filter(req => !!matches[req.id]);
  
  let cumulativePageCount = 1; // cover page is index 1
  const docsToAppend: Array<{ req: Requirement; file: UploadedFile; startPage: number }> = [];

  for (const req of includedReqs) {
    const fileId = matches[req.id];
    const file = files.find(f => f.id === fileId);
    if (file) {
      docsToAppend.push({
        req,
        file,
        startPage: cumulativePageCount + 1, // document pages start after cover
      });
      cumulativePageCount += file.pageCount;
    }
  }

  const Y = cumulativePageCount; // Total pages in the final package

  // --- STEP 2: COVER PAGE (A4 PORTRAIT, ALWAYS IN ENGLISH) ---
  const coverPage = mergedDoc.addPage([595.275, 841.89]);
  const { width: cWidth, height: cHeight } = coverPage.getSize();

  // Draw header block
  coverPage.drawRectangle({
    x: 0,
    y: cHeight - 20,
    width: cWidth,
    height: 20,
    color: rgb(30 / 255, 58 / 255, 138 / 255), // Navy
  });

  coverPage.drawText("TENDER SUBMISSION PACKAGE", {
    x: 50,
    y: cHeight - 80,
    size: 22,
    font: fontHelveticaBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255), // Dark Slate
  });

  coverPage.drawLine({
    start: { x: 50, y: cHeight - 92 },
    end: { x: cWidth - 50, y: cHeight - 92 },
    thickness: 1.5,
    color: rgb(30 / 255, 58 / 255, 138 / 255),
  });

  // Render tender parameters
  let currentY = cHeight - 130;
  const drawMetaRow = (label: string, val: string) => {
    coverPage.drawText(label, {
      x: 50,
      y: currentY,
      size: 10,
      font: fontHelveticaBold,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });
    
    // Wrap long values
    const valueText = sanitiseText(val);
    coverPage.drawText(valueText.length > 50 ? valueText.slice(0, 47) + '...' : valueText, {
      x: 180,
      y: currentY,
      size: 10.5,
      font: fontHelvetica,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });
    currentY -= 20;
  };

  drawMetaRow("Tender ID:", tender.tender_id);
  drawMetaRow("Project Title:", tender.title);
  drawMetaRow("Procuring Entity:", tender.procuring_entity);
  drawMetaRow("Submitted By:", tender.bidder);
  drawMetaRow("Submission Deadline:", tender.submission_deadline);
  drawMetaRow("Assembled Date:", generatedAt);

  // Table of Contents Section
  currentY -= 15;
  coverPage.drawText("TABLE OF CONTENTS / ASSEMBLING BLUEPRINT", {
    x: 50,
    y: currentY,
    size: 11,
    font: fontHelveticaBold,
    color: rgb(30 / 255, 58 / 255, 138 / 255),
  });

  coverPage.drawLine({
    start: { x: 50, y: currentY - 5 },
    end: { x: cWidth - 50, y: currentY - 5 },
    thickness: 1,
    color: rgb(226 / 255, 232 / 255, 240 / 255),
  });

  currentY -= 22;

  // Auto-shrink rows so everything fits on the cover page (even with 30 files)
  const N = docsToAppend.length;
  const availableHeight = currentY - 60; // leave bottom margin
  const rowHeight = N > 0 ? Math.min(18, Math.max(10, Math.floor(availableHeight / N))) : 18;
  const itemFontSize = N > 0 ? Math.min(10, Math.max(7, Math.floor(rowHeight * 0.6))) : 10;

  docsToAppend.forEach((item, idx) => {
    const num = `${(idx + 1).toString().padStart(2, '0')}.`;
    const title = sanitiseText(item.req.title_en);
    const fname = sanitiseText(item.file.name);

    coverPage.drawText(num, {
      x: 50,
      y: currentY,
      size: itemFontSize,
      font: fontHelveticaBold,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });

    const maxTitleLen = Math.floor((cWidth - 260) / (itemFontSize * 0.65));
    const finalTitle = title.length > maxTitleLen ? title.slice(0, maxTitleLen - 3) + '...' : title;

    coverPage.drawText(finalTitle, {
      x: 72,
      y: currentY,
      size: itemFontSize,
      font: fontHelvetica,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });

    const maxFnameLen = Math.floor(120 / (itemFontSize * 0.55));
    const finalFname = fname.length > maxFnameLen ? fname.slice(0, maxFnameLen - 3) + '...' : fname;

    coverPage.drawText(`(${finalFname})`, {
      x: cWidth - 210,
      y: currentY,
      size: itemFontSize - 1,
      font: fontHelvetica,
      color: rgb(148 / 255, 163 / 255, 184 / 255),
    });

    const rangeStr = `pp. ${item.startPage} - ${item.startPage + item.file.pageCount - 1}`;
    const rWidth = fontHelvetica.widthOfTextAtSize(rangeStr, itemFontSize);
    coverPage.drawText(rangeStr, {
      x: cWidth - 50 - rWidth,
      y: currentY,
      size: itemFontSize,
      font: fontHelveticaBold,
      color: rgb(15 / 255, 23 / 255, 42 / 255),
    });

    currentY -= rowHeight;
  });

  // --- STEP 3 & 5: APPEND COPIED PAGES AND EXPAND CODES DOWNWARD ---
  for (const item of docsToAppend) {
    const fileBytes = item.file.bytes.slice();
    const subDoc = await PDFDocument.load(fileBytes);
    const copiedPages = await mergedDoc.copyPages(subDoc, subDoc.getPageIndices());

    copiedPages.forEach(page => {
      mergedDoc.addPage(page);
    });
  }

  // --- STEP 4 & 5: CENTERED FOOTER ON EVERY PAGE (<tender_id> | Page X of Y) ---
  const allPages = mergedDoc.getPages();
  const footerFontSize = 10;

  allPages.forEach((page, index) => {
    const pageNum = index + 1;
    const footerText = `${sanitiseText(tender.tender_id)} | Page ${pageNum} of ${Y}`;
    const rotation = page.getRotation().angle;
    const mediaBox = page.getMediaBox();
    const cropBox = page.getCropBox();

    // Get current dimensions
    const xMin = mediaBox.x;
    const yMin = mediaBox.y;
    const xMax = mediaBox.x + mediaBox.width;
    const yMax = mediaBox.y + mediaBox.height;

    const cxMin = cropBox.x;
    const cyMin = cropBox.y;
    const cxMax = cropBox.x + cropBox.width;
    const cyMax = cropBox.y + cropBox.height;

    // Shift coordinates depending on visual bottom orientation
    if (rotation === 0) {
      // Shift MediaBox and CropBox downward by 28pt to guarantee content is never overlayed
      safeSetMediaBox(page, xMin, yMin - 28, xMax - xMin, yMax - yMin + 28);
      safeSetCropBox(page, cxMin, cyMin - 28, cxMax - cxMin, cyMax - cyMin + 28);

      const width = xMax - xMin;
      const textWidth = fontHelvetica.widthOfTextAtSize(footerText, footerFontSize);
      
      page.drawText(footerText, {
        x: xMin + (width - textWidth) / 2,
        y: yMin - 18,
        size: footerFontSize,
        font: fontHelvetica,
        color: rgb(100 / 255, 116 / 255, 139 / 255), // Slate-500
      });
    } 
    else if (rotation === 90) {
      // Visually bottom is left boundary. Shift left.
      safeSetMediaBox(page, xMin - 28, yMin, xMax - xMin + 28, yMax - yMin);
      safeSetCropBox(page, cxMin - 28, cyMin, cxMax - cxMin + 28, cyMax - cyMin);

      const height = yMax - yMin;
      const textWidth = fontHelvetica.widthOfTextAtSize(footerText, footerFontSize);

      page.drawText(footerText, {
        x: xMin - 18,
        y: yMin + (height - textWidth) / 2,
        size: footerFontSize,
        font: fontHelvetica,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
        rotate: degrees(90),
      });
    } 
    else if (rotation === 180) {
      // Visually bottom is top boundary. Shift top.
      safeSetMediaBox(page, xMin, yMin, xMax - xMin, yMax - yMin + 28);
      safeSetCropBox(page, cxMin, cyMin, cxMax - cxMin, cyMax - cyMin + 28);

      const width = xMax - xMin;
      const textWidth = fontHelvetica.widthOfTextAtSize(footerText, footerFontSize);

      page.drawText(footerText, {
        x: xMax - (width - textWidth) / 2,
        y: yMax + 18,
        size: footerFontSize,
        font: fontHelvetica,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
        rotate: degrees(180),
      });
    } 
    else if (rotation === 270) {
      // Visually bottom is right boundary. Shift right.
      safeSetMediaBox(page, xMin, yMin, xMax - xMin + 28, yMax - yMin);
      safeSetCropBox(page, cxMin, cyMin, cxMax - cxMin + 28, cyMax - cyMin);

      const height = yMax - yMin;
      const textWidth = fontHelvetica.widthOfTextAtSize(footerText, footerFontSize);

      page.drawText(footerText, {
        x: xMax + 18,
        y: yMax - (height - textWidth) / 2,
        size: footerFontSize,
        font: fontHelvetica,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
        rotate: degrees(270),
      });
    }
  });

  // --- STEP 6: SET PDF METADATA AND SAVE ---
  mergedDoc.setTitle(`${sanitiseText(tender.tender_id)} Package`);
  mergedDoc.setProducer("Tender Document Package Builder");
  mergedDoc.setCreator("Tender Document Package Builder");
  mergedDoc.setCreationDate(new Date());

  return await mergedDoc.save();
}

/**
 * Compatible wrapper maintaining direct linkage for existing React UI templates.
 */
export async function buildTenderPackage({
  tender,
  requirements,
  files,
  matches
}: BuildTenderParams): Promise<Uint8Array> {
  const generatedAt = new Date().toISOString().split('T')[0];
  return await buildPackage({
    tender,
    requirements,
    matches,
    files,
    generatedAt
  });
}

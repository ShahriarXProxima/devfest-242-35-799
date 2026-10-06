/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPdfPageCount } from './pdfInfo';
import { computeSHA256 } from './hash';
import { UploadedFile } from '../types';

// Validate magic bytes (%PDF-) offline
export async function verifyPdfMagicBytes(file: File): Promise<boolean> {
  try {
    const chunk = file.slice(0, 5);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 && // %
      bytes[1] === 0x50 && // P
      bytes[2] === 0x44 && // D
      bytes[3] === 0x46 && // F
      bytes[4] === 0x2d    // -
    );
  } catch (e) {
    return false;
  }
}

interface ProcessFilesParams {
  fileList: File[] | FileList;
  currentFiles: UploadedFile[];
  addAlert: (msg: string) => void;
  dispatch: React.Dispatch<any>;
  t: (key: any) => string;
}

export async function processFilesPipeline({
  fileList,
  currentFiles,
  addAlert,
  dispatch,
  t
}: ProcessFilesParams): Promise<void> {
  const addedList: UploadedFile[] = [];

  let currentTotalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
  let currentCount = currentFiles.length;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];

    // 1. Check extension and MIME type
    const hasPdfExt = file.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.type === 'application/pdf';

    if (!hasPdfExt && !isPdfMime) {
      addAlert(t('err_not_pdf').replace('{name}', file.name));
      continue;
    }

    // 2. Read first 5 bytes to verify %PDF- magic signature
    const hasMagicBytes = await verifyPdfMagicBytes(file);
    if (!hasMagicBytes) {
      addAlert(t('err_not_pdf').replace('{name}', file.name));
      continue;
    }

    // 3. Enforce overall constraints
    if (currentCount >= 30) {
      addAlert(t('file_limit_reached'));
      break;
    }

    if (currentTotalSize + file.size > 50 * 1024 * 1024) {
      addAlert(t('file_size_exceeded') + ` (${file.name})`);
      break;
    }

    // 4. Try parsing PDF pages using pdf.js
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Attempt page count fetching. Will fail for locked or corrupt docs.
      let pageCount = 0;
      try {
        pageCount = await getPdfPageCount(bytes);
      } catch (pdfErr: any) {
        if (
          pdfErr.name === 'PasswordException' || 
          (pdfErr.message && pdfErr.message.toLowerCase().includes('password'))
        ) {
          throw new Error('PASSWORD_LOCKED');
        } else {
          throw new Error('DAMAGED_HEADER');
        }
      }

      // Generate SHA-256 Hash
      const hash = await computeSHA256(bytes);

      addedList.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        pageCount,
        bytes,
        hash,
        duplicateGroupId: null
      });

      currentTotalSize += file.size;
      currentCount++;
    } catch (err: any) {
      if (err.message === 'PASSWORD_LOCKED') {
        addAlert(t('err_password').replace('{name}', file.name));
      } else {
        addAlert(t('err_damaged').replace('{name}', file.name));
      }
    }
  }

  if (addedList.length > 0) {
    dispatch({
      type: 'ADD_FILES',
      payload: addedList
    });
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState } from '../types';

/**
 * Validates if a file is allowed to be matched to a specific requirement.
 * Returns false if ANY other file in the same duplicate group is already matched to a DIFFERENT requirement.
 * Duplicate files must never end up matched to different documents.
 */
export function canMatchFile(
  fileId: string,
  requirementId: string,
  state: AppState
): { allowed: boolean; reasonKey: string | null } {
  const targetFile = state.files.find(f => f.id === fileId);
  if (!targetFile) {
    return { allowed: false, reasonKey: 'err_file_not_found' };
  }

  // Find all duplicates of this file (including itself) by matching SHA-256 hash
  const duplicateFiles = state.files.filter(f => f.hash === targetFile.hash);
  const duplicateIds = duplicateFiles.map(d => d.id);

  // Scan current match assignments
  for (const [reqId, matchedFileId] of Object.entries(state.matches)) {
    // If one of our duplicates is matched, but to a DIFFERENT requirement
    if (duplicateIds.includes(matchedFileId) && reqId !== requirementId) {
      return { allowed: false, reasonKey: 'err_duplicate_matched_elsewhere' };
    }
  }

  return { allowed: true, reasonKey: null };
}

/**
 * Helper to return the translation blocking key for tooltips or select dropdown options.
 */
export function getBlockedReasonKey(
  fileId: string,
  requirementId: string,
  state: AppState
): string | null {
  const result = canMatchFile(fileId, requirementId, state);
  return result.reasonKey;
}

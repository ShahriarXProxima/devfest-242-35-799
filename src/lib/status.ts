/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Status, Requirement } from '../types';
import { TranslationKeys } from '../i18n/en';

export interface StatusUIConfig {
  textClass: string;
  labelKey: keyof TranslationKeys;
  icon: string;
}

/**
 * Maps tender status strings to accessible, high-contrast, non-bulky text styles.
 * Conforms to the "Zero-Pill" discipline: quiet inline status text.
 */
export const STATUS_UI_CONFIGS: Record<Status, StatusUIConfig> = {
  ok: {
    textClass: 'text-emerald-600 font-semibold',
    labelKey: 'status_ok',
    icon: '✓',
  },
  missing: {
    textClass: 'text-rose-600 font-semibold',
    labelKey: 'status_missing',
    icon: '⚠',
  },
  expiry_needed: {
    textClass: 'text-amber-600 font-semibold',
    labelKey: 'status_expiry_needed',
    icon: '⧗',
  },
  expired: {
    textClass: 'text-red-600 font-semibold',
    labelKey: 'status_expired',
    icon: '🗙',
  },
  not_provided: {
    textClass: 'text-slate-400 font-medium',
    labelKey: 'status_not_provided',
    icon: '•',
  },
};

/**
 * Validates a YYYY-MM-DD date string timezone-safely without timezone offsets.
 * Rejects invalid dates like "2026-02-30".
 */
export function isValidDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  // Format check
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Verify true calendar boundaries
  const testDate = new Date(Date.UTC(year, month - 1, day));
  if (
    testDate.getUTCFullYear() !== year ||
    testDate.getUTCMonth() !== month - 1 ||
    testDate.getUTCDate() !== day
  ) {
    return false;
  }

  return true;
}

/**
 * Pure, framework-independent status computation engine.
 */
export function getStatus(
  requirement: Requirement,
  hasMatchedFile: boolean,
  expiryDate: string | undefined,
  submissionDeadline: string
): Status {
  if (!hasMatchedFile) {
    return requirement.mandatory ? 'missing' : 'not_provided';
  }

  if (requirement.has_expiry) {
    if (!expiryDate || !isValidDate(expiryDate)) {
      return 'expiry_needed';
    }

    // Direct lexicographical string comparison is timezone-safe for YYYY-MM-DD
    if (expiryDate < submissionDeadline) {
      return 'expired';
    }
  }

  return 'ok';
}

/**
 * Check if the status blocks tender submission.
 */
export function isBlocking(status: Status): boolean {
  return status === 'missing' || status === 'expiry_needed' || status === 'expired';
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string; // YYYY-MM-DD format
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface UploadedFile {
  id: string; // uuid
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
  hash: string; // SHA-256 hex
  duplicateGroupId: string | null;
}

export interface AppState {
  tender: Tender | null;
  requirements: Requirement[];
  files: UploadedFile[];
  matches: Record<string, string>; // requirementId -> fileId
  expiryDates: Record<string, string>; // requirementId -> YYYY-MM-DD
  language: 'en' | 'bn';
  alerts: { id: string; message: string }[];
  globalProcessing: boolean;
}

export type Status = 'missing' | 'expiry_needed' | 'expired' | 'not_provided' | 'ok';

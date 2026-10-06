/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Tender, Requirement, UploadedFile, Status } from './types';
import { translate, TranslationKeys } from './i18n';
import { getStatus } from './lib/status';

const getInitialLanguage = (): 'en' | 'bn' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tender_app_lang');
    if (saved === 'en' || saved === 'bn') {
      return saved;
    }
  }
  return 'en';
};

// Initial state values
export const initialAppState: AppState = {
  tender: null,
  requirements: [],
  files: [],
  matches: {},
  expiryDates: {},
  language: getInitialLanguage(),
  alerts: [],
  globalProcessing: false,
};

// Actions definition
export type AppAction =
  | { type: 'LOAD_REQUIREMENTS'; payload: { tender: Tender; requirements: Requirement[] } }
  | { type: 'ADD_FILES'; payload: UploadedFile[] }
  | { type: 'REMOVE_FILE'; payload: string } // fileId
  | { type: 'SET_MATCH'; payload: { requirementId: string; fileId: string } }
  | { type: 'CLEAR_MATCH'; payload: string } // requirementId
  | { type: 'SET_EXPIRY'; payload: { requirementId: string; date: string } }
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'bn' }
  | { type: 'ADD_ALERT'; payload: string }
  | { type: 'REMOVE_ALERT'; payload: string }
  | { type: 'SET_GLOBAL_PROCESSING'; payload: boolean }
  | { type: 'RESET' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_REQUIREMENTS': {
      // Loading a new requirements.json resets matches and expiry dates but keeps uploaded files
      return {
        ...state,
        tender: action.payload.tender,
        requirements: [...action.payload.requirements].sort((a, b) => a.order - b.order),
        matches: {},
        expiryDates: {},
      };
    }

    case 'ADD_FILES': {
      const currentFiles = [...state.files];
      const newFiles = action.payload;

      for (const file of newFiles) {
        if (currentFiles.length >= 30) break;
        currentFiles.push(file);
      }

      // Compute duplicate groups on all current files
      const hashGroups: Record<string, string[]> = {};
      currentFiles.forEach(f => {
        if (!hashGroups[f.hash]) {
          hashGroups[f.hash] = [];
        }
        hashGroups[f.hash].push(f.id);
      });

      const updatedFiles = currentFiles.map(f => {
        const idsInGroup = hashGroups[f.hash] || [];
        // Only mark as duplicate if there are 2 or more files with this exact hash
        const isDuplicate = idsInGroup.length >= 2;
        return {
          ...f,
          duplicateGroupId: isDuplicate ? `dup_${f.hash.slice(0, 8)}` : null,
        };
      });

      return {
        ...state,
        files: updatedFiles,
      };
    }

    case 'REMOVE_FILE': {
      const fileIdToRemove = action.payload;
      const updatedFiles = state.files.filter(f => f.id !== fileIdToRemove);

      // Recompute duplicate groups
      const hashGroups: Record<string, string[]> = {};
      updatedFiles.forEach(f => {
        if (!hashGroups[f.hash]) {
          hashGroups[f.hash] = [];
        }
        hashGroups[f.hash].push(f.id);
      });
      const finalFiles = updatedFiles.map(f => {
        const idsInGroup = hashGroups[f.hash] || [];
        const isDuplicate = idsInGroup.length >= 2;
        return {
          ...f,
          duplicateGroupId: isDuplicate ? `dup_${f.hash.slice(0, 8)}` : null,
        };
      });

      // Clear any matches and expiry dates using this file ID
      const updatedMatches = { ...state.matches };
      const updatedExpiry = { ...state.expiryDates };
      Object.keys(updatedMatches).forEach(reqId => {
        if (updatedMatches[reqId] === fileIdToRemove) {
          delete updatedMatches[reqId];
          delete updatedExpiry[reqId];
        }
      });

      return {
        ...state,
        files: finalFiles,
        matches: updatedMatches,
        expiryDates: updatedExpiry,
      };
    }

    case 'SET_MATCH': {
      const { requirementId, fileId } = action.payload;
      return {
        ...state,
        matches: {
          ...state.matches,
          [requirementId]: fileId,
        },
      };
    }

    case 'CLEAR_MATCH': {
      const requirementId = action.payload;
      const updatedMatches = { ...state.matches };
      delete updatedMatches[requirementId];

      const updatedExpiry = { ...state.expiryDates };
      delete updatedExpiry[requirementId];

      return {
        ...state,
        matches: updatedMatches,
        expiryDates: updatedExpiry,
      };
    }

    case 'SET_EXPIRY': {
      const { requirementId, date } = action.payload;
      return {
        ...state,
        expiryDates: {
          ...state.expiryDates,
          [requirementId]: date,
        },
      };
    }

    case 'SET_LANGUAGE': {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tender_app_lang', action.payload);
      }
      return {
        ...state,
        language: action.payload,
      };
    }

    case 'ADD_ALERT': {
      return {
        ...state,
        alerts: [
          ...state.alerts,
          { id: crypto.randomUUID(), message: action.payload }
        ]
      };
    }

    case 'REMOVE_ALERT': {
      return {
        ...state,
        alerts: state.alerts.filter(a => a.id !== action.payload)
      };
    }

    case 'SET_GLOBAL_PROCESSING': {
      return {
        ...state,
        globalProcessing: action.payload
      };
    }

    case 'RESET': {
      return {
        ...initialAppState,
        language: state.language, // preserve selected language
      };
    }

    default:
      return state;
  }
}

// Store Context configuration
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
}

/**
 * Custom hook to translate UI elements based on state's current language.
 */
export function useT() {
  const { state } = useAppStore();
  return (key: keyof TranslationKeys) => translate(key, state.language);
}

/**
 * Derived selectors for state checks. Keep computed live on re-render.
 */
export function useRequirementsStatus() {
  const { state } = useAppStore();
  const { requirements, matches, expiryDates, tender } = state;

  const deadlineStr = tender?.submission_deadline || new Date().toISOString().split('T')[0];

  const statuses = requirements.reduce<Record<string, Status>>((acc, req) => {
    const fileId = matches[req.id];
    const expiryDate = expiryDates[req.id];
    acc[req.id] = getStatus(req, !!fileId, expiryDate, deadlineStr);
    return acc;
  }, {});

  const totalFilesSize = state.files.reduce((sum, f) => sum + f.size, 0);
  const totalPagesCount = state.files.reduce((sum, f) => sum + f.pageCount, 0);

  // Check if everything is valid
  // All mandatory requirements must be matched and have "ok" status
  // All matched requirements with expiry dates must be valid
  const isAllValid = requirements.every(req => {
    const status = statuses[req.id];
    if (req.mandatory && status !== 'ok') {
      return false;
    }
    // If optional but matched, it should not be expired or need expiry
    if (!req.mandatory && matches[req.id]) {
      if (status === 'expiry_needed' || status === 'expired') {
        return false;
      }
    }
    return true;
  }) && requirements.length > 0;

  return {
    statuses,
    isAllValid,
    totalFilesSize,
    totalPagesCount,
  };
}

/**
 * Helper to load dummy template
 */
export const SAMPLE_TENDER_JSON = {
  tender: {
    tender_id: "TENDER/G-118/2026",
    title: "Procurement of High-Capacity Enterprise Servers & Modular Storage Arrays",
    procuring_entity: "Bangladesh Computer Council (BCC), ICT Division",
    bidder: "Alliance Technology Bangladesh Ltd.",
    submission_deadline: "2026-11-25"
  },
  requirements: [
    { "id": "req-01", "order": 1, "title_en": "Valid Trade License (FY 2025-2026)", "title_bn": "বৈধ ট্রেড লাইসেন্স (অর্থবছর ২০২৫-২০২৬)", "mandatory": true, "has_expiry": true },
    { "id": "req-02", "order": 2, "title_en": "Income Tax Clearance Certificate", "title_bn": "আয়কর পরিশোধের সনদপত্র", "mandatory": true, "has_expiry": true },
    { "id": "req-03", "order": 3, "title_en": "VAT Registration Certificate", "title_bn": "ভ্যাট রেজিস্ট্রেশন সনদপত্র", "mandatory": true, "has_expiry": false },
    { "id": "req-04", "order": 4, "title_en": "Bank Solvency & Credit Line Commitment Letter", "title_bn": "ব্যাংক সচ্ছলতা ও ক্রেডিট লাইন প্রতিশ্রুতি পত্র", "mandatory": true, "has_expiry": false },
    { "id": "req-05", "order": 5, "title_en": "Manufacturer Authorization Letter (MAF)", "title_bn": "প্রস্তুতকারক অনুমোদিত পত্র (MAF)", "mandatory": true, "has_expiry": false },
    { "id": "req-06", "order": 6, "title_en": "Audited Financial Statements (Last 3 Years)", "title_bn": "নিরীক্ষিত আর্থিক বিবরণী (বিগত ৩ বছর)", "mandatory": false, "has_expiry": false },
    { "id": "req-07", "order": 7, "title_en": "Similar Project Delivery Certificates (Minimum 2 contracts)", "title_bn": "অনুরূপ প্রকল্প সরবরাহের প্রশংসাপত্র (সর্বনিম্ন ২টি চুক্তি)", "mandatory": true, "has_expiry": false },
    { "id": "req-08", "order": 8, "title_en": "ISO 9001:2015 Quality Management Certificate", "title_bn": "ISO ৯০০১:২০১৫ কোয়ালিটি ম্যানেজমেন্ট সনদপত্র", "mandatory": false, "has_expiry": true }
  ]
};

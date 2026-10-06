/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStatus, isBlocking } from './status';
import { Requirement } from '../types';

interface TestCase {
  name: string;
  requirement: Requirement;
  hasMatchedFile: boolean;
  expiryDate: string | undefined;
  deadline: string;
  expectedStatus: string;
  expectedBlocking: boolean;
}

export function runStatusTests() {
  const reqMandatoryWithExpiry: Requirement = {
    id: 'req-01',
    order: 1,
    title_en: 'Mandatory Doc',
    title_bn: 'বাধ্যতামূলক দলিল',
    mandatory: true,
    has_expiry: true
  };

  const reqOptionalNoExpiry: Requirement = {
    id: 'req-02',
    order: 2,
    title_en: 'Optional Doc',
    title_bn: 'ঐচ্ছিক দলিল',
    mandatory: false,
    has_expiry: false
  };

  const reqOptionalWithExpiry: Requirement = {
    id: 'req-03',
    order: 3,
    title_en: 'Optional with Expiry',
    title_bn: 'মেয়াদসহ ঐচ্ছিক',
    mandatory: false,
    has_expiry: true
  };

  const tests: TestCase[] = [
    {
      name: 'Mandatory Missing File',
      requirement: reqMandatoryWithExpiry,
      hasMatchedFile: false,
      expiryDate: undefined,
      deadline: '2026-11-15',
      expectedStatus: 'missing',
      expectedBlocking: true
    },
    {
      name: 'Optional Not Provided File',
      requirement: reqOptionalNoExpiry,
      hasMatchedFile: false,
      expiryDate: undefined,
      deadline: '2026-11-15',
      expectedStatus: 'not_provided',
      expectedBlocking: false
    },
    {
      name: 'File Matched with Expiry but No Date Entered',
      requirement: reqMandatoryWithExpiry,
      hasMatchedFile: true,
      expiryDate: undefined,
      deadline: '2026-11-15',
      expectedStatus: 'expiry_needed',
      expectedBlocking: true
    },
    {
      name: 'Expired (expiry date is 1 day before deadline)',
      requirement: reqMandatoryWithExpiry,
      hasMatchedFile: true,
      expiryDate: '2026-11-14',
      deadline: '2026-11-15',
      expectedStatus: 'expired',
      expectedBlocking: true
    },
    {
      name: 'OK (expiry date is ON the same day as deadline)',
      requirement: reqMandatoryWithExpiry,
      hasMatchedFile: true,
      expiryDate: '2026-11-15',
      deadline: '2026-11-15',
      expectedStatus: 'ok',
      expectedBlocking: false
    },
    {
      name: 'OK (expiry date is after the deadline)',
      requirement: reqMandatoryWithExpiry,
      hasMatchedFile: true,
      expiryDate: '2026-11-16',
      deadline: '2026-11-15',
      expectedStatus: 'ok',
      expectedBlocking: false
    },
    {
      name: 'No expiry requirement with no date entered',
      requirement: reqOptionalNoExpiry,
      hasMatchedFile: true,
      expiryDate: undefined,
      deadline: '2026-11-15',
      expectedStatus: 'ok',
      expectedBlocking: false
    },
    {
      name: 'Optional document matched with expiry and no date entered',
      requirement: reqOptionalWithExpiry,
      hasMatchedFile: true,
      expiryDate: undefined,
      deadline: '2026-11-15',
      expectedStatus: 'expiry_needed',
      expectedBlocking: true
    }
  ];

  console.group('%c Tender Status Engine Self-Check Unit Tests ', 'background: #312e81; color: #fff; padding: 4px; font-weight: bold; border-radius: 4px;');
  
  let passedCount = 0;
  tests.forEach((tc) => {
    const status = getStatus(tc.requirement, tc.hasMatchedFile, tc.expiryDate, tc.deadline);
    const blocking = isBlocking(status);
    const passed = status === tc.expectedStatus && blocking === tc.expectedBlocking;
    
    if (passed) {
      passedCount++;
      console.log(`%c[PASS] %c${tc.name}: Status is "${status}" (Blocking: ${blocking})`, 'color: #16a34a; font-weight: bold;', 'color: #475569;');
    } else {
      console.error(`%c[FAIL] %c${tc.name}: Expected status "${tc.expectedStatus}" (Blocking: ${tc.expectedBlocking}), but got "${status}" (Blocking: ${blocking})`, 'color: #dc2626; font-weight: bold;', 'color: #1e293b;');
    }
  });

  console.log(`%cSummary: Passed ${passedCount}/${tests.length} tests successfully.`, 'font-weight: bold; color: #1e3a8a;');
  console.groupEnd();
  
  return passedCount === tests.length;
}

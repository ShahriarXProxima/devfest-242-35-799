/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { en, TranslationKeys } from './en';
import { bn } from './bn';

export { en, bn };
export type { TranslationKeys };

export const translations: Record<'en' | 'bn', TranslationKeys> = {
  en,
  bn,
};

/**
 * Basic translation helper function
 */
export function translate(key: keyof TranslationKeys, lang: 'en' | 'bn'): string {
  return translations[lang][key] || translations['en'][key] || String(key);
}

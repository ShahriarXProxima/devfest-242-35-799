/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the SHA-256 hash of a Uint8Array using the Web Crypto API.
 * This runs fully inside the client's browser.
 */
export async function computeSHA256(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

# Tender Document Package Builder

**Name:** Md. Shahriar Tahmid
**Registration number:** 242-35-799
**Live site (HTTPS):** https://devfest-242-35-799.vercel.app/
**Repository:** [https://github.com/ShahriarXProxima/devfest-242-35-799](https://github.com/ShahriarXProxima/devfest-242-35-799)

## How to run
```bash
npm install
npm run dev        # development
npm run build      # production build in dist/
```

### Automated Regression Tests
You can execute our programmatic regression tests validating all 7 user-flow criteria by running:
```bash
# Generates public sample-pack files
npx tsx scripts/generate-sample-pack.ts

# Runs regression assertions and saves output PDF
npx tsx scripts/regression-test.ts
```

## Main features done
- **Load requirements.json**: Upload custom schemas or click "Load Demo Requirements" to sort required documents by `order` ascending. Shows tender details and submission deadlines timezone-safely.
- **Upload many PDFs**: Supports up to 30 files and 50 MB total. Verifies `.pdf` extensions, MIME types, and `%PDF-` magic signatures. Rejects damaged or password-locked PDFs with clear dismissible alerts.
- **Match files to requirements**: Interactive dropdown selectors to map documents. Replaces matches automatically or unlinks them at any time. Disabled matched-elsewhere options with contextual warnings.
- **Expiry date entry & live status**: Compute statuses timezone-safely (`Missing` / `Expiry date needed` / `Expired` / `Not provided` / `OK`). Expiries on the same day as the deadline are labeled valid.
- **Duplicate file detection**: Computes native browser SHA-256 signatures of raw file bytes instantly. Group identical files and block assignments of duplicate files to different requirements.
- **Smart blocker checklist**: Displays collapsible listings of blocking issues with scroll-to-row click shortcuts. Disables the generate button until all blockers are resolved.
- **Combined PDF Generation**:
  - Compiles an English cover page listing all included documents in order.
  - Dynamically shrinks font and spacing to fit all 30 rows on page 1.
  - Stamps centered `<tender_id> | Page X of Y` pagination footers.
  - Safely expands media/crop boundaries downward or along rotation angles (0, 90, 180, 270) to prevent footers from ever overlapping original document layouts.
- **Download**: Saves compiled packages cleanly as `<tender_id>_Package.pdf` with sanitised special characters.
- **Language switcher**: Full instant toggling between English and Bangla (using `Noto Sans Bengali` with zero broken glyphs) without losing any files, matches, dates, or progress state mid-flow.

## Bonus features
- **Automated Regression Test Suite (`/scripts/regression-test.ts`)**: Validates all 7 critical matchmaking, duplicate, expiry date, and PDF compilation page offset boundaries with automated reports.
- **Programmatic Sample Pack Loader (`/src/lib/samplePackLoader.ts`)**: Pulls sample PDFs from the local server into standard binary upload streams as if selected by a user, validating magic signatures and hashes symmetrically.
- **Visual First-Page Thumbnail Previews**: Renders first pages of PDFs as lightweight cover previews on HTML canvases lazily inside browser memory.
- **Rotation-Aware Margin Expansion Footers**: Dynamically offsets media boxes based on the page's orientation to guarantee footer text never overlays proprietary content.
- **Persistent Language Preferences**: Timezone-safely saves user UI language settings into `localStorage`.

## Known problems
- None known.

## AI tools used
- Google AI Studio (Model: Gemini 3.5 Flash).

## Most useful prompt
Here are the most useful prompts used during the development of each milestone:

### 1. Initial Core Builder and PDF-Lib Workaround Prompt
```text
You are a senior frontend engineer. Build a FRONTEND-ONLY web app called "Tender Document Package Builder" using React + TypeScript + Vite + Tailwind CSS. It must run in the latest Google Chrome.
Office staff load a tender's requirements.json, upload many PDF files, match each file to a required document, enter expiry dates, see live validation statuses, and download ONE combined, ordered PDF with a cover page and page-number footers.
- 100% client-side. No backend, no Firebase, no database.
- Libraries: pdf-lib (merge and footers), pdfjs-dist (page counts, previews). Configure the pdf.js worker correctly for Vite.
- CRITICAL BUG TO AVOID: pdf.js detaches ArrayBuffers. Store each file's original bytes once as a Uint8Array and ALWAYS use bytes.slice() when passing it to any parsing or rendering function so that the file never gets corrupted or detached!
```

### 2. Status Rules and Dynamic Duplicates Matching Prompt
```text
Extend the existing project. Implement duplicate file detection by file content hash (using native crypto.subtle.digest to hash the bytes, never the file name). Mark identical files with an amber Duplicate badge naming which other file it copies. 
Enforce status logic:
- No file matched AND requirement.mandatory === true -> 'missing'
- No file matched AND requirement.mandatory === false -> 'not_provided'
- File matched AND has_expiry === true AND no valid expiry date -> 'expiry_needed'
- File matched AND has_expiry === true AND expiryDate < submissionDeadline -> 'expired' (Same-day is OK)
- File matched AND (has_expiry === false OR expiryDate >= submissionDeadline) -> 'ok'
Prevent identical duplicate files from being matched to different required documents to maintain submission integrity.
```

### 3. Programmatic Sample Pack Loader & 7 Assertion Outcomes Prompt
```text
Write a script `scripts/generate-sample-pack.ts` to output sample PDFs and files into public/sample-pack/. Then, add a "Load sample pack" demo button in the UI Header. 
Add a regression test file `scripts/regression-test.ts` that loads the sample pack and asserts these exact outcomes:
1. company_logo.png is rejected as a non-PDF.
2. experience_cert.pdf and experience_cert (1).pdf are both flagged Duplicate, blocking multi-matches.
3. trade_license_2025.pdf is Expired; trade_license_2026.pdf with expiry 2027 is OK.
4. bank_solvency.pdf is Expiry Needed; with 2026-12-31 is OK; on deadline is OK; 1 day before is Expired.
5. Optional documents show 'Not provided' and do not block.
6. Correct matches compile successfully into a 16-page PDF.
7. Footer stamps 'T-2026-0417 | Page X of 16' and cover lists 8 documents.
```

### 4. Bending Bounding Media Boxes and Page Rotation Stamping Prompt
```text
Write pdf-lib page layout drawing. Centered page numbers must be stamped on every page as "<tender_id> | Page X of Y". The footer must NEVER overlap any content.
To do this, shift the MediaBox and CropBox of each page downward by 28pt before drawing the footer. Shift the boundaries depending on the page's visual rotation (0, 90, 180, or 270 degrees) so that the margins expand correctly along the visual bottom in any portrait or landscape orientation without overlaying proprietary text.
```

## Output
- `output/T-2026-0417_Package.pdf` (compiled dynamically from the sample pack, containing exactly 16 pages with the correct blueprints at pages 2, 3, 4, 5, 6-7, 8-13, 14-15, and 16).

## Licenses
MIT. Uses pdf-lib (MIT), pdf.js (Apache-2.0), Noto Sans Bengali (SIL OFL), Lucide React (ISC).

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

async function createDummyPdf(pageCount: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.275, 841.89]); // A4
    page.drawText(`Sample Document Page ${i + 1} of ${pageCount}`, {
      x: 50,
      y: 400,
      size: 14,
    });
  }
  return await pdfDoc.save();
}

async function main() {
  const dir = path.join(process.cwd(), 'public', 'sample-pack');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write requirements.json
  const requirements = {
    tender: {
      tender_id: "T-2026-0417",
      title: "Construction of Multi-Storey Green Data Centre",
      procuring_entity: "Ministry of ICT",
      bidder: "Eco-Systems Bangladesh Ltd.",
      submission_deadline: "2026-10-20"
    },
    requirements: [
      { id: "R01", order: 1, title_en: "Trade License", title_bn: "ট্রেড লাইসেন্স", mandatory: true, has_expiry: true },
      { id: "R02", order: 2, title_en: "TIN Certificate", title_bn: "টিন সার্টিফিকেট", mandatory: true, has_expiry: false },
      { id: "R03", order: 3, title_en: "VAT Certificate", title_bn: "ভ্যাট সার্টিফিকেট", mandatory: true, has_expiry: false },
      { id: "R04", order: 4, title_en: "Bank Solvency Letter", title_bn: "ব্যাংক সচ্ছলতা পত্র", mandatory: true, has_expiry: true },
      { id: "R05", order: 5, title_en: "Experience Certificate", title_bn: "অভিজ্ঞতার সনদপত্র", mandatory: true, has_expiry: false },
      { id: "R06", order: 6, title_en: "Optional Document A", title_bn: "ঐচ্ছিক দলিল ক", mandatory: false, has_expiry: false },
      { id: "R07", order: 7, title_en: "Optional Document B", title_bn: "ঐচ্ছিক দলিল খ", mandatory: false, has_expiry: false },
      { id: "R08", order: 8, title_en: "Technical Proposal", title_bn: "কারিগরি প্রস্তাবনা", mandatory: true, has_expiry: false },
      { id: "R09", order: 9, title_en: "Financial Proposal", title_bn: "আর্থিক প্রস্তাবনা", mandatory: true, has_expiry: false },
      { id: "R10", order: 10, title_en: "Scan Doc 0042", title_bn: "স্ক্যান দলিল ০০৪২", mandatory: true, has_expiry: false }
    ]
  };
  fs.writeFileSync(path.join(dir, 'requirements.json'), JSON.stringify(requirements, null, 2));

  // Write manifest.json with the list of PDFs
  const manifest = {
    files: [
      { name: "company_logo.png", type: "image/png" },
      { name: "experience_cert.pdf", pageCount: 2 },
      { name: "experience_cert (1).pdf", pageCount: 2, duplicateOf: "experience_cert.pdf" },
      { name: "trade_license_2025.pdf", pageCount: 1 },
      { name: "trade_license_2026.pdf", pageCount: 1 },
      { name: "bank_solvency.pdf", pageCount: 1 },
      { name: "03_tin_certificate.pdf", pageCount: 1 },
      { name: "04_vat_certificate.pdf", pageCount: 1 },
      { name: "02_technical_proposal.pdf", pageCount: 6 },
      { name: "01_financial_proposal.pdf", pageCount: 2 },
      { name: "scan_0042.pdf", pageCount: 1 }
    ]
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Write company_logo.png (not a PDF)
  fs.writeFileSync(path.join(dir, 'company_logo.png'), 'This is a fake PNG file header - not a PDF!');

  // Generate exact PDFs
  const pdfSpecs = [
    { name: "trade_license_2025.pdf", pages: 1 },
    { name: "trade_license_2026.pdf", pages: 1 },
    { name: "bank_solvency.pdf", pages: 1 },
    { name: "03_tin_certificate.pdf", pages: 1 },
    { name: "04_vat_certificate.pdf", pages: 1 },
    { name: "02_technical_proposal.pdf", pages: 6 },
    { name: "01_financial_proposal.pdf", pages: 2 },
    { name: "scan_0042.pdf", pages: 1 }
  ];

  for (const spec of pdfSpecs) {
    const bytes = await createDummyPdf(spec.pages);
    fs.writeFileSync(path.join(dir, spec.name), Buffer.from(bytes));
    console.log(`Generated ${spec.name} with ${spec.pages} pages.`);
  }

  // Generate experience_cert.pdf and its duplicate
  const expBytes = await createDummyPdf(2);
  fs.writeFileSync(path.join(dir, "experience_cert.pdf"), Buffer.from(expBytes));
  fs.writeFileSync(path.join(dir, "experience_cert (1).pdf"), Buffer.from(expBytes));
  console.log(`Generated experience_cert.pdf and experience_cert (1).pdf with 2 pages.`);

  console.log("Sample Pack generated successfully in /public/sample-pack");
}

main().catch(console.error);

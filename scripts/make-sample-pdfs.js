// Builds the sample resumes in samples/ as PDF files: `npm run samples`.
// To change a sample, edit its text below and run the command again.
//
// The PDFs use only text and the standard Helvetica fonts (no images), so the upload page can
// read their text. Each sample must keep, word for word, the original_text of every rewrite
// suggestion in server/data/fixedResults.js; line breaks don't matter.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SAMPLES = [
  {
    file: 'Nour_Hassan.pdf',
    text: `Nour Hassan
nour.hassan@example.com

Summary
Computer science graduate looking for a data job.

Education
BSc Computer Science, 2026

Experience
Data Intern, 6 months
Made weekly sales reports for the team.
Wrote SQL queries to pull monthly sales figures.
Wrote a Python script that cleaned 12,000 rows of customer data.

Skills: Python, SQL, Excel, Git`,
  },
  {
    file: 'Mostafa_Ahmed.pdf',
    text: `Mostafa Ahmed
mostafa.ahmed@example.com

Summary
Marketing graduate who enjoys turning campaign results into clear stories.

Experience
Treasurer, University Marketing Society
Ran 2 social media campaigns reaching 5,400 students.
Managed the society's yearly budget and wrote the end-of-year report.

Skills: Canva, Google Analytics, copywriting`,
  },
  {
    file: 'Youssef_Khaled.pdf',
    text: `Youssef Khaled
youssef.khaled@example.com

Summary
Fresh graduate with internship and volunteering experience.

Experience
Office Intern, 3 months: kept the team's schedules and supplier lists up to date.
Volunteer, local food bank: organized weekend shifts for 20 volunteers.

Skills: Microsoft Office, teamwork, English and Arabic`,
  },
];

const HEADINGS = new Set(['Summary', 'Education', 'Experience', 'Skills']);
const PAGE_W = 595; // A4, in points
const PAGE_H = 842;
const MARGIN = 56;
const BODY = 10.5;
const MAX_CHARS = 86; // a safe line length for 10.5pt Helvetica inside the margins

// PDF strings are in brackets, so brackets and backslashes need escaping.
const pdfString = (s) => `(${s.replace(/[\\()]/g, (c) => `\\${c}`)})`;

function wrap(line) {
  const out = [];
  let current = '';
  for (const word of line.split(' ')) {
    if (current && `${current} ${word}`.length > MAX_CHARS) {
      out.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  out.push(current);
  return out;
}

// Page drawing commands: name, then contact line, then headings with a rule under them, then body text.
function pageContent(text) {
  const ops = [];
  const textAt = (font, size, y, s) => ops.push(`BT /${font} ${size} Tf ${MARGIN} ${y.toFixed(1)} Td ${pdfString(s)} Tj ET`);
  const [name, contact, ...rest] = text.split('\n');

  let y = PAGE_H - MARGIN - 14;
  textAt('F2', 20, y, name);
  y -= 18;
  ops.push('0.35 g');
  textAt('F1', BODY, y, contact);
  ops.push('0 g');
  y -= 8;

  for (const line of rest) {
    if (line.trim() === '') {
      y -= 6;
    } else if (HEADINGS.has(line.trim())) {
      y -= 16;
      textAt('F2', 12.5, y, line.trim());
      y -= 5;
      ops.push(`0.7 G 0.6 w ${MARGIN} ${y.toFixed(1)} m ${PAGE_W - MARGIN} ${y.toFixed(1)} l S`);
      y -= 15;
    } else {
      for (const part of wrap(line)) {
        textAt('F1', BODY, y, part);
        y -= 15;
      }
    }
  }
  if (y < MARGIN) throw new Error('Sample is longer than one page; shorten it or add page support.');
  return ops.join('\n');
}

export function buildPdf(text, title) {
  if (/[^\x20-\x7e\n]/.test(text)) throw new Error(`"${title}" has characters other than plain ASCII.`);
  const content = pageContent(text);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    `<< /Title ${pdfString(title)} /Producer (ResumeMatch sample generator) >>`,
  ];

  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// Only write the files when run as a script (tests import SAMPLES and buildPdf instead).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'samples');
  mkdirSync(outDir, { recursive: true });
  for (const { file, text } of SAMPLES) {
    const name = text.split('\n')[0];
    writeFileSync(join(outDir, file), buildPdf(text, `${name} - Resume`));
    console.log(`Wrote samples/${file}`);
  }
}

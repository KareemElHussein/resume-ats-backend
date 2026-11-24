// Copies the browser builds of pdf.js and mammoth into public/vendor, where the upload page
// loads them to read PDF and DOCX files. Runs on `npm run build` (Vercel) and before `npm run dev`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'vendor');

// [file inside node_modules, name in public/vendor]. Saved as .js so every server sends a JavaScript type.
const files = [
  ['pdfjs-dist/build/pdf.min.mjs', 'pdf.min.js'],
  ['pdfjs-dist/build/pdf.worker.min.mjs', 'pdf.worker.min.js'],
  ['mammoth/mammoth.browser.min.js', 'mammoth.browser.min.js'],
];

mkdirSync(outDir, { recursive: true });
for (const [from, to] of files) {
  const source = join(root, 'node_modules', from);
  if (!existsSync(source)) {
    console.error(`Missing node_modules/${from}. Run "npm install" first.`);
    process.exit(1);
  }
  copyFileSync(source, join(outDir, to));
}
console.log(`Copied ${files.length} files to public/vendor`);

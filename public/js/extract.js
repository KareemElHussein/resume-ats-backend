// Reads the text out of a resume file in the browser, so the file itself never leaves the device.
// PDF uses pdf.js and DOCX uses mammoth; both are copied into /vendor by `npm run build`.

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// An error whose message is written for the user.
export class ExtractError extends Error {}

export async function extractText(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractError('This file is larger than 10 MB. Paste your resume text below instead.');
  }
  const name = file.name.toLowerCase();
  let text;
  if (name.endsWith('.txt')) text = await file.text();
  else if (name.endsWith('.pdf')) text = await readPdf(await file.arrayBuffer());
  else if (name.endsWith('.docx')) text = await readDocx(await file.arrayBuffer());
  else throw new ExtractError('Choose a PDF, DOCX or TXT file.');
  return cleanText(text);
}

async function readPdf(data) {
  const pdfjs = await import('../vendor/pdf.min.js');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.js', import.meta.url).href;

  const pdf = await pdfjs.getDocument({ data }).promise;
  try {
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const { items } = await page.getTextContent();
      pages.push(items.map((item) => (item.str ?? '') + (item.hasEOL ? '\n' : ' ')).join(''));
    }
    return pages.join('\n\n');
  } finally {
    await pdf.destroy();
  }
}

let mammothLoaded;
async function readDocx(arrayBuffer) {
  mammothLoaded ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../vendor/mammoth.browser.min.js', import.meta.url).href;
    script.onload = resolve;
    script.onerror = () => {
      mammothLoaded = null;
      reject(new Error('Could not load the DOCX reader.'));
    };
    document.head.append(script);
  });
  await mammothLoaded;
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Tidies whitespace and removes the null character, which the database rejects.
function cleanText(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

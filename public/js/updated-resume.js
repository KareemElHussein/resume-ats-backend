// Rewrite suggestions with a "Use in my updated resume" switch on each, plus a live preview of
// the resume with the chosen suggestions applied, which can be saved as a PDF.
import { el } from './common.js';

const SECTION = { summary: 'Summary', experience: 'Experience', skills: 'Skills', education: 'Education' };
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Finds `needle` in `text`, allowing any spaces or line breaks between its words, because text read
// from a PDF often breaks lines in different places. Returns { start, end } or null.
export function findText(text, needle) {
  const words = needle.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return null;
  const match = new RegExp(words.join('\\s+')).exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

// The updated resume as pieces in order: { text, changed }. `used` items have a .match from findText.
export function applySuggestions(text, used) {
  const pieces = [];
  let pos = 0;
  for (const item of [...used].sort((a, b) => a.match.start - b.match.start)) {
    pieces.push({ text: text.slice(pos, item.match.start), changed: false });
    pieces.push({ text: item.suggested_text, changed: true });
    pos = item.match.end;
  }
  pieces.push({ text: text.slice(pos), changed: false });
  return pieces.filter((p) => p.text !== '');
}

// Returns the page sections: the suggestion cards, then "Your updated resume".
// resumeText is null when the resume couldn't be loaded; the cards then have no switches.
export function suggestionsWithPreview({ suggestions, resumeText, resumeName, loadError }) {
  // Find each suggestion's original text once. Overlapping matches can't both apply, so the later one is left out.
  const items = suggestions.map((s) => ({ ...s, match: null, use: false, note: '' }));
  if (resumeText != null) {
    const taken = [];
    for (const item of items) {
      const match = findText(resumeText, item.original_text);
      if (!match) {
        item.note = 'This text was not found in your resume, so it is not in the updated version.';
      } else if (taken.some((t) => match.start < t.end && t.start < match.end)) {
        item.note = 'This overlaps another suggestion, so it is not in the updated version.';
      } else {
        taken.push(match);
        item.match = match;
        item.use = true;
      }
    }
  }

  const summary = el('p', { class: 'muted', 'aria-live': 'polite' });
  const preview = el('div', { class: 'card resume-text', id: 'updated-resume', role: 'region', 'aria-label': 'Updated resume' });

  function update() {
    const used = items.filter((i) => i.use);
    preview.replaceChildren(...applySuggestions(resumeText, used)
      .map((p) => (p.changed ? el('mark', { text: p.text }) : p.text)));
    summary.textContent = `${used.length} of ${items.length} suggestions applied.`
      + (used.length ? ' Changes are highlighted here, but not in the PDF.' : '');
  }

  const cards = items.map((item, i) => suggestionCard(item, i, resumeText != null ? update : null));

  if (resumeText == null) {
    return [...cards,
      el('h2', { text: 'Your updated resume' }),
      el('div', { class: 'card' }, el('p', { class: 'flush', text: `Could not load your resume, so the updated version is not available. ${loadError || ''}`.trim() }))];
  }

  update();
  const download = el('button', { type: 'button', class: 'btn', text: 'Download PDF' });
  download.addEventListener('click', () => savePdf(resumeName));

  return [...cards,
    el('h2', { text: 'Your updated resume' }),
    summary,
    preview,
    el('div', { class: 'actions tight' },
      download,
      el('span', { class: 'muted', text: 'In the print window, choose "Save as PDF" as the printer.' }))];
}

function suggestionCard(item, index, onChange) {
  const copy = el('button', { type: 'button', class: 'btn ghost', text: 'Copy suggested text' });
  const status = el('span', { class: 'muted', role: 'status' });
  let timer;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(item.suggested_text);
      status.textContent = 'Copied.';
    } catch {
      status.textContent = 'Could not copy. Select the text and copy it instead.';
    }
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ''; }, 4000);
  });

  let toggle = null;
  if (onChange && item.match) {
    const box = el('input', { type: 'checkbox', id: `use-${index}` });
    box.checked = item.use;
    box.addEventListener('change', () => {
      item.use = box.checked;
      onChange();
    });
    toggle = el('label', { class: 'check' }, box, 'Use in my updated resume');
  }

  return el('div', { class: 'card' },
    el('h3', { text: SECTION[item.section] ?? item.section }),
    el('div', { class: 'cmp' },
      el('div', {}, el('small', { text: 'Original' }), item.original_text),
      el('div', { class: 'new' }, el('small', { text: 'Suggested' }), item.suggested_text)),
    item.note && el('p', { class: 'muted', text: item.note }),
    el('div', { class: 'actions tight' }, toggle, copy, status));
}

// Prints only the updated resume (see the print rules in styles.css). Most browsers use the page
// title as the PDF's file name, so it's set to the resume's name while the print window is open.
function savePdf(resumeName) {
  const title = document.title;
  document.title = `${resumeName.replace(/\.(pdf|docx|txt)$/i, '')} - updated resume`;
  window.addEventListener('afterprint', () => { document.title = title; }, { once: true });
  window.print();
}

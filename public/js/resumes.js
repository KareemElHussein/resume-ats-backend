// "My saved resumes": lists the user's resumes with their latest score, and deletes them.
import { api } from './api.js';
import { requireUser, goToLogin, showPageError, el, formatDate, plural, setBusy } from './common.js';

const list = document.getElementById('list');
const lead = document.getElementById('lead');

function refresh() {
  const n = list.children.length;
  lead.textContent = plural(n, 'saved resume');
  document.getElementById('empty').hidden = n !== 0;
  document.getElementById('more').hidden = n === 0;
}

function card(resume) {
  const q = `resume_id=${encodeURIComponent(resume.id)}`;
  const analyzed = resume.latest_match_score != null;
  const del = el('button', { type: 'button', class: 'btn ghost', text: 'Delete' });

  const node = el('div', { class: 'card' },
    el('h3', { text: resume.title }),
    el('p', { class: 'muted sub', text: `Uploaded ${formatDate(resume.created_at)}` }),
    el('div', { class: 'meta' },
      analyzed
        ? el('span', { class: 'badge', text: `Latest score: ${Math.round(resume.latest_match_score)} / 100` })
        : el('span', { class: 'badge miss', text: 'Not analyzed yet' })),
    el('div', { class: 'actions' },
      el('a', { class: 'btn', href: `upload.html?${q}`, text: 'Analyze against a job' }),
      analyzed && el('a', { class: 'btn ghost', href: `results.html?${q}`, text: 'View results' }),
      del));

  del.addEventListener('click', () => remove(resume, node, del));
  return node;
}

async function remove(resume, node, button) {
  if (!confirm(`Delete "${resume.title}" and all its analyses? This cannot be undone.`)) return;
  setBusy(button, true, 'Deleting…');
  try {
    await api.deleteResume(resume.id);
  } catch (err) {
    if (err.status === 401) return goToLogin();
    if (err.status !== 404) { // 404: it's already gone
      setBusy(button, false);
      showPageError(err.message);
      return;
    }
  }
  node.remove();
  refresh();
  document.getElementById('heading').focus();
}

async function main() {
  try {
    await requireUser();
    const { resumes } = await api.listResumes();
    list.replaceChildren(...resumes.map(card));
    refresh();
  } catch (err) {
    lead.textContent = '';
    showPageError(err.message);
  }
}
main();

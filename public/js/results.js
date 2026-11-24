// results.html?id=...         one analysis: score, missing keywords, rewrite suggestions
// results.html[?resume_id=...] the list of past analyses, newest first
import { api } from './api.js';
import { requireUser, showPageError, el, formatDate, plural } from './common.js';

const main = document.getElementById('main');
const params = new URLSearchParams(location.search);

const CATEGORY = { skill: 'Skill', tool: 'Tool', qualification: 'Qualification', other: 'Other' };
const SECTION = { summary: 'Summary', experience: 'Experience', skills: 'Skills', education: 'Education' };

const uploadLink = (resumeId) => `upload.html?resume_id=${encodeURIComponent(resumeId)}`;
const statusBadge = (status) => el('span', { class: status === 'completed' ? 'badge' : 'badge miss', text: status });

function show(title, ...nodes) {
  document.title = `${title} | ResumeMatch`;
  main.replaceChildren(el('h1', { text: title }), ...nodes.filter(Boolean));
}

// ---- One analysis ----

function renderAnalysis(a) {
  show(a.job_title,
    el('div', { class: 'meta lead' },
      a.company && el('span', { text: a.company }),
      el('span', { text: a.resume_title }),
      el('span', { text: formatDate(a.created_at) }),
      statusBadge(a.status)),
    ...(a.status === 'completed' ? completedSections(a) : [unfinishedCard(a)]),
    el('div', { class: 'actions' },
      el('a', { class: 'btn', href: uploadLink(a.resume_id), text: 'Run another analysis' }),
      el('a', { class: 'btn ghost', href: 'results.html', text: 'All results' })));
}

function unfinishedCard(a) {
  const message = a.status === 'failed'
    ? 'This analysis did not finish. Run it again.'
    : 'This analysis has not finished. Run it again.';
  return el('div', { class: 'card' }, el('p', { class: 'flush', text: message }));
}

function completedSections(a) {
  const score = Math.round(a.match_score);
  const gaps = a.keyword_gaps;
  const suggestions = a.rewrite_suggestions;

  const ring = el('div', { class: 'ring', role: 'img', 'aria-label': `Match score ${score} out of 100` },
    el('b', { text: String(score) }));
  ring.style.setProperty('--p', score);

  return [
    el('div', { class: 'card score' },
      ring,
      el('div', {},
        el('h3', { text: `Match score: ${score} / 100` }),
        el('p', { class: 'muted flush' },
          `${plural(gaps.length, 'missing keyword')}.`, el('br'),
          `${plural(suggestions.length, 'rewrite suggestion')}.`))),

    el('h2', { text: 'Missing keywords' }),
    gaps.length
      ? el('div', {},
        el('p', { class: 'muted', text: 'Keywords from the job description that your resume does not show. 5 dots means most important.' }),
        el('div', { class: 'card scroll' }, keywordTable(gaps)))
      : el('div', { class: 'card' }, el('p', { class: 'flush', text: 'No important keywords are missing from your resume.' })),

    el('h2', { text: 'Rewrite suggestions' }),
    ...(suggestions.length
      ? [
        el('p', { class: 'muted', text: 'Only use a suggestion if it is true for you, and replace any numbers with your real ones.' }),
        ...suggestions.map(suggestionCard),
      ]
      : [el('div', { class: 'card' }, el('p', { class: 'flush', text: 'No rewrites suggested for this job.' }))]),
  ];
}

function keywordTable(gaps) {
  const dots = (n) => '●'.repeat(n) + '○'.repeat(5 - n);
  return el('table', {},
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col', text: 'Keyword' }),
      el('th', { scope: 'col', text: 'Type' }),
      el('th', { scope: 'col', text: 'Importance' }))),
    el('tbody', {}, ...gaps.map((g) => el('tr', {},
      el('td', { text: g.keyword }),
      el('td', { text: CATEGORY[g.category] ?? g.category }),
      el('td', { class: 'dots' },
        el('span', { 'aria-hidden': 'true', text: dots(g.importance) }),
        el('span', { class: 'sr-only', text: `${g.importance} of 5` }))))));
}

function suggestionCard(s) {
  const button = el('button', { type: 'button', class: 'btn ghost', text: 'Copy suggested text' });
  const status = el('span', { class: 'muted', role: 'status' });
  let timer;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(s.suggested_text);
      status.textContent = 'Copied.';
    } catch {
      status.textContent = 'Could not copy. Select the text and copy it instead.';
    }
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ''; }, 4000);
  });

  return el('div', { class: 'card' },
    el('h3', { text: SECTION[s.section] ?? s.section }),
    el('div', { class: 'cmp' },
      el('div', {}, el('small', { text: 'Original' }), s.original_text),
      el('div', { class: 'new' }, el('small', { text: 'Suggested' }), s.suggested_text)),
    el('div', { class: 'actions tight' }, button, status));
}

// ---- History ----

function renderHistory(analyses) {
  const filtered = params.has('resume_id');
  const title = filtered && analyses[0] ? `Results for ${analyses[0].resume_title}` : 'Match results';
  const more = analyses.length === 50 ? ' (the latest 50)' : '';

  show(title,
    el('p', { class: 'lead', text: plural(analyses.length, 'analysis', 'analyses') + more }),
    ...(analyses.length ? analyses.map(historyCard) : [emptyCard()]),
    filtered && el('div', { class: 'actions' }, el('a', { class: 'btn ghost', href: 'results.html', text: 'Show all results' })));
}

function historyCard(a) {
  return el('div', { class: 'card' },
    el('h3', { text: a.job_title }),
    el('p', { class: 'muted sub', text: [a.company, a.resume_title, formatDate(a.created_at)].filter(Boolean).join(' · ') }),
    el('div', { class: 'meta' },
      a.status === 'completed'
        ? el('span', { class: 'badge', text: `Score: ${Math.round(a.match_score)} / 100` })
        : statusBadge(a.status)),
    el('div', { class: 'actions' },
      el('a', { class: 'btn', href: `results.html?id=${encodeURIComponent(a.id)}`, text: 'View results' })));
}

function emptyCard() {
  return el('div', { class: 'card empty' },
    el('h3', { text: 'No match results yet' }),
    el('p', { class: 'muted', text: 'Check a resume against a job to see your score here.' }),
    el('div', { class: 'actions center' }, el('a', { class: 'btn', href: 'upload.html', text: 'Check a resume' })));
}

function renderNotFound() {
  show('Result not found',
    el('p', { class: 'lead', text: 'This result does not exist, or it belongs to another account.' }),
    el('div', { class: 'actions' }, el('a', { class: 'btn', href: 'results.html', text: 'All results' })));
}

async function run() {
  try {
    await requireUser();
    const id = params.get('id');
    if (id) renderAnalysis((await api.getAnalysis(id)).analysis);
    else renderHistory((await api.listAnalyses(params.get('resume_id'))).analyses);
  } catch (err) {
    if (err.status === 404 || err.status === 400) renderNotFound();
    else {
      main.querySelector('.lead')?.remove();
      showPageError(err.message);
    }
  }
}
run();

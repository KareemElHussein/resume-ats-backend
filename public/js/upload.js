// Upload page: saves the resume and the job, runs the analysis, then opens the results.
import { api } from './api.js';
import {
  requireUser, goToLogin, showPageError, formatDate, setFieldError, clearFieldErrors, clearOnEdit,
  showServerFieldErrors, setBusy,
} from './common.js';
import { extractText, ExtractError } from './extract.js';

// The same limits the server checks.
const RESUME_MIN = 100;
const RESUME_MAX = 20000;
const JOB_MIN = 50;
const JOB_MAX = 20000;
const NAME_MAX = 200;

// Server field name -> input id, for each request.
const RESUME_FIELDS = { title: 'resume_title', content_text: 'content_text' };
const JOB_FIELDS = { job_title: 'job_title', company: 'company', description_text: 'description_text' };

const $ = (id) => document.getElementById(id);
const form = $('form');
const saved = $('saved');
const newResume = $('new-resume');
const fileInput = $('file');
const fileStatus = $('file-status');
const resumeTitle = $('resume_title');
const contentText = $('content_text');
const count = $('content_count');
const submit = $('submit');
const progress = $('progress');
const formError = $('form-error');

const value = (id) => $(id).value.trim();
const chars = (n) => n.toLocaleString('en-US');

let autoTitle = ''; // the name we filled in from the file, so we can replace it on a new file
let readCount = 0; // ignores a slow file read if another file was picked since
// What this page already saved, so a retry after an error doesn't save duplicates.
let savedResume = null;
let savedJob = null;

function updateCount() {
  const n = value('content_text').length;
  count.textContent = `${chars(n)} / ${chars(RESUME_MAX)} characters`;
  count.classList.toggle('over', n > RESUME_MAX);
}

function showNewResumeFields() {
  newResume.hidden = saved.value !== '';
}

async function loadSavedResumes() {
  const { resumes } = await api.listResumes();
  if (resumes.length === 0) return;
  for (const r of resumes) saved.append(new Option(`${r.title} (${formatDate(r.created_at)})`, r.id));
  $('saved-field').hidden = false;

  const wanted = new URLSearchParams(location.search).get('resume_id');
  if (wanted && resumes.some((r) => r.id === wanted)) saved.value = wanted;
  showNewResumeFields();
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  const thisRead = ++readCount;
  setFieldError('file', '');
  if (!file) {
    fileStatus.textContent = '';
    return;
  }
  fileStatus.textContent = `Reading ${file.name}…`;
  try {
    const text = await extractText(file);
    if (thisRead !== readCount) return;

    contentText.value = text;
    updateCount();
    setFieldError('content_text', '');
    if (!value('resume_title') || resumeTitle.value === autoTitle) {
      autoTitle = file.name.slice(0, NAME_MAX);
      resumeTitle.value = autoTitle;
      setFieldError('resume_title', '');
    }

    if (text.length < RESUME_MIN) {
      fileStatus.textContent = `We found very little text in ${file.name}. If it is a scanned image, paste your resume text below.`;
    } else if (text.length > RESUME_MAX) {
      fileStatus.textContent = `Read ${file.name}. The text is ${chars(text.length)} characters and the limit is ${chars(RESUME_MAX)}, so shorten it below.`;
    } else {
      fileStatus.textContent = `Read ${file.name}. Check the text below before you analyze.`;
    }
  } catch (err) {
    if (thisRead !== readCount) return;
    console.error(err);
    fileStatus.textContent = '';
    setFieldError('file', err instanceof ExtractError
      ? err.message
      : `We couldn't read ${file.name}. Paste your resume text below instead. (Details: ${err?.message || err})`);
  }
});

function validate() {
  const errors = [];
  const add = (id, message) => { if (message) errors.push([id, message]); };

  if (!saved.value) {
    const name = value('resume_title');
    const text = value('content_text');
    add('resume_title', !name ? 'Enter a name for this resume.'
      : name.length > NAME_MAX ? `Keep the name under ${NAME_MAX} characters.` : '');
    add('content_text', text.length < RESUME_MIN
      ? `Add your resume text: at least ${RESUME_MIN} characters. Choose a file above or paste it here.`
      : text.length > RESUME_MAX
        ? `Shorten your resume text to ${chars(RESUME_MAX)} characters. It is ${chars(text.length)} now.` : '');
  }

  const jobTitle = value('job_title');
  const description = value('description_text');
  add('job_title', !jobTitle ? 'Enter the job title.'
    : jobTitle.length > NAME_MAX ? `Keep the job title under ${NAME_MAX} characters.` : '');
  add('company', value('company').length > NAME_MAX ? `Keep the company name under ${NAME_MAX} characters.` : '');
  add('description_text', description.length < JOB_MIN
    ? `Paste the job description: at least ${JOB_MIN} characters.`
    : description.length > JOB_MAX
      ? `Shorten the job description to ${chars(JOB_MAX)} characters. It is ${chars(description.length)} now.` : '');

  errors.forEach(([id, message]) => setFieldError(id, message));
  return errors.length ? errors[0][0] : null;
}

// Saves the resume unless it's a saved one or this exact text was already saved.
async function resumeId() {
  if (saved.value) return saved.value;
  const body = { title: value('resume_title'), content_text: value('content_text') };
  const key = JSON.stringify(body);
  if (savedResume?.key !== key) {
    const { resume } = await api.createResume(body);
    savedResume = { key, id: resume.id };
  }
  return savedResume.id;
}

async function jobId() {
  const body = {
    job_title: value('job_title'),
    company: value('company') || null,
    description_text: value('description_text'),
  };
  const key = JSON.stringify(body);
  if (savedJob?.key !== key) {
    const { job_description } = await api.createJobDescription(body);
    savedJob = { key, id: job_description.id };
  }
  return savedJob.id;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(form);
  formError.textContent = '';

  const firstBad = validate();
  if (firstBad) {
    $(firstBad).focus();
    return;
  }

  setBusy(submit, true, 'Analyzing…');
  progress.textContent = 'Analyzing your resume…';
  let fields = RESUME_FIELDS;
  try {
    const rId = await resumeId();
    fields = JOB_FIELDS;
    const jId = await jobId();
    fields = {};
    const { analysis } = await api.createAnalysis(rId, jId);
    location.href = `results.html?id=${encodeURIComponent(analysis.id)}`;
  } catch (err) {
    progress.textContent = '';
    setBusy(submit, false);
    if (err.status === 401) return goToLogin();
    const first = showServerFieldErrors(err, fields);
    if (first) $(first).focus();
    else formError.textContent = err.message;
  }
});

saved.addEventListener('change', showNewResumeFields);
contentText.addEventListener('input', updateCount);
clearOnEdit(form);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) progress.textContent = '';
});

async function main() {
  try {
    await requireUser();
    await loadSavedResumes();
  } catch (err) {
    showPageError(err.message);
  }
}
main();

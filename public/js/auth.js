// Login and register pages. The form's data-mode says which one this is.
import { api } from './api.js';
import { safeNext, setFieldError, clearFieldErrors, clearOnEdit, showServerFieldErrors, setBusy } from './common.js';

const form = document.getElementById('form');
const mode = form.dataset.mode; // 'login' or 'register'
const submit = document.getElementById('submit');
const formError = document.getElementById('form-error');

const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next')) || 'upload.html';
if (safeNext(params.get('next'))) {
  const switchLink = document.getElementById('switch');
  switchLink.href += `?next=${encodeURIComponent(next)}`;
}

// Already logged in: skip this page.
api.me().then(() => location.replace(next), () => {});

clearOnEdit(form);

function validate(email, password) {
  const errors = [];
  if (!email) errors.push(['email', 'Enter your email address.']);
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(['email', 'Enter a valid email address.']);

  if (mode === 'register') {
    if (password.length < 8) errors.push(['password', 'Use at least 8 characters.']);
    else if (new TextEncoder().encode(password).length > 72) errors.push(['password', 'Use at most 72 characters.']);
    if (form.elements.confirm.value !== password) errors.push(['confirm', 'The passwords do not match.']);
  } else if (!password) {
    errors.push(['password', 'Enter your password.']);
  }
  return errors;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(form);
  formError.textContent = '';

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const errors = validate(email, password);
  if (errors.length) {
    errors.forEach(([id, message]) => setFieldError(id, message));
    document.getElementById(errors[0][0]).focus();
    return;
  }

  setBusy(submit, true, mode === 'register' ? 'Creating account…' : 'Logging in…');
  try {
    if (mode === 'register') await api.register(email, password);
    else await api.login(email, password);
    location.href = next;
  } catch (err) {
    setBusy(submit, false);
    let first = showServerFieldErrors(err, { email: 'email', password: 'password' });
    if (err.status === 409) {
      setFieldError('email', `${err.message} Log in instead.`);
      first = 'email';
    }
    if (first) document.getElementById(first).focus();
    else formError.textContent = err.message;
  }
});

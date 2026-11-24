import { api } from './api.js';

// Builds an element safely: strings become text, never HTML.
// el('a', { class: 'btn', href: 'x.html', text: 'Go' }, child, 'more text')
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) {
    if (child != null && child !== false && child !== '') node.append(child);
  }
  return node;
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Only allows our own pages as a redirect target, e.g. "results.html?id=...".
export function safeNext(value) {
  return value && /^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(value) ? value : null;
}

function currentPage() {
  return (location.pathname.split('/').pop() || 'upload.html') + location.search;
}

// Sends logged-out visitors to the login page, then back here afterwards.
export async function requireUser() {
  try {
    const { user } = await api.me();
    showLoggedIn(user);
    return user;
  } catch (err) {
    if (err.status === 401) {
      goToLogin();
      return new Promise(() => {}); // the page is leaving; stop here
    }
    throw err;
  }
}

export function goToLogin() {
  location.replace(`login.html?next=${encodeURIComponent(currentPage())}`);
}

// Swaps the nav's "Log in" link for a "Log out" button.
function showLoggedIn(user) {
  const link = document.querySelector('.nav .login');
  if (!link) return;
  const button = el('button', { type: 'button', class: 'link login', title: `Logged in as ${user.email}`, text: 'Log out' });
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api.logout();
    } finally {
      location.href = 'login.html';
    }
  });
  link.replaceWith(button);
}

// Shows a message under the page heading, replacing any earlier one.
export function showPageError(message) {
  let box = document.getElementById('page-error');
  if (!box) {
    box = el('div', { id: 'page-error', class: 'notice bad', role: 'alert' });
    const heading = document.querySelector('main h1');
    if (heading) heading.after(box);
    else document.querySelector('main').prepend(box);
  }
  box.textContent = message;
}

// Field errors live in <p class="error" id="err-FIELD" hidden> next to each input.
export function setFieldError(id, message) {
  const input = document.getElementById(id);
  const box = document.getElementById(`err-${id}`);
  if (!box) return;
  box.textContent = message || '';
  box.hidden = !message;
  if (message) input?.setAttribute('aria-invalid', 'true');
  else input?.removeAttribute('aria-invalid');
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.error').forEach((box) => { box.hidden = true; });
  form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
}

// Hides a field's error as soon as the user edits that field.
export function clearOnEdit(form) {
  for (const type of ['input', 'change']) {
    form.addEventListener(type, (e) => {
      if (e.target.id) setFieldError(e.target.id, '');
    });
  }
}

// Puts server-side field errors next to the matching inputs. map: { serverField: inputId }.
// Returns the id of the first input with an error, or null.
export function showServerFieldErrors(err, map) {
  let first = null;
  for (const detail of err.details || []) {
    const id = map[detail.field];
    if (!id) continue;
    setFieldError(id, detail.message);
    first ??= id;
  }
  return first;
}

export function setBusy(button, busy, label) {
  if (busy) {
    button.dataset.label ??= button.textContent;
    button.textContent = label;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.label ?? button.textContent;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

// If the browser restores this page from its back/forward cache, re-enable busy buttons.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) document.querySelectorAll('button[aria-busy="true"]').forEach((b) => setBusy(b, false));
});

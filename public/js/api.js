// Calls the back end. Every function returns the parsed JSON, or throws an Error with
// .status (HTTP status, 0 when the server can't be reached) and .details (field errors).
async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin', // sends the login cookie
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw apiError('Could not reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message = data.error;
    if (!message && res.status === 504) message = 'The server took too long to answer. Please try again.';
    if (!message) message = 'Something went wrong on our side. Please try again.';
    throw apiError(message, res.status, data.details);
  }
  return data;
}

function apiError(message, status, details = []) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}

const post = (path, body) => request(path, { method: 'POST', body });
const id = (value) => encodeURIComponent(value);

export const api = {
  register: (email, password) => post('/auth/register', { email, password }),
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  listResumes: () => request('/resumes'),
  createResume: (data) => post('/resumes', data),
  deleteResume: (resumeId) => request(`/resumes/${id(resumeId)}`, { method: 'DELETE' }),

  createJobDescription: (data) => post('/job-descriptions', data),

  createAnalysis: (resume_id, job_description_id) => post('/analyses', { resume_id, job_description_id }),
  listAnalyses: (resumeId) => request(resumeId ? `/analyses?resume_id=${id(resumeId)}` : '/analyses'),
  getAnalysis: (analysisId) => request(`/analyses/${id(analysisId)}`),
};

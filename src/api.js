async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include', // sends the login cookie
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed.');
    err.status = res.status;
    err.details = data.details; // field-level messages for forms
    throw err;
  }
  return data;
}

export const api = {
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  listResumes: () => request('/resumes'),
  createResume: (data) => request('/resumes', { method: 'POST', body: data }),
  deleteResume: (id) => request(`/resumes/${id}`, { method: 'DELETE' }),

  createJobDescription: (data) => request('/job-descriptions', { method: 'POST', body: data }),
  createAnalysis: (resume_id, job_description_id) =>
    request('/analyses', { method: 'POST', body: { resume_id, job_description_id } }),
  getAnalysis: (id) => request(`/analyses/${id}`),
};

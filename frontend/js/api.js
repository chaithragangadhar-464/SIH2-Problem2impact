// ============================================================
// API.JS — Fetch wrapper with JWT, error handling, toast
// ============================================================

import { API_BASE_URL } from './config.js';
import { showToast } from './utils.js';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('p2i_token');

  const headers = {
    ...options.headers,
  };

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (res.status === 401) {
      localStorage.removeItem('p2i_token');
      localStorage.removeItem('p2i_user');
      showToast('Session expired. Please log in again.', 'error');
      setTimeout(() => { window.location.href = '/login.html'; }, 1500);
      throw new Error('Unauthorized');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || data?.error || `Error ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      console.error('[API]', err.message);
    }
    throw err;
  }
}

export const api = {
  get:    (url, opts)  => request(url, { method: 'GET',    ...opts }),
  post:   (url, body)  => request(url, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (url, body)  => request(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (url)        => request(url, { method: 'DELETE' }),
  upload: (url, form)  => request(url, { method: 'POST',   body: form }),
};

// ── Specific API helpers ──────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const problemsAPI = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/problems${qs ? '?' + qs : ''}`);
  },
  get:    (id)           => api.get(`/problems/${id}`),
  create: (form)         => api.upload('/problems', form),
  byCategory: (cat)      => api.get(`/problems/category/${cat}`),
};

export const teamsAPI = {
  create: (data)         => api.post('/teams', data),
  get:    (id)           => api.get(`/teams/${id}`),
  invite: (id, data)     => api.post(`/teams/${id}/invite`, data),
};

export const solutionsAPI = {
  submit:    (form)       => api.upload('/solutions', form),
  byProblem: (id)         => api.get(`/solutions/problem/${id}`),
  finalize:  (id, data)   => api.patch(`/solutions/${id}/finalize`, data),
};

export const matchAPI = {
  collaborators: (problemId) => api.get(`/match/${problemId}`),
  validate:      (data)      => api.post('/match/validate-solution', data),
};

export const usersAPI = {
  get:        (id)       => api.get(`/users/${id}`),
  updateSkills:(id, data)=> api.patch(`/users/${id}/skills`, data),
};
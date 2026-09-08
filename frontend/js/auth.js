// ============================================================
// AUTH.JS — Authentication helpers, route guarding
// ============================================================

import { authAPI } from './api.js';
import { showToast, setLoading } from './utils.js';

const TOKEN_KEY = 'p2i_token';
const USER_KEY  = 'p2i_user';

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken() && !!getCurrentUser();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login.html';
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ── Route guard ───────────────────────────────────────────
export function requireAuth(redirectTo = '/login.html') {
  if (!isLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

export function requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    showToast('Access restricted. Insufficient permissions.', 'error');
    setTimeout(() => { window.location.href = '/index.html'; }, 1500);
    return false;
  }
  return true;
}

// ── Login form ────────────────────────────────────────────
export function initLoginForm() {
  const form  = document.getElementById('login-form');
  const btn   = document.getElementById('login-btn');
  const pwdInput = document.getElementById('password');
  const toggle   = document.getElementById('pwd-toggle');

  if (!form) return;

  // Password toggle
  toggle?.addEventListener('click', () => {
    const showing = pwdInput.type === 'text';
    pwdInput.type = showing ? 'password' : 'text';
    toggle.innerHTML = showing
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('email').value.trim();
    const password = pwdInput.value;

    if (!email || !password) { showToast('Please fill in all fields.', 'error'); return; }

    setLoading(btn, true);
    try {
      const res = await authAPI.login({ email, password });
      saveSession(res.token, res.user);
      showToast('Welcome back!', 'success');

      const dest = res.user.role === 'government' || res.user.role === 'ngo' || res.user.role === 'industry'
        ? '/dashboard-gov.html'
        : '/problems.html';

      setTimeout(() => { window.location.href = dest; }, 800);
    } catch (err) {
      showToast(err.message || 'Login failed. Check your credentials.', 'error');
      setLoading(btn, false);
    }
  });
}

// ── Register form ─────────────────────────────────────────
export function initRegisterForm(selectedSkills) {
  const form = document.getElementById('register-form');
  const btn  = document.getElementById('register-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.querySelector('.role-option.selected')?.dataset.role;

    if (!name || !email || !password || !role) {
      showToast('Please fill in all required fields and select a role.', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    const payload = {
      name, email, password, role,
      skills: [...selectedSkills],
      availableToSolve: document.getElementById('available-toggle')?.checked ?? false,
      university:   document.getElementById('university')?.value?.trim() || undefined,
      organization: document.getElementById('organization')?.value?.trim() || undefined,
    };

    setLoading(btn, true);
    try {
      const res = await authAPI.register(payload);
      saveSession(res.token, res.user);
      showToast('Account created! Welcome to Problem2Impact.', 'success');
      setTimeout(() => { window.location.href = '/problems.html'; }, 1000);
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      setLoading(btn, false);
    }
  });
}
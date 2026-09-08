// ============================================================
// UTILS.JS — Shared helpers
// ============================================================

// ── Toast ─────────────────────────────────────────────────
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'info', duration = 4000) {
  const container = getToastContainer();
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span style="flex-shrink:0;font-size:1rem">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Date ──────────────────────────────────────────────────
export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(isoString) {
  if (!isoString) return '';
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (seconds < 60)  return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`;
  return `${Math.floor(seconds/86400)}d ago`;
}

// ── String ────────────────────────────────────────────────
export function truncate(str, n = 120) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Debounce ──────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ── DOM ───────────────────────────────────────────────────
export function el(selector, context = document) {
  return context.querySelector(selector);
}

export function els(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

export function createElement(tag, className, html = '') {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

// ── Status badge helper ───────────────────────────────────
export function statusBadge(status) {
  const map = {
    open:         { label: 'Open',          cls: 'badge--teal' },
    in_progress:  { label: 'In Progress',   cls: 'badge--saffron' },
    under_review: { label: 'Under Review',  cls: 'badge--navy' },
    solved:       { label: 'Solved',        cls: 'badge--success' },
    closed:       { label: 'Closed',        cls: 'badge--gray' },
  };
  const s = map[status] || { label: status, cls: 'badge--gray' };
  return `<span class="badge ${s.cls}"><span class="badge__dot"></span>${s.label}</span>`;
}

// ── Loading state ─────────────────────────────────────────
export function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Loading…`;
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText || btn.dataset.original || btn.innerHTML;
  }
}

// ── Form validation ───────────────────────────────────────
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getFormData(formEl) {
  const fd = new FormData(formEl);
  const obj = {};
  for (const [k, v] of fd.entries()) {
    obj[k] = v;
  }
  return obj;
}

// ── Pagination ────────────────────────────────────────────
export function renderPagination(container, { page, totalPages, onPage }) {
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(`
      <button class="btn btn--ghost btn--sm ${i === page ? 'btn--primary' : ''}" data-page="${i}">${i}</button>
    `);
  }
  container.innerHTML = `
    <div class="flex gap-2">
      <button class="btn btn--ghost btn--sm" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>← Prev</button>
      ${pages.join('')}
      <button class="btn btn--ghost btn--sm" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next →</button>
    </div>
  `;
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => onPage(+btn.dataset.page));
  });
}

// ── URL params ────────────────────────────────────────────
export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── Category icon ─────────────────────────────────────────
export function catIcon(cat) {
  const icons = {
    education: '🎓', healthcare: '🏥', agriculture: '🌾',
    transportation: '🚌', industry: '🏭', environment: '🌿',
    'water-sanitation': '💧', other: '📌',
    'Water & Sanitation': '💧', Education: '🎓',
    Healthcare: '🏥', Agriculture: '🌾',
    Transportation: '🚌', Industry: '🏭',
    Environment: '🌿', Other: '📌',
  };
  return icons[cat] || '📌';
}
// ============================================================
// POST-PROBLEM.JS — Multi-step problem submission form
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { problemsAPI } from './api.js';
import { showToast, setLoading } from './utils.js';
import { requireAuth } from './auth.js';
import { CATEGORIES, SKILLS } from './config.js';

let currentStep   = 1;
const TOTAL_STEPS = 5;
const formData    = {};
let uploadedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  renderNavbar();
  renderFooter();
  renderCategoryOptions();
  renderSkillsPanel();
  bindStepNav();
  bindToggle();
  bindFileUpload();
  bindCharCounters();
});

// ── Step navigation ───────────────────────────────────────
function bindStepNav() {
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) goToStep(currentStep + 1);
    });
  });

  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => goToStep(currentStep - 1));
  });

  document.getElementById('submit-btn')?.addEventListener('click', submitProblem);
}

function goToStep(step) {
  if (step < 1 || step > TOTAL_STEPS) return;

  // Save current step data
  collectStepData(currentStep);

  // Hide old step
  document.querySelector(`.form-step[data-step="${currentStep}"]`)?.classList.remove('active');
  document.querySelector(`.step-item[data-step="${currentStep}"]`)?.classList.remove('active');
  document.querySelector(`.step-item[data-step="${currentStep}"]`)?.classList.add('done');
  document.querySelector(`.step-connector[data-after="${currentStep}"]`)?.classList.add('done');

  currentStep = step;

  // Show new step
  document.querySelector(`.form-step[data-step="${currentStep}"]`)?.classList.add('active');
  document.querySelector(`.step-item[data-step="${currentStep}"]`)?.classList.add('active');
  document.querySelector(`.step-item[data-step="${currentStep}"]`)?.classList.remove('done');

  // Update progress
  document.getElementById('step-progress')?.style.setProperty('width', `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`);

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // If step 5 (review), populate summary
  if (currentStep === 5) renderReview();
}

function collectStepData(step) {
  const inputs = document.querySelectorAll(`.form-step[data-step="${step}"] [name]`);
  inputs.forEach(inp => { formData[inp.name] = inp.value; });
}

// ── Validation per step ───────────────────────────────────
function validateStep(step) {
  const required = {
    1: ['title', 'description'],
    2: [],  // evidence is optional
    3: ['location', 'category'],
    4: ['expectedOutcome'],
    5: [],
  };

  for (const field of (required[step] || [])) {
    const el = document.querySelector(`[name="${field}"]`);
    if (!el || !el.value.trim()) {
      showToast(`Please fill in the "${field.replace(/([A-Z])/g, ' $1')}" field.`, 'error');
      el?.focus();
      el?.classList.add('error');
      setTimeout(() => el?.classList.remove('error'), 2000);
      return false;
    }
  }

  // Step 1: description length
  if (step === 1) {
    const desc = document.querySelector('[name="description"]')?.value.trim();
    if (desc && desc.length < 50) {
      showToast('Please provide a more detailed description (at least 50 characters).', 'error');
      return false;
    }
  }

  return true;
}

// ── Category options ──────────────────────────────────────
function renderCategoryOptions() {
  const select = document.getElementById('category-select');
  const grid   = document.getElementById('category-radio-grid');
  if (!grid) return;

  const CATEGORIES_FULL = [
    { id: 'Education', icon: '🎓' }, { id: 'Healthcare', icon: '🏥' },
    { id: 'Agriculture', icon: '🌾' }, { id: 'Transportation', icon: '🚌' },
    { id: 'Industry', icon: '🏭' }, { id: 'Environment', icon: '🌿' },
    { id: 'Water & Sanitation', icon: '💧' }, { id: 'Other', icon: '📌' },
  ];

  grid.innerHTML = CATEGORIES_FULL.map(c => `
    <label class="category-card" style="cursor:pointer">
      <input type="radio" name="category" value="${c.id}" style="display:none" onchange="document.querySelectorAll('.category-card').forEach(el=>el.classList.remove('selected'));this.closest('.category-card').classList.add('selected')">
      <div class="category-card__icon">${c.icon}</div>
      <div class="category-card__name">${c.id}</div>
    </label>
  `).join('');
}

// ── Skills panel (step 4 conditional) ────────────────────
function renderSkillsPanel() {
  const panel = document.getElementById('skills-panel');
  const wrap  = document.getElementById('skills-wrap');
  if (!wrap) return;

  wrap.innerHTML = SKILLS.map(s => `
    <button type="button" class="skill-tag" data-skill="${s}" onclick="toggleSkill(this)">${s}</button>
  `).join('');
}

window.toggleSkill = (btn) => {
  btn.classList.toggle('selected');
  const selected = [...document.querySelectorAll('.skill-tag.selected')].map(b => b.dataset.skill);
  formData.skillsRequired = selected;
};

// ── Skills toggle (domain knowledge toggle) ───────────────
function bindToggle() {
  const toggle = document.getElementById('domain-toggle');
  const panel  = document.getElementById('skills-panel');
  toggle?.addEventListener('change', () => {
    if (panel) panel.style.display = toggle.checked ? 'block' : 'none';
  });
}

// ── File upload ───────────────────────────────────────────
function bindFileUpload() {
  const zone  = document.getElementById('evidence-zone');
  const input = document.getElementById('evidence-input');
  const list  = document.getElementById('file-list');

  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles([...e.dataTransfer.files]);
  });

  input.addEventListener('change', () => handleFiles([...input.files]));

  function handleFiles(files) {
    files.forEach(file => {
      if (uploadedFiles.length >= 5) { showToast('Maximum 5 files allowed.', 'warning'); return; }
      uploadedFiles.push(file);
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span>📎</span>
        <span class="file-item__name">${file.name}</span>
        <span class="file-item__size">${(file.size / 1024).toFixed(1)} KB</span>
        <button class="file-item__remove" type="button" onclick="removeFile('${file.name}',this.parentElement)">✕</button>
      `;
      list?.appendChild(item);
    });
  }
}

window.removeFile = (name, el) => {
  uploadedFiles = uploadedFiles.filter(f => f.name !== name);
  el?.remove();
};

// ── Char counters ─────────────────────────────────────────
function bindCharCounters() {
  document.querySelectorAll('[data-maxlength]').forEach(el => {
    const max     = +el.dataset.maxlength;
    const counter = document.querySelector(`[data-counter-for="${el.name || el.id}"]`);
    if (!counter) return;
    el.addEventListener('input', () => {
      const len = el.value.length;
      counter.textContent = `${len}/${max}`;
      counter.className = `char-count${len > max * 0.9 ? ' warn' : ''}${len > max ? ' over' : ''}`;
    });
  });
}

// ── Review ────────────────────────────────────────────────
function renderReview() {
  collectStepData(currentStep - 1);
  const panel = document.getElementById('review-panel');
  if (!panel) return;

  const cat = document.querySelector('[name="category"]:checked')?.value || formData.category || '—';
  const skills = formData.skillsRequired?.length
    ? formData.skillsRequired.map(s => `<span class="skill-tag selected">${s}</span>`).join('')
    : '<em style="color:var(--color-text-muted)">None specified</em>';

  panel.innerHTML = `
    <div class="card">
      <div class="card__body" style="display:flex;flex-direction:column;gap:var(--space-5)">
        <div>
          <div class="text-muted" style="margin-bottom:var(--space-1)">Title</div>
          <div style="font-family:var(--font-display);font-size:var(--text-lg)">${formData.title || '—'}</div>
        </div>
        <div>
          <div class="text-muted" style="margin-bottom:var(--space-1)">Description</div>
          <p style="color:var(--color-text-mid)">${formData.description || '—'}</p>
        </div>
        <div class="grid-2" style="gap:var(--space-4)">
          <div><div class="text-muted" style="margin-bottom:var(--space-1)">Location</div><strong>${formData.location || '—'}</strong></div>
          <div><div class="text-muted" style="margin-bottom:var(--space-1)">Category</div><span class="badge badge--teal">${cat}</span></div>
        </div>
        <div>
          <div class="text-muted" style="margin-bottom:var(--space-1)">Expected Outcome</div>
          <p style="color:var(--color-text-mid)">${formData.expectedOutcome || '—'}</p>
        </div>
        <div>
          <div class="text-muted" style="margin-bottom:var(--space-2)">Skills Required</div>
          <div class="flex flex-wrap gap-2">${skills}</div>
        </div>
        ${formData.budget ? `<div><div class="text-muted" style="margin-bottom:var(--space-1)">Budget</div><strong>₹${Number(formData.budget).toLocaleString('en-IN')}</strong></div>` : ''}
        ${uploadedFiles.length ? `<div><div class="text-muted" style="margin-bottom:var(--space-1)">Evidence files</div><strong>${uploadedFiles.length} file(s) attached</strong></div>` : ''}
      </div>
    </div>
  `;
}

// ── Submit ────────────────────────────────────────────────
async function submitProblem() {
  const btn = document.getElementById('submit-btn');
  const category = document.querySelector('[name="category"]:checked')?.value || formData.category;

  if (!formData.title || !formData.description || !formData.location || !category || !formData.expectedOutcome) {
    showToast('Some required fields are missing. Please go back and complete all steps.', 'error');
    return;
  }

  const fd = new FormData();
  fd.append('title',           formData.title);
  fd.append('description',     formData.description);
  fd.append('location',        formData.location);
  fd.append('category',        category);
  fd.append('expectedOutcome', formData.expectedOutcome);
  if (formData.budget)          fd.append('budget', formData.budget);
  if (formData.skillsRequired)  fd.append('skillsRequired', JSON.stringify(formData.skillsRequired));
  uploadedFiles.forEach(f => fd.append('evidence', f));

  setLoading(btn, true);
  try {
    const res = await problemsAPI.create(fd);
    showToast('Problem posted successfully!', 'success');
    setTimeout(() => { window.location.href = `/problem-detail.html?id=${res._id || res.problem?._id}`; }, 1200);
  } catch (err) {
    showToast(err.message || 'Failed to post problem. Please try again.', 'error');
    setLoading(btn, false);
  }
}
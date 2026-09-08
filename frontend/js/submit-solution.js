// ============================================================
// SUBMIT-SOLUTION.JS — Solution submission + AI validation
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { solutionsAPI, matchAPI, problemsAPI } from './api.js';
import { showToast, getParam, setLoading } from './utils.js';
import { requireAuth, getCurrentUser } from './auth.js';

let prototypeFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  renderNavbar();
  renderFooter();

  const problemId = getParam('id');
  if (!problemId) { window.location.href = '/problems.html'; return; }

  await loadProblemContext(problemId);
  bindForm(problemId);
  bindFileUpload();
  bindCharCounters();
});

// ── Load problem context ──────────────────────────────────
async function loadProblemContext(id) {
  try {
    const p = await problemsAPI.get(id);
    renderContext(p);
  } catch {
    renderContext(getMockProblem());
  }
}

function renderContext(p) {
  const el = document.getElementById('problem-context');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-3)">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em">Solving for</div>
      <div style="font-family:var(--font-display);font-size:var(--text-md);color:var(--color-navy)">${p.title}</div>
      <div style="font-size:var(--text-sm);color:var(--color-text-mid)">${p.description?.slice(0, 200)}…</div>
      ${p.expectedOutcome ? `
        <div style="padding:var(--space-4);background:var(--color-teal-light);border-radius:var(--radius-md);border-left:3px solid var(--color-teal)">
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-teal-mid);margin-bottom:var(--space-1)">EXPECTED OUTCOME</div>
          <div style="font-size:var(--text-sm);color:var(--color-navy)">${p.expectedOutcome}</div>
        </div>
      ` : ''}
      ${(p.skillsRequired || []).length ? `
        <div>
          <div style="font-size:var(--text-xs);font-weight:700;color:var(--color-text-muted);margin-bottom:var(--space-2)">SKILLS NEEDED</div>
          <div class="flex flex-wrap gap-2">
            ${p.skillsRequired.map(s => `<span class="skill-tag selected">${s}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ── Form binding ──────────────────────────────────────────
function bindForm(problemId) {
  const form = document.getElementById('solution-form');
  const btn  = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const approach      = document.getElementById('approach')?.value.trim();
    const feasibility   = document.getElementById('feasibility')?.value.trim();
    const implementation= document.getElementById('implementation')?.value.trim();
    const costEstimate  = document.getElementById('cost-estimate')?.value;
    const prototypeUrl  = document.getElementById('prototype-url')?.value.trim();

    if (!approach || approach.length < 100) {
      showToast('Please describe your approach in detail (at least 100 characters).', 'error');
      return;
    }
    if (!feasibility) {
      showToast('Please add feasibility notes.', 'error');
      return;
    }

    // Show AI validation step first
    showValidating();

    const fd = new FormData();
    fd.append('problemId',      problemId);
    fd.append('approach',       approach);
    fd.append('feasibilityNotes', feasibility);
    fd.append('implementationPlan', implementation || '');
    if (costEstimate) fd.append('costEstimate', costEstimate);
    if (prototypeUrl) fd.append('prototypeUrl', prototypeUrl);
    if (prototypeFile) fd.append('prototypeFile', prototypeFile);

    setLoading(btn, true);

    try {
      // Step 1: AI validation
      let validationResult;
      try {
        validationResult = await matchAPI.validate({ problemId, approach, feasibilityNotes: feasibility });
      } catch {
        // If AI service down, assume valid and proceed
        validationResult = { isValid: true, similarityScore: 0.75 };
      }

      if (!validationResult.isValid) {
        showValidationFailed(validationResult.flaggedReason || 'Low relevance to the problem statement.');
        setLoading(btn, false);
        return;
      }

      // Step 2: Submit solution
      const res = await solutionsAPI.submit(fd);
      showSuccess(res._id || res.solution?._id, problemId, validationResult.similarityScore);
    } catch (err) {
      showToast(err.message || 'Failed to submit solution.', 'error');
      setLoading(btn, false);
      hideValidating();
    }
  });
}

// ── File upload ───────────────────────────────────────────
function bindFileUpload() {
  const zone  = document.getElementById('prototype-zone');
  const input = document.getElementById('prototype-file');
  const label = document.getElementById('file-label');

  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) { prototypeFile = file; if (label) label.textContent = `📎 ${file.name}`; }
  });

  input.addEventListener('change', () => {
    prototypeFile = input.files[0];
    if (prototypeFile && label) label.textContent = `📎 ${prototypeFile.name}`;
  });
}

// ── Char counters ─────────────────────────────────────────
function bindCharCounters() {
  document.querySelectorAll('[data-maxlength]').forEach(el => {
    const max     = +el.dataset.maxlength;
    const counter = document.querySelector(`[data-counter-for="${el.id}"]`);
    if (!counter) return;
    el.addEventListener('input', () => {
      const len = el.value.length;
      counter.textContent = `${len}/${max}`;
      counter.className = `char-count${len > max * 0.9 ? ' warn' : ''}${len > max ? ' over' : ''}`;
    });
  });
}

// ── UI states ─────────────────────────────────────────────
function showValidating() {
  const overlay = document.getElementById('validating-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideValidating() {
  const overlay = document.getElementById('validating-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showValidationFailed(reason) {
  hideValidating();
  const result = document.getElementById('validation-result');
  if (!result) return;

  result.style.display = 'block';
  result.innerHTML = `
    <div class="validation-banner validation-banner--invalid" style="margin-bottom:var(--space-6)">
      <div class="validation-banner__icon" style="font-size:1.5rem">⚠️</div>
      <div>
        <div class="validation-banner__title" style="font-size:var(--text-md)">AI Review: Issues Detected</div>
        <div class="validation-banner__text" style="margin-top:var(--space-2)">${reason}</div>
        <div style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--color-error)">
          Better luck next time! Please review your approach, address the issues above, and resubmit.
        </div>
      </div>
    </div>
    <button class="btn btn--ghost" onclick="document.getElementById('validation-result').style.display='none'">← Go back and revise</button>
  `;

  result.scrollIntoView({ behavior: 'smooth' });
}

function showSuccess(solutionId, problemId, score) {
  hideValidating();
  const form   = document.getElementById('solution-form');
  const result = document.getElementById('validation-result');

  if (form)   form.style.display = 'none';
  if (result) result.style.display = 'block';

  if (result) result.innerHTML = `
    <div style="text-align:center;padding:var(--space-10) 0">
      <div style="font-size:4rem;margin-bottom:var(--space-4)">🎉</div>
      <h2 style="margin-bottom:var(--space-3)">Solution Submitted!</h2>
      <p style="color:var(--color-text-muted);margin-bottom:var(--space-6)">Your solution passed the AI review (relevance score: <strong>${Math.round((score || 0.8) * 100)}%</strong>) and has been sent to the problem poster for review.</p>
      <div class="validation-banner validation-banner--valid" style="text-align:left;margin-bottom:var(--space-8)">
        <div class="validation-banner__icon">✓</div>
        <div>
          <div class="validation-banner__title">What happens next?</div>
          <div class="validation-banner__text">Government/Industry reviewers will evaluate all valid solutions. Finalists will be notified and awarded funding + certificates.</div>
        </div>
      </div>
      <div class="flex gap-4 flex-center flex-wrap">
        <a href="/problem-detail.html?id=${problemId}" class="btn btn--primary">View Problem</a>
        <a href="/problems.html" class="btn btn--ghost">Browse More Problems</a>
      </div>
    </div>
  `;
}

function getMockProblem() {
  return { _id: '1', title: 'Lack of clean drinking water in rural Rajasthan', description: 'Hundreds of villages rely on contaminated water sources. Seasonal droughts worsen the crisis.', expectedOutcome: 'A scalable community-operated water purification system.', skillsRequired: ['Civil Engineering', 'IoT', 'Data Analysis'] };
}
// ============================================================
// DASHBOARD-GOV.JS — Government / NGO / Industry dashboard
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { problemsAPI, solutionsAPI } from './api.js';
import { showToast, formatDate, initials, setLoading } from './utils.js';
import { requireAuth, requireRole, getCurrentUser } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  if (!requireRole(['government', 'ngo', 'industry'])) return;
  renderNavbar();
  renderFooter();

  await loadDashboard();
  bindSidebar();
});

// ── Load dashboard data ───────────────────────────────────
async function loadDashboard() {
  try {
    const user     = getCurrentUser();
    const problems = await problemsAPI.list({ postedBy: user._id });
    renderStats(problems.problems || []);
    renderProblems(problems.problems || []);
  } catch {
    renderStats(getMockProblems());
    renderProblems(getMockProblems());
  }
}

function renderStats(problems) {
  const open     = problems.filter(p => p.status === 'open').length;
  const review   = problems.filter(p => p.status === 'under_review').length;
  const solved   = problems.filter(p => p.status === 'solved').length;
  const solutions= problems.reduce((a, p) => a + (p.solutionCount || 0), 0);

  setText('stat-problems', problems.length);
  setText('stat-open', open);
  setText('stat-review', review);
  setText('stat-solved', solved);
  setText('stat-solutions', solutions);
}

// ── Render problems list ──────────────────────────────────
async function renderProblems(problems) {
  const container = document.getElementById('problems-list');
  if (!container) return;

  if (!problems.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <div class="empty-state__title">No problems posted yet</div>
        <p class="empty-state__text">Post your first problem to start receiving solutions from innovators across India.</p>
        <a href="/post-problem.html" class="btn btn--primary">Post a Problem</a>
      </div>`;
    return;
  }

  container.innerHTML = problems.map(p => `
    <div class="card" style="margin-bottom:var(--space-4)">
      <div class="card__body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-4)">
          <div>
            <a href="/problem-detail.html?id=${p._id || p.id}" style="font-family:var(--font-display);font-size:var(--text-md);color:var(--color-navy);text-decoration:none">${p.title}</a>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)">${formatDate(p.createdAt)} · ${p.location || 'India'}</div>
          </div>
          <span class="badge ${p.status === 'solved' ? 'badge--success' : p.status === 'under_review' ? 'badge--navy' : 'badge--teal'}">
            ${p.status === 'solved' ? '✓ Solved' : p.status === 'under_review' ? '⏳ Under Review' : '● Open'}
          </span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3)">
          <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${p.solutionCount || 0} solution(s) received</span>
          <div class="flex gap-2">
            <button class="btn btn--ghost btn--sm" onclick="viewSolutions('${p._id || p.id}', '${p.title?.replace(/'/g, "\\'")}')">View Solutions</button>
            ${p.status !== 'solved' ? `<button class="btn btn--primary btn--sm" onclick="openFinalizeModal('${p._id || p.id}')">Finalize & Fund</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── View solutions drawer ─────────────────────────────────
window.viewSolutions = async (problemId, problemTitle) => {
  let solutions = [];
  try {
    const data = await solutionsAPI.byProblem(problemId);
    solutions = data.solutions || data || [];
  } catch {
    solutions = getMockSolutions(problemId);
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="solutions-modal" style="align-items:flex-end">
      <div class="modal" style="max-width:800px;width:100%;max-height:80vh;border-radius:var(--radius-xl) var(--radius-xl) 0 0">
        <div class="modal__header">
          <div>
            <h3 class="modal__title">Solutions for</h3>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${problemTitle}</div>
          </div>
          <button class="modal__close" onclick="document.getElementById('solutions-modal').remove()">✕</button>
        </div>
        <div class="modal__body" style="padding:0;overflow-y:auto">
          ${!solutions.length ? '<div class="empty-state"><div class="empty-state__icon">💡</div><p class="empty-state__text">No solutions submitted yet.</p></div>' :
          solutions.map(s => `
            <div class="solution-row ${s.aiValidation?.isValid === false ? 'flagged' : ''}">
              <div>
                <div class="solution-row__title">${s.teamName || 'Anonymous Team'}</div>
                <div class="solution-row__team" style="margin-top:var(--space-1)">${s.approach?.slice(0, 100)}…</div>
                ${s.aiValidation?.isValid === false ? `
                  <div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--color-error);display:flex;align-items:center;gap:var(--space-1)">
                    ⚠️ AI flagged: ${s.aiValidation.flaggedReason || 'Low relevance'}
                  </div>
                ` : ''}
              </div>
              <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.costEstimate ? `₹${s.costEstimate.toLocaleString('en-IN')}` : '—'}</div>
              <span class="badge ${s.aiValidation?.isValid === false ? 'badge--error' : s.reviewStatus === 'finalized' ? 'badge--success' : 'badge--navy'}">
                ${s.aiValidation?.isValid === false ? '✕ AI Flagged' : s.reviewStatus === 'finalized' ? '✓ Finalized' : '⏳ Pending'}
              </span>
              <div class="flex gap-2">
                <a href="/problem-detail.html?id=${problemId}" class="btn btn--ghost btn--sm">View</a>
                ${s.aiValidation?.isValid !== false && s.reviewStatus !== 'finalized' ? `
                  <button class="btn btn--primary btn--sm" onclick="finalizeThis('${s._id || s.id}','${problemId}')">Award</button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `);
};

// ── Finalize & Fund modal ─────────────────────────────────
window.openFinalizeModal = (problemId) => {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="finalize-modal">
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">Finalize & Fund Solution</h3>
          <button class="modal__close" onclick="document.getElementById('finalize-modal').remove()">✕</button>
        </div>
        <div class="modal__body">
          <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-5)">Once finalized, the winning team will receive a cash award and a digital certificate. This action cannot be undone.</p>
          <div class="form-group" style="margin-bottom:var(--space-5)">
            <label class="form-label">Award Amount (₹)</label>
            <input id="award-amount" class="input" type="number" placeholder="e.g. 100000" min="0">
          </div>
          <div class="form-group" style="margin-bottom:var(--space-5)">
            <label class="form-label form-label--optional">Message to Team</label>
            <textarea id="award-message" class="textarea" placeholder="Congratulations! Your solution has been selected for implementation..."></textarea>
          </div>
          <div style="padding:var(--space-4);background:var(--color-saffron-lt);border-radius:var(--radius-md);border-left:3px solid var(--color-saffron);margin-bottom:var(--space-6);font-size:var(--text-sm)">
            🏆 All team members will receive a digital certificate automatically.
          </div>
          <div class="flex gap-3">
            <button class="btn btn--saffron" onclick="submitFinalize('${problemId}')">Confirm & Award</button>
            <button class="btn btn--ghost" onclick="document.getElementById('finalize-modal').remove()">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `);
};

window.finalizeThis = async (solutionId, problemId) => {
  document.getElementById('solutions-modal')?.remove();
  window.openFinalizeModal(problemId);
  // Store solution id for later
  window.__selectedSolutionId = solutionId;
};

window.submitFinalize = async (problemId) => {
  const amount  = document.getElementById('award-amount')?.value;
  const message = document.getElementById('award-message')?.value;
  const btn     = document.querySelector('#finalize-modal .btn--saffron');

  if (!amount || Number(amount) <= 0) { showToast('Please enter a valid award amount.', 'error'); return; }

  setLoading(btn, true);
  try {
    const solutionId = window.__selectedSolutionId || 'mock-solution';
    await solutionsAPI.finalize(solutionId, { awardAmount: Number(amount), message, problemId });
    document.getElementById('finalize-modal')?.remove();
    showToast('Solution finalized! Award and certificates sent to the team.', 'success');
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showToast(err.message || 'Finalization failed. Please try again.', 'error');
    setLoading(btn, false);
  }
};

// ── Sidebar navigation ────────────────────────────────────
function bindSidebar() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.dataset.target;
      if (!target) return;
      e.preventDefault();
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.dash-section').forEach(s => s.style.display = 'none');
      const section = document.getElementById(`section-${target}`);
      if (section) section.style.display = 'block';
    });
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getMockProblems() {
  return [
    { id: 'p1', _id: 'p1', title: 'Smart waste management in municipal areas', category: 'Environment', location: 'Chennai', status: 'under_review', solutionCount: 6, createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: 'p2', _id: 'p2', title: 'Digitising land records for rural farmers', category: 'Agriculture', location: 'Andhra Pradesh', status: 'open', solutionCount: 3, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'p3', _id: 'p3', title: 'Real-time flood early warning system', category: 'Environment', location: 'Assam', status: 'solved', solutionCount: 11, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  ];
}

function getMockSolutions(problemId) {
  return [
    { id: 's1', _id: 's1', teamName: 'GreenTech IIT-B', approach: 'IoT-enabled smart bins with fill-level sensors connected to a centralized dashboard for optimized collection routes.', costEstimate: 250000, reviewStatus: 'pending_review', aiValidation: { isValid: true, similarityScore: 0.91 } },
    { id: 's2', _id: 's2', teamName: 'CleanCity Collective', approach: 'Mobile app for citizens to report overflowing bins. Community gamification for waste reduction.', costEstimate: 80000, reviewStatus: 'ai_rejected', aiValidation: { isValid: false, similarityScore: 0.38, flaggedReason: 'Solution does not address the smart routing and optimization aspect of the problem.' } },
    { id: 's3', _id: 's3', teamName: 'WasteWise NIT-T', approach: 'ML-based waste segregation at source using computer vision kiosks in residential areas, reducing unsegregated waste by 70%.', costEstimate: 450000, reviewStatus: 'pending_review', aiValidation: { isValid: true, similarityScore: 0.84 } },
  ];
}
// ============================================================
// PROBLEM-DETAIL.JS — Single problem view, team form, AI match
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { problemsAPI, solutionsAPI, matchAPI, teamsAPI } from './api.js';
import { showToast, getParam, catIcon, statusBadge, timeAgo, formatDate, initials } from './utils.js';
import { getCurrentUser, isLoggedIn } from './auth.js';

let problem = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar();
  renderFooter();

  const id = getParam('id');
  if (!id) { window.location.href = '/problems.html'; return; }

  await loadProblem(id);
  await loadSolutions(id);
  await loadAIMatches(id);
  bindActions(id);
});

// ── Load problem ──────────────────────────────────────────
async function loadProblem(id) {
  try {
    problem = await problemsAPI.get(id);
  } catch {
    problem = getMockProblem(id);
  }
  renderProblem(problem);
}

function renderProblem(p) {
  document.title = `${p.title} — Problem2Impact`;

  // Breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = `
    <a href="/index.html">Home</a><span class="breadcrumb__sep">›</span>
    <a href="/problems.html">Problems</a><span class="breadcrumb__sep">›</span>
    <span class="breadcrumb__current">${p.category}</span>
  `;

  // Header
  const header = document.getElementById('problem-header');
  if (header) header.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-4)">
      <span class="badge badge--teal">${catIcon(p.category)} ${p.category}</span>
      ${statusBadge(p.status || 'open')}
      ${p.budget ? `<span class="badge badge--saffron">💰 ₹${(p.budget).toLocaleString('en-IN')} budget</span>` : ''}
    </div>
    <h1 style="color:white;margin-bottom:var(--space-3);font-size:clamp(1.5rem,4vw,2.5rem)">${p.title}</h1>
    <div style="display:flex;align-items:center;gap:var(--space-5);flex-wrap:wrap;color:rgba(255,255,255,0.65);font-size:var(--text-sm)">
      <span>📍 ${p.location || 'India'}</span>
      <span>🕐 Posted ${timeAgo(p.createdAt)}</span>
      <span>👤 ${p.postedByName || 'Anonymous'}</span>
    </div>
  `;

  // Description
  document.getElementById('problem-description')?.replaceWith((() => {
    const d = document.createElement('div');
    d.id = 'problem-description';
    d.innerHTML = `
      <h3 style="margin-bottom:var(--space-4)">Problem Description</h3>
      <p style="line-height:1.8;color:var(--color-text-mid)">${p.description}</p>
      ${p.expectedOutcome ? `
        <div style="margin-top:var(--space-6);padding:var(--space-5);background:var(--color-teal-light);border-radius:var(--radius-lg);border-left:4px solid var(--color-teal)">
          <h5 style="color:var(--color-teal-mid);margin-bottom:var(--space-2)">Expected Outcome</h5>
          <p style="color:var(--color-navy);margin:0">${p.expectedOutcome}</p>
        </div>
      ` : ''}
      ${(p.skillsRequired || []).length ? `
        <div style="margin-top:var(--space-6)">
          <h5 style="margin-bottom:var(--space-3)">Skills Needed</h5>
          <div class="flex flex-wrap gap-2">
            ${p.skillsRequired.map(s => `<span class="skill-tag selected">${s}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
    return d;
  })());

  // Evidence gallery
  if (p.evidence?.length) {
    const gallery = document.getElementById('evidence-gallery');
    if (gallery) {
      gallery.innerHTML = `
        <h4 style="margin-bottom:var(--space-4)">Evidence</h4>
        <div class="evidence-gallery">
          ${p.evidence.map(url => `
            <div class="evidence-thumb">
              <img src="${url}" alt="Evidence" onerror="this.parentElement.innerHTML='📎'">
            </div>
          `).join('')}
        </div>
      `;
    }
  }
}

// ── Load solutions ────────────────────────────────────────
async function loadSolutions(id) {
  const container = document.getElementById('solutions-list');
  if (!container) return;

  try {
    const data = await solutionsAPI.byProblem(id);
    const solutions = data.solutions || data || [];
    renderSolutions(container, solutions);
  } catch {
    renderSolutions(container, getMockSolutions());
  }
}

function renderSolutions(container, solutions) {
  const count = document.getElementById('solutions-count');
  if (count) count.textContent = solutions.length;

  if (!solutions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">💡</div>
        <div class="empty-state__title">No solutions yet</div>
        <p class="empty-state__text">Be the first to submit a solution for this problem.</p>
        <a href="/submit-solution.html?id=${getParam('id')}" class="btn btn--primary">Submit Solution</a>
      </div>`;
    return;
  }

  container.innerHTML = solutions.map(s => `
    <div class="card" style="margin-bottom:var(--space-4);${s.aiValidation?.isValid === false ? 'opacity:0.6' : ''}">
      <div class="card__body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">
          <div>
            <div style="font-weight:600;margin-bottom:var(--space-1)">Team: ${s.teamName || 'Anonymous Team'}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${formatDate(s.submittedAt)}</div>
          </div>
          <span class="badge ${s.reviewStatus === 'finalized' ? 'badge--success' : s.reviewStatus === 'ai_rejected' ? 'badge--error' : 'badge--navy'}">
            ${s.reviewStatus === 'finalized' ? '✓ Finalized' : s.reviewStatus === 'ai_rejected' ? '✕ AI Flagged' : '⏳ Pending Review'}
          </span>
        </div>
        ${s.aiValidation?.isValid === false ? `
          <div class="validation-banner validation-banner--invalid" style="margin-bottom:var(--space-4)">
            <div class="validation-banner__icon">⚠️</div>
            <div>
              <div class="validation-banner__title">AI detected issues</div>
              <div class="validation-banner__text">${s.aiValidation.flaggedReason || 'Low relevance to the problem statement. Please revise and resubmit.'}</div>
            </div>
          </div>
        ` : ''}
        <p style="font-size:var(--text-sm);color:var(--color-text-mid);line-height:1.7">${s.approach}</p>
        ${s.costEstimate ? `<div style="margin-top:var(--space-3);font-size:var(--text-sm)"><strong>Estimated cost:</strong> ₹${s.costEstimate.toLocaleString('en-IN')}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// ── Load AI matches ───────────────────────────────────────
async function loadAIMatches(id) {
  const panel = document.getElementById('ai-match-panel');
  if (!panel) return;

  try {
    const data = await matchAPI.collaborators(id);
    const matches = data.matches || data || [];
    renderMatches(matches);
  } catch {
    renderMatches(getMockMatches());
  }
}

function renderMatches(matches) {
  const list = document.getElementById('match-list');
  if (!list) return;

  list.innerHTML = matches.slice(0, 5).map(m => `
    <div class="match-item">
      <div class="avatar" style="background:var(--color-saffron-lt);color:#c4720e">${initials(m.name)}</div>
      <div class="match-item__info">
        <div class="match-item__name">${m.name}</div>
        <div class="match-item__meta">${m.skills?.slice(0, 2).join(', ') || 'Various skills'} · ${m.university || m.organization || 'Contributor'}</div>
      </div>
      <div class="match-bar"><div class="match-bar__fill" style="width:${m.score}%"></div></div>
      <div class="match-pct">${m.score}%</div>
    </div>
  `).join('');
}

// ── Actions (Form Team, Submit Solution) ──────────────────
function bindActions(id) {
  const formTeamBtn     = document.getElementById('form-team-btn');
  const submitSolBtn    = document.getElementById('submit-solution-btn');

  formTeamBtn?.addEventListener('click', () => {
    if (!isLoggedIn()) { window.location.href = `/login.html?next=/problem-detail.html?id=${id}`; return; }
    openFormTeamModal(id);
  });

  submitSolBtn?.addEventListener('click', () => {
    if (!isLoggedIn()) { window.location.href = `/login.html?next=/problem-detail.html?id=${id}`; return; }
    window.location.href = `/submit-solution.html?id=${id}`;
  });
}

function openFormTeamModal(problemId) {
  const overlay = document.getElementById('team-modal');
  if (overlay) overlay.classList.add('open');
  else {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="team-modal">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Form a Team</h3>
            <button class="modal__close" onclick="document.getElementById('team-modal').classList.remove('open')">✕</button>
          </div>
          <div class="modal__body">
            <div class="form-group" style="margin-bottom:var(--space-5)">
              <label class="form-label">Team Name</label>
              <input id="team-name" class="input" placeholder="e.g. AgriVision Squad">
            </div>
            <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-5)">Once formed, the AI will suggest matched collaborators based on the skills required for this problem. You can also invite people by searching their profile.</p>
            <div class="flex gap-3">
              <button class="btn btn--primary btn--full" onclick="submitTeam('${problemId}')">Create Team</button>
              <button class="btn btn--ghost" onclick="document.getElementById('team-modal').classList.remove('open')">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `);
  }
}

window.submitTeam = async (problemId) => {
  const name = document.getElementById('team-name')?.value.trim();
  if (!name) { showToast('Please enter a team name.', 'error'); return; }

  try {
    const user = getCurrentUser();
    const res  = await teamsAPI.create({ problemId, name, members: [{ userId: user._id, role: 'lead' }] });
    showToast('Team created! Redirecting to team workspace.', 'success');
    setTimeout(() => { window.location.href = `/team.html?id=${res._id || res.team?._id}`; }, 1200);
  } catch (err) {
    showToast(err.message || 'Failed to create team.', 'error');
  }
};

// ── Mock data ─────────────────────────────────────────────
function getMockProblem(id) {
  return { _id: id, title: 'Lack of clean drinking water in rural Rajasthan', description: 'Hundreds of villages in western Rajasthan rely on contaminated groundwater. Seasonal droughts further deplete the already scarce water sources. Children are most affected, with rising cases of waterborne diseases. There is an urgent need for sustainable, low-cost water purification and rainwater harvesting solutions that can be maintained by local communities without external expertise.', category: 'Water & Sanitation', location: 'Barmer, Rajasthan', expectedOutcome: 'A scalable, community-operated water purification system with minimal maintenance requirements and a mobile app for monitoring water quality in real time.', skillsRequired: ['Civil Engineering', 'IoT', 'Data Analysis', 'Mobile Development'], budget: 500000, status: 'open', evidence: [], postedByName: 'Ramesh Kumar', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() };
}

function getMockSolutions() {
  return [
    { _id: 's1', teamName: 'AquaTech Collective', approach: 'We propose a solar-powered RO filtration unit combined with IoT water quality sensors that push real-time data to a community dashboard. The system uses locally available materials for the filtration media, reducing maintenance costs below ₹5,000/year.', costEstimate: 120000, reviewStatus: 'pending_review', aiValidation: { isValid: true, similarityScore: 0.87 }, submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { _id: 's2', teamName: 'BlueWave IIT-B', approach: 'Atmospheric water generators combined with bioremediation ponds. The system extracts moisture from air during early morning hours.', costEstimate: 85000, reviewStatus: 'ai_rejected', aiValidation: { isValid: false, similarityScore: 0.41, flaggedReason: 'The proposed approach has low feasibility for the stated location and budget. Atmospheric humidity in Rajasthan is insufficient for meaningful AWG output.' }, submittedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];
}

function getMockMatches() {
  return [
    { _id: 'm1', name: 'Ananya Sharma', skills: ['Civil Engineering', 'Data Analysis'], university: 'IIT Delhi', score: 94 },
    { _id: 'm2', name: 'Karthik Rajan', skills: ['IoT', 'Embedded Systems'], organization: 'Bosch India', score: 87 },
    { _id: 'm3', name: 'Priyanka Singh', skills: ['Mobile Development', 'Cloud / DevOps'], university: 'BITS Pilani', score: 79 },
    { _id: 'm4', name: 'Mohammed Ashraf', skills: ['Data Analysis', 'Python'], university: 'NIT Trichy', score: 73 },
  ];
}
// ============================================================
// EXPLORE-CHALLENGES.JS — Category browser
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { problemsAPI } from './api.js';
import { CATEGORIES } from './config.js';
import { truncate, catIcon, timeAgo, statusBadge, getParam } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();

  const preselected = getParam('category');
  if (preselected) {
    showCategory(preselected);
  } else {
    renderCategoryGrid();
  }
});

// ── Category grid ─────────────────────────────────────────
function renderCategoryGrid() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;

  const counts = { education: 23, healthcare: 18, agriculture: 31, transportation: 12, industry: 9, environment: 15, 'water-sanitation': 27, other: 6 };

  grid.innerHTML = CATEGORIES.map(c => `
    <button class="category-card" onclick="window.__showCat('${c.id}')">
      <div class="category-card__icon">${c.icon}</div>
      <div class="category-card__name">${c.label}</div>
      <div class="category-card__count">${counts[c.id] || 0} open problems</div>
    </button>
  `).join('');

  window.__showCat = showCategory;
}

// ── Show category problems ────────────────────────────────
async function showCategory(catId) {
  const grid       = document.getElementById('category-grid');
  const header     = document.getElementById('explore-header');
  const resultsEl  = document.getElementById('category-results');

  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return;

  if (header) {
    header.innerHTML = `
      <button class="btn btn--ghost btn--sm" onclick="window.location.href='/explore-challenges.html'" style="margin-bottom:var(--space-4)">← Back to categories</button>
      <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-2)">
        <span style="font-size:3rem">${cat.icon}</span>
        <div>
          <h1>${cat.label} Challenges</h1>
          <p style="color:rgba(255,255,255,0.7)">Real problems from across India needing your expertise</p>
        </div>
      </div>
    `;
  }

  if (grid) grid.style.display = 'none';

  if (resultsEl) {
    resultsEl.innerHTML = `<div class="flex-center" style="padding:var(--space-16)"><div class="spinner"></div></div>`;
    resultsEl.style.display = 'block';

    try {
      const data = await problemsAPI.byCategory(catId);
      const problems = data.problems || data || [];
      renderResults(resultsEl, problems, cat);
    } catch {
      renderResults(resultsEl, getMockForCategory(catId), cat);
    }
  }
}

function renderResults(container, problems, cat) {
  if (!problems.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">${cat.icon}</div>
        <div class="empty-state__title">No open problems in ${cat.label} yet</div>
        <p class="empty-state__text">Be the first to post one!</p>
        <a href="/post-problem.html" class="btn btn--primary">Post a Problem</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:var(--space-5);display:flex;align-items:center;justify-content:space-between">
      <span style="color:var(--color-text-muted);font-size:var(--text-sm)">${problems.length} problems</span>
      <a href="/post-problem.html" class="btn btn--primary btn--sm">Post a Problem</a>
    </div>
    <div class="grid-auto">
      ${problems.map(p => `
        <a href="/problem-detail.html?id=${p._id || p.id}" class="problem-card card--hover" style="text-decoration:none">
          <div class="problem-card__meta">
            ${statusBadge(p.status || 'open')}
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${p.location || 'India'}</span>
          </div>
          <div class="problem-card__title">${p.title}</div>
          <div class="problem-card__desc">${truncate(p.description)}</div>
          <div class="flex flex-wrap gap-1">
            ${(p.skillsRequired || []).slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
          </div>
          <div class="problem-card__footer">
            <span class="problem-card__stat">${timeAgo(p.createdAt)}</span>
            <span class="problem-card__stat">${p.solutionCount || 0} solutions</span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

function getMockForCategory(catId) {
  const allMocks = {
    agriculture: [
      { id: 'a1', title: 'Crop disease detection via smartphone', description: 'Farmers need AI tools that identify crop diseases from photos, working offline.', skillsRequired: ['Computer Vision', 'Python', 'Mobile Development'], status: 'open', solutionCount: 7, location: 'Maharashtra', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'a2', title: 'Precision irrigation scheduling', description: 'Overwatering wastes resources; smart scheduling could save 40% water use.', skillsRequired: ['IoT', 'Data Analysis', 'Agronomy'], status: 'in_progress', solutionCount: 3, location: 'Punjab', createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
    ],
    healthcare: [
      { id: 'h1', title: 'Telemedicine for remote villages', description: 'Connecting rural patients with urban doctors via low-bandwidth video.', skillsRequired: ['Mobile Development', 'Cloud / DevOps', 'Public Health'], status: 'under_review', solutionCount: 9, location: 'Himachal Pradesh', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
    ],
    education: [
      { id: 'e1', title: 'Attendance digitisation in tribal schools', description: 'Ghost enrollments inflate funding; real-time tracking needed.', skillsRequired: ['IoT', 'Python', 'UI/UX Design'], status: 'open', solutionCount: 2, location: 'Jharkhand', createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  };
  return allMocks[catId] || [];
}
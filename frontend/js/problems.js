// ============================================================
// PROBLEMS.JS — Problem feed: search, filter, sort, render
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { problemsAPI } from './api.js';
import { debounce, truncate, catIcon, timeAgo, statusBadge, initials, renderPagination } from './utils.js';
import { CATEGORIES } from './config.js';

let currentFilters = { search: '', category: '', sort: 'newest', page: 1 };

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
  renderCategoryChips();
  bindFilters();
  fetchProblems();
});

// ── Category chips ────────────────────────────────────────
function renderCategoryChips() {
  const strip = document.getElementById('cat-strip');
  if (!strip) return;

  strip.innerHTML = `<button class="cat-chip active" data-cat="">All</button>` +
    CATEGORIES.map(c => `<button class="cat-chip" data-cat="${c.id}"><span class="cat-chip__icon">${c.icon}</span>${c.label}</button>`).join('');

  strip.addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    strip.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilters.category = chip.dataset.cat;
    currentFilters.page = 1;
    fetchProblems();
  });
}

// ── Bind search, sort, sidebar filters ───────────────────
function bindFilters() {
  const searchInput = document.getElementById('search-input');
  const sortSelect  = document.getElementById('sort-select');

  searchInput?.addEventListener('input', debounce((e) => {
    currentFilters.search = e.target.value.trim();
    currentFilters.page = 1;
    fetchProblems();
  }, 400));

  sortSelect?.addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    currentFilters.page = 1;
    fetchProblems();
  });

  // Sidebar category checkboxes
  document.querySelectorAll('[data-filter-cat]').forEach(cb => {
    cb.addEventListener('change', () => {
      currentFilters.category = cb.dataset.filterCat;
      currentFilters.page = 1;
      fetchProblems();
    });
  });
}

// ── Fetch & render ─────────────────────────────────────── 
async function fetchProblems() {
  const grid    = document.getElementById('problems-grid');
  const count   = document.getElementById('results-count');
  const pagEl   = document.getElementById('pagination');
  if (!grid) return;

  grid.innerHTML = `<div class="flex-center" style="padding:var(--space-16)"><div class="spinner"></div></div>`;

  try {
    const data = await problemsAPI.list({
      search:   currentFilters.search,
      category: currentFilters.category,
      sort:     currentFilters.sort,
      page:     currentFilters.page,
    });

    const problems = data.problems || data || [];
    const total    = data.total || problems.length;
    const pages    = data.totalPages || 1;

    if (count) count.textContent = `${total} problem${total !== 1 ? 's' : ''} found`;

    if (!problems.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__title">No problems found</div>
          <p class="empty-state__text">Try adjusting your filters or search terms.</p>
        </div>`;
      return;
    }

    grid.innerHTML = problems.map(p => renderCard(p)).join('');

    if (pagEl) {
      renderPagination(pagEl, {
        page: currentFilters.page,
        totalPages: pages,
        onPage: (p) => { currentFilters.page = p; fetchProblems(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      });
    }
  } catch {
    // Fallback to mock data
    const mocks = getMockProblems();
    if (count) count.textContent = `${mocks.length} problems found`;
    grid.innerHTML = mocks.map(p => renderCard(p)).join('');
  }
}

function renderCard(p) {
  return `
    <a href="/problem-detail.html?id=${p._id || p.id}" class="problem-card card--hover" style="text-decoration:none">
      <div class="problem-card__meta">
        <span class="badge badge--teal">${catIcon(p.category)} ${p.category}</span>
        ${statusBadge(p.status || 'open')}
      </div>
      <div class="problem-card__title">${p.title}</div>
      <div class="problem-card__desc">${truncate(p.description)}</div>
      <div class="flex flex-wrap gap-1">
        ${(p.skillsRequired || []).slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
      <div class="problem-card__footer">
        <div class="flex gap-2" style="align-items:center">
          <div class="avatar avatar--sm" style="background:var(--color-teal-light);color:var(--color-teal-mid)">${initials(p.postedByName || 'User')}</div>
          <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${p.location || 'India'}</span>
        </div>
        <div class="problem-card__stats">
          <span class="problem-card__stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ${p.solutionCount || 0}
          </span>
          <span class="problem-card__stat">${timeAgo(p.createdAt)}</span>
        </div>
      </div>
    </a>
  `;
}

function getMockProblems() {
  return [
    { id: '1', title: 'Lack of clean drinking water in rural Rajasthan', category: 'Water & Sanitation', description: 'Hundreds of villages rely on contaminated water sources. Seasonal drought worsens the crisis.', skillsRequired: ['Civil Engineering', 'IoT', 'Data Analysis'], status: 'open', solutionCount: 4, location: 'Rajasthan', postedByName: 'Ramesh Kumar', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '2', title: 'Crop disease detection using mobile cameras', category: 'Agriculture', description: 'Farmers need early disease detection tools that work without connectivity.', skillsRequired: ['Machine Learning', 'Computer Vision', 'Mobile Development'], status: 'in_progress', solutionCount: 7, location: 'Maharashtra', postedByName: 'Sunita Devi', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '3', title: 'Digitising school attendance in tribal areas', category: 'Education', description: 'Tribal schools struggle with accurate attendance tracking and midday meal logistics.', skillsRequired: ['IoT', 'Python', 'UI/UX Design'], status: 'open', solutionCount: 2, location: 'Jharkhand', postedByName: 'Arjun Singh', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '4', title: 'Real-time air quality monitoring in industrial zones', category: 'Environment', description: 'Workers near industrial estates have no access to real-time pollution data.', skillsRequired: ['IoT', 'Embedded Systems', 'Data Analysis'], status: 'open', solutionCount: 3, location: 'Gujarat', postedByName: 'Priya Nair', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: '5', title: 'Telemedicine access for remote hill communities', category: 'Healthcare', description: 'Villages at high altitude have no healthcare within 50km. Telemedicine could save lives.', skillsRequired: ['Mobile Development', 'Cloud / DevOps', 'Public Health'], status: 'under_review', solutionCount: 9, location: 'Himachal Pradesh', postedByName: 'Dr. Meena', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
    { id: '6', title: 'Smart bus tracking for tier-2 city commuters', category: 'Transportation', description: 'Bus arrival times are unpredictable, forcing people to wait hours at stops.', skillsRequired: ['IoT', 'React', 'Node.js'], status: 'open', solutionCount: 5, location: 'Nagpur', postedByName: 'Vikram Joshi', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];
}
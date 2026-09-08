// ============================================================
// HOME.JS — Landing page animations, stats counter
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { problemsAPI } from './api.js';
import { CATEGORIES, truncate, catIcon, timeAgo, statusBadge } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar();
  renderFooter();
  animateCounters();
  await loadRecentProblems();
  initHeroTyping();
});

// ── Animated counters ─────────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el      = entry.target;
      const target  = +el.dataset.counter;
      const suffix  = el.dataset.suffix || '';
      const duration = 1500;
      const step    = target / (duration / 16);
      let current   = 0;

      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current).toLocaleString('en-IN') + suffix;
        if (current >= target) clearInterval(timer);
      }, 16);

      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
}

// ── Load recent problems ──────────────────────────────────
async function loadRecentProblems() {
  const container = document.getElementById('recent-problems');
  if (!container) return;

  try {
    const data = await problemsAPI.list({ limit: 3, sort: 'newest' });
    const problems = data.problems || data || [];

    if (!problems.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📭</div><p class="empty-state__text">No problems posted yet. Be the first!</p></div>`;
      return;
    }

    container.innerHTML = problems.map(p => renderProblemCard(p)).join('');
  } catch {
    // Show mock cards for demo
    container.innerHTML = mockProblems().map(p => renderProblemCard(p)).join('');
  }
}

function renderProblemCard(p) {
  return `
    <a href="/problem-detail.html?id=${p._id || p.id}" class="problem-card card--hover" style="text-decoration:none">
      <div class="problem-card__meta">
        <span class="badge badge--teal">${catIcon(p.category)} ${p.category}</span>
        ${statusBadge(p.status || 'open')}
      </div>
      <div class="problem-card__title">${p.title}</div>
      <div class="problem-card__desc">${truncate(p.description)}</div>
      <div class="problem-card__footer">
        <div class="flex gap-2 flex-wrap">
          ${(p.skillsRequired || []).slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
        <div class="problem-card__stats">
          <span class="problem-card__stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${p.solutionCount || 0} solutions
          </span>
          <span class="problem-card__stat">${timeAgo(p.createdAt)}</span>
        </div>
      </div>
    </a>
  `;
}

function mockProblems() {
  return [
    { id: '1', title: 'Lack of clean drinking water in rural Rajasthan', category: 'Water & Sanitation', description: 'Hundreds of villages rely on contaminated water sources. Seasonal drought worsens the crisis, leading to preventable health issues.', skillsRequired: ['Civil Engineering', 'IoT', 'Data Analysis'], status: 'open', solutionCount: 4, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '2', title: 'Crop disease detection using mobile cameras', category: 'Agriculture', description: 'Farmers lack access to agronomists. Early detection of blight or pest damage could save entire harvests.', skillsRequired: ['Machine Learning', 'Computer Vision', 'Mobile Development'], status: 'in_progress', solutionCount: 7, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '3', title: 'Digitising school attendance in tribal areas', category: 'Education', description: 'Tribal schools struggle with accurate attendance tracking, leading to ghost enrollments and misallocated mid-day meal funds.', skillsRequired: ['IoT', 'Python', 'UI/UX Design'], status: 'open', solutionCount: 2, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ];
}

// ── Typing effect in hero ─────────────────────────────────
function initHeroTyping() {
  const el = document.getElementById('hero-typing');
  if (!el) return;

  const words = ['citizens', 'students', 'engineers', 'innovators'];
  let wi = 0, ci = 0, deleting = false;

  function tick() {
    const word = words[wi];
    if (!deleting) {
      el.textContent = word.slice(0, ci + 1);
      ci++;
      if (ci === word.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = word.slice(0, ci - 1);
      ci--;
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(tick, deleting ? 60 : 100);
  }

  tick();
}
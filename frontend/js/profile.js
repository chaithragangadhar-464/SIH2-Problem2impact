// ============================================================
// PROFILE.JS
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { usersAPI } from './api.js';
import { getCurrentUser, requireAuth } from './auth.js';
import { showToast, initials, formatDate, getParam } from './utils.js';
import { SKILLS } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  renderNavbar();
  renderFooter();

  const uid  = getParam('id') || getCurrentUser()?._id;
  const user = await loadUser(uid);
  if (user) renderProfile(user);
  bindSkillEditor(user);
});

async function loadUser(id) {
  try { return await usersAPI.get(id); }
  catch { return getMockUser(); }
}

function renderProfile(u) {
  document.title = `${u.name} — Problem2Impact`;

  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) {
    avatarEl.textContent = initials(u.name);
    avatarEl.style.width  = '80px';
    avatarEl.style.height = '80px';
    avatarEl.style.fontSize = 'var(--text-xl)';
  }

  setText('profile-name', u.name);
  setText('profile-role', formatRole(u.role));
  setText('profile-location', u.location || 'India');
  setText('profile-org', u.university || u.organization || '');
  setText('stat-problems', u.problemsPosted || 0);
  setText('stat-solutions', u.solutionsSubmitted || 0);
  setText('stat-teams', u.teamsJoined || 0);

  // Skills
  const skillsWrap = document.getElementById('skills-list');
  if (skillsWrap) {
    skillsWrap.innerHTML = (u.skills || []).map(s => `<span class="skill-tag selected">${s}</span>`).join('') ||
      '<em style="color:var(--color-text-muted)">No skills added yet.</em>';
  }

  // Available badge
  const avail = document.getElementById('available-badge');
  if (avail && u.availableToSolve) {
    avail.innerHTML = `<span class="badge badge--success"><span class="badge__dot"></span>Available to solve</span>`;
  }

  // Problems posted
  const problemsList = document.getElementById('problems-posted-list');
  if (problemsList) {
    const problems = u.problemsPostedData || getMockPostedProblems();
    problemsList.innerHTML = problems.map(p => `
      <a href="/problem-detail.html?id=${p.id}" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4);background:var(--color-off-white);border-radius:var(--radius-md);margin-bottom:var(--space-3);text-decoration:none;color:inherit">
        <div>
          <div style="font-weight:600;font-size:var(--text-sm)">${p.title}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${formatDate(p.createdAt)}</div>
        </div>
        <span class="badge badge--teal">${p.solutionCount} solutions</span>
      </a>
    `).join('') || '<p style="color:var(--color-text-muted)">No problems posted yet.</p>';
  }
}

function formatRole(role) {
  const map = { citizen: 'Citizen', student: 'Student', faculty: 'Faculty Member', employee: 'Employee', government: 'Government Official', ngo: 'NGO Representative', industry: 'Industry Partner' };
  return map[role] || role;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function bindSkillEditor(user) {
  const editBtn = document.getElementById('edit-skills-btn');
  if (!editBtn) return;

  editBtn.addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">Edit Skills</h3>
          <button class="modal__close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal__body">
          <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4)">Select all skills that apply to you.</p>
          <div class="flex flex-wrap gap-2" id="skill-picker">
            ${SKILLS.map(s => `<button type="button" class="skill-tag ${(user?.skills || []).includes(s) ? 'selected' : ''}" data-s="${s}" onclick="this.classList.toggle('selected')">${s}</button>`).join('')}
          </div>
          <div style="margin-top:var(--space-6);display:flex;gap:var(--space-3)">
            <button class="btn btn--primary" onclick="saveSkills('${user?._id}')">Save Skills</button>
            <button class="btn btn--ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  });
}

window.saveSkills = async (uid) => {
  const selected = [...document.querySelectorAll('#skill-picker .skill-tag.selected')].map(b => b.dataset.s);
  try {
    await usersAPI.updateSkills(uid, { skills: selected });
    showToast('Skills updated!', 'success');
    document.querySelector('.modal-overlay')?.remove();
    location.reload();
  } catch (err) {
    showToast(err.message || 'Failed to update skills.', 'error');
  }
};

function getMockUser() {
  return { _id: 'u1', name: 'Ananya Sharma', role: 'student', location: 'New Delhi', university: 'IIT Delhi', skills: ['Python', 'Machine Learning', 'Data Analysis', 'React'], availableToSolve: true, problemsPosted: 3, solutionsSubmitted: 5, teamsJoined: 2 };
}

function getMockPostedProblems() {
  return [
    { id: '1', title: 'Real-time air quality monitoring in industrial zones', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), solutionCount: 3 },
    { id: '2', title: 'Digitising school attendance in tribal areas', createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), solutionCount: 2 },
  ];
}
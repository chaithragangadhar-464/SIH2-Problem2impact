// ============================================================
// TEAM.JS — Team workspace: members, tasks, skill gap, invite
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { teamsAPI, matchAPI } from './api.js';
import { showToast, getParam, initials, setLoading } from './utils.js';
import { requireAuth, getCurrentUser } from './auth.js';

let teamData = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  renderNavbar();
  renderFooter();

  const id = getParam('id');
  if (!id) { window.location.href = '/problems.html'; return; }

  teamData = await loadTeam(id);
  renderTeam(teamData);
  renderSkillGap(teamData);
  renderAIMatches(teamData);
  bindTaskBoard();
  bindInvite(id);
});

async function loadTeam(id) {
  try { return await teamsAPI.get(id); }
  catch { return getMockTeam(id); }
}

function renderTeam(team) {
  document.title = `${team.name} — Problem2Impact`;
  setText('team-name', team.name);
  setText('team-problem-title', team.problemTitle || 'Problem');

  const link = document.getElementById('team-problem-link');
  if (link) link.href = `/problem-detail.html?id=${team.problemId}`;

  const membersEl = document.getElementById('members-list');
  if (!membersEl) return;

  membersEl.innerHTML = (team.members || []).map(m => `
    <div class="member-card">
      <div class="avatar avatar--lg" style="background:var(--color-teal-light);color:var(--color-teal-mid)">${initials(m.name)}</div>
      <div class="member-card__info">
        <div class="member-card__name">${m.name} ${m.role === 'lead' ? '<span class="badge badge--saffron" style="margin-left:4px">Lead</span>' : ''}</div>
        <div class="member-card__role">${m.university || m.organization || 'Contributor'}</div>
        <div class="member-card__skills">
          ${(m.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function renderSkillGap(team) {
  const el = document.getElementById('skill-gap');
  if (!el) return;

  const needed    = team.skillsRequired || [];
  const have      = (team.members || []).flatMap(m => m.skills || []);
  const missing   = needed.filter(s => !have.some(h => h.toLowerCase() === s.toLowerCase()));

  if (!missing.length) {
    el.innerHTML = `<div class="validation-banner validation-banner--valid"><div class="validation-banner__icon">✓</div><div><div class="validation-banner__title">All skills covered</div><div class="validation-banner__text">Your team has all the skills needed to solve this problem.</div></div></div>`;
  } else {
    el.innerHTML = `
      <div class="validation-banner validation-banner--invalid">
        <div class="validation-banner__icon">⚠️</div>
        <div>
          <div class="validation-banner__title">Skill gap detected</div>
          <div class="validation-banner__text" style="margin-bottom:var(--space-3)">Your team is missing expertise in:</div>
          <div class="flex flex-wrap gap-2">
            ${missing.map(s => `<span class="skill-tag" style="border-color:var(--color-error);color:var(--color-error)">${s}</span>`).join('')}
          </div>
        </div>
      </div>`;
  }
}

function renderAIMatches(team) {
  const list = document.getElementById('match-list');
  if (!list) return;

  // Use mock matches related to missing skills
  const mocks = [
    { name: 'Karthik Rajan',   skills: ['IoT', 'Embedded Systems'],            university: 'IIT Madras', score: 91 },
    { name: 'Priyanka Singh',  skills: ['Data Analysis', 'Python'],             university: 'BITS Pilani', score: 84 },
    { name: 'Rohan Mehta',     skills: ['Civil Engineering', 'Data Analysis'],  organization: 'L&T', score: 77 },
  ];

  list.innerHTML = mocks.map(m => `
    <div class="match-item">
      <div class="avatar" style="background:var(--color-saffron-lt);color:#c4720e">${initials(m.name)}</div>
      <div class="match-item__info">
        <div class="match-item__name">${m.name}</div>
        <div class="match-item__meta">${m.skills.join(', ')} · ${m.university || m.organization}</div>
      </div>
      <div class="match-bar"><div class="match-bar__fill" style="width:${m.score}%"></div></div>
      <div class="match-pct">${m.score}%</div>
      <button class="btn btn--secondary btn--sm" onclick="inviteMember('${m.name}')">Invite</button>
    </div>
  `).join('');
}

window.inviteMember = (name) => {
  showToast(`Invitation sent to ${name}!`, 'success');
};

// ── Task board ────────────────────────────────────────────
function bindTaskBoard() {
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    const titleInput = document.getElementById('new-task-input');
    const title = titleInput?.value.trim();
    if (!title) return;

    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.innerHTML = `
      <div class="task-card__title">${title}</div>
      <div class="task-card__footer">
        <span class="badge badge--gray">To Do</span>
        <div class="avatar avatar--sm">${initials(getCurrentUser()?.name || 'U')}</div>
      </div>
    `;

    document.getElementById('col-todo')?.appendChild(card);
    updateColumnCounts();
    if (titleInput) titleInput.value = '';

    makeDraggable(card);
  });

  // Wire existing mock task cards
  document.querySelectorAll('.task-card').forEach(makeDraggable);

  // Drop zones
  document.querySelectorAll('.task-column').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.style.background = 'var(--color-teal-light)'; });
    col.addEventListener('dragleave', () => { col.style.background = ''; });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.style.background = '';
      const dragging = document.querySelector('.task-card.dragging');
      if (dragging) {
        col.querySelector('.task-cards')?.appendChild(dragging);
        dragging.classList.remove('dragging');
        updateColumnCounts();
      }
    });
  });
}

function makeDraggable(card) {
  card.addEventListener('dragstart', () => card.classList.add('dragging'));
  card.addEventListener('dragend',   () => card.classList.remove('dragging'));
}

function updateColumnCounts() {
  document.querySelectorAll('.task-column').forEach(col => {
    const count = col.querySelectorAll('.task-card').length;
    col.querySelector('.task-column__count')?.textContent && (col.querySelector('.task-column__count').textContent = count);
  });
}

// ── Invite modal ──────────────────────────────────────────
function bindInvite(teamId) {
  document.getElementById('invite-btn')?.addEventListener('click', () => {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="invite-modal">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Invite a Collaborator</h3>
            <button class="modal__close" onclick="document.getElementById('invite-modal').remove()">✕</button>
          </div>
          <div class="modal__body">
            <div class="form-group" style="margin-bottom:var(--space-5)">
              <label class="form-label">Email address</label>
              <input id="invite-email" class="input" type="email" placeholder="collaborator@example.com">
            </div>
            <div class="form-group" style="margin-bottom:var(--space-5)">
              <label class="form-label form-label--optional">Message</label>
              <textarea id="invite-msg" class="textarea" placeholder="Tell them why they'd be a great fit for this team..."></textarea>
            </div>
            <div class="flex gap-3">
              <button class="btn btn--primary" onclick="sendInvite('${teamId}')">Send Invitation</button>
              <button class="btn btn--ghost" onclick="document.getElementById('invite-modal').remove()">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `);
  });
}

window.sendInvite = async (teamId) => {
  const email = document.getElementById('invite-email')?.value.trim();
  if (!email) { showToast('Please enter an email address.', 'error'); return; }

  try {
    await teamsAPI.invite(teamId, { email });
    showToast(`Invitation sent to ${email}!`, 'success');
    document.getElementById('invite-modal')?.remove();
  } catch (err) {
    showToast(err.message || 'Failed to send invitation.', 'error');
  }
};

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getMockTeam(id) {
  return {
    _id: id, name: 'AquaTech Collective',
    problemId: '1', problemTitle: 'Lack of clean drinking water in rural Rajasthan',
    skillsRequired: ['Civil Engineering', 'IoT', 'Data Analysis', 'Mobile Development'],
    members: [
      { _id: 'u1', name: 'Ananya Sharma', role: 'lead', university: 'IIT Delhi', skills: ['Civil Engineering', 'Data Analysis'] },
      { _id: 'u2', name: 'Ravi Kumar',    role: 'member', university: 'NIT Trichy',   skills: ['Python', 'Data Analysis'] },
      { _id: 'u3', name: 'Sara Thomas',   role: 'member', organization: 'Bosch India', skills: ['IoT', 'Embedded Systems'] },
    ],
  };
}
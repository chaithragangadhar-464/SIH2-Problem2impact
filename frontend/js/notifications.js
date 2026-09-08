// ============================================================
// NOTIFICATIONS.JS — Notifications feed
// ============================================================

import { renderNavbar, renderFooter } from './navbar.js';
import { requireAuth } from './auth.js';
import { timeAgo } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  renderNavbar();
  renderFooter();
  renderNotifications();
  bindMarkAllRead();
});

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  const notifs = getMockNotifications();
  const unread = notifs.filter(n => !n.read).length;

  setText('unread-count', unread ? `${unread} unread` : 'All caught up');

  list.innerHTML = notifs.map(n => `
    <a href="${n.link || '#'}" class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-item__icon">${n.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="notif-item__text">${n.text}</div>
        <div class="notif-item__time">${timeAgo(n.createdAt)}</div>
      </div>
      ${!n.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--color-teal);flex-shrink:0;margin-top:6px"></div>' : ''}
    </a>
  `).join('');
}

function bindMarkAllRead() {
  document.getElementById('mark-read-btn')?.addEventListener('click', () => {
    document.querySelectorAll('.notif-item.unread').forEach(el => {
      el.classList.remove('unread');
      el.querySelector('[style*="border-radius:50%"]')?.remove();
    });
    setText('unread-count', 'All caught up');
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getMockNotifications() {
  return [
    { id: 'n1', icon: '🤝', text: '<strong>Karthik Rajan</strong> accepted your team invitation for <strong>AquaTech Collective</strong>.', link: '/team.html?id=t1', read: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'n2', icon: '🤖', text: 'AI matched you with <strong>3 new problems</strong> based on your skills in IoT and Data Analysis.', link: '/problems.html', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'n3', icon: '✅', text: 'Your solution for <strong>"Crop disease detection"</strong> passed AI validation and is now under government review.', link: '/problem-detail.html?id=2', read: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'n4', icon: '👥', text: '<strong>Ananya Sharma</strong> invited you to join team <strong>GreenTech Squad</strong> for the Environment challenge.', link: '/team.html?id=t2', read: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'n5', icon: '⚠️', text: 'Your solution for <strong>"Smart bus tracking"</strong> was flagged by AI. Review the feedback and resubmit.', link: '/problem-detail.html?id=6', read: true, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'n6', icon: '🏆', text: 'Congratulations! Team <strong>AquaTech Collective</strong> was awarded ₹1,00,000 for the water purification solution.', link: '/problem-detail.html?id=1', read: true, createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: 'n7', icon: '💬', text: '<strong>Priya Nair</strong> commented on your problem: <strong>"Digitising school attendance"</strong>.', link: '/problem-detail.html?id=3', read: true, createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'n8', icon: '🎓', text: 'Your digital certificate for the <strong>Healthcare Innovation Challenge</strong> is ready to download.', link: '/profile.html', read: true, createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  ];
}
// ============================================================
// NAVBAR.JS — Renders shared navbar and footer into every page
// ============================================================

import { getCurrentUser, isLoggedIn, logout } from './auth.js';
import { initials } from './utils.js';

export function renderNavbar() {
  const user      = getCurrentUser();
  const loggedIn  = isLoggedIn();
  const isGovRole = user && ['government', 'ngo', 'industry'].includes(user.role);

  const navLinks = [
    { href: '/index.html',               label: 'Home' },
    { href: '/problems.html',            label: 'Problems' },
    { href: '/explore-challenges.html',  label: 'Explore Challenges' },
  ];

  if (loggedIn && isGovRole) {
    navLinks.push({ href: '/dashboard-gov.html', label: 'Dashboard' });
  }

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  const linksHTML = navLinks.map(l => {
    const active = currentPath === l.href.replace('/', '') ? 'active' : '';
    return `<a href="${l.href}" class="navbar__link ${active}">${l.label}</a>`;
  }).join('');

  const actionsHTML = loggedIn
    ? `
      <button class="navbar__bell" id="notif-btn" aria-label="Notifications" onclick="window.location.href='/notifications.html'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span class="navbar__badge"></span>
      </button>
      <div class="navbar__user" id="user-menu-trigger">
        <div class="navbar__avatar">${initials(user.name)}</div>
        <span class="navbar__user-name">${user.name.split(' ')[0]}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    `
    : `
      <a href="/login.html" class="btn btn--ghost" style="color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.2)">Log in</a>
      <a href="/register.html" class="btn btn--primary">Sign up</a>
    `;

  const navbarHTML = `
    <nav class="navbar" id="main-navbar">
      <div class="container navbar__inner">
        <a href="/index.html" class="navbar__brand">
          <svg class="navbar__logo" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="34" height="34" rx="8" fill="#00B4A6"/>
            <path d="M8 17C8 12 12 8 17 8s9 4 9 9-4 9-9 9" stroke="#0D1B2A" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="17" cy="17" r="3" fill="#0D1B2A"/>
            <path d="M17 14V8M17 20v6M20 17h6M14 17H8" stroke="#0D1B2A" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
          </svg>
          <span class="navbar__brand-name">Problem<span>2</span>Impact</span>
        </a>

        <div class="navbar__nav">
          ${linksHTML}
        </div>

        <div class="navbar__actions">
          ${actionsHTML}
          <button class="navbar__hamburger" id="hamburger-btn" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <div class="navbar__mobile" id="mobile-nav">
        ${navLinks.map(l => `<a href="${l.href}" class="navbar__link">${l.label}</a>`).join('')}
        ${loggedIn
          ? `<a href="/profile.html" class="navbar__link">My Profile</a>
             <button class="navbar__link" onclick="window.__p2iLogout()" style="text-align:left;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.6);">Log out</button>`
          : `<a href="/login.html" class="navbar__link">Log in</a>
             <a href="/register.html" class="navbar__link" style="color:var(--color-teal)">Sign up</a>`
        }
      </div>
    </nav>
  `;

  // User dropdown
  const dropdownHTML = loggedIn ? `
    <div id="user-dropdown" style="
      display:none;position:fixed;z-index:1500;
      background:var(--color-white);border:1px solid var(--color-border);
      border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
      padding:var(--space-2);min-width:200px;
    ">
      <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border);margin-bottom:var(--space-2);">
        <div style="font-weight:600;font-size:var(--text-sm)">${user.name}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${user.email}</div>
      </div>
      <a href="/profile.html" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-text);transition:background 0.15s" onmouseover="this.style.background='var(--color-off-white)'" onmouseout="this.style.background='transparent'">👤 My Profile</a>
      ${isGovRole ? `<a href="/dashboard-gov.html" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-text);transition:background 0.15s" onmouseover="this.style.background='var(--color-off-white)'" onmouseout="this.style.background='transparent'">📊 Dashboard</a>` : ''}
      <a href="/notifications.html" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-text);transition:background 0.15s" onmouseover="this.style.background='var(--color-off-white)'" onmouseout="this.style.background='transparent'">🔔 Notifications</a>
      <hr style="border:none;border-top:1px solid var(--color-border);margin:var(--space-2) 0">
      <button onclick="window.__p2iLogout()" style="width:100%;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-error);background:none;border:none;cursor:pointer;transition:background 0.15s;font-family:inherit;text-align:left" onmouseover="this.style.background='#FDEAED'" onmouseout="this.style.background='transparent'">↩ Log out</button>
    </div>
  ` : '';

  // Inject navbar
  const placeholder = document.getElementById('navbar-placeholder');
  if (placeholder) {
    placeholder.outerHTML = navbarHTML;
  } else {
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
  }

  if (dropdownHTML) document.body.insertAdjacentHTML('beforeend', dropdownHTML);

  // Wire up hamburger
  document.getElementById('hamburger-btn')?.addEventListener('click', () => {
    const mob = document.getElementById('mobile-nav');
    mob?.classList.toggle('open');
  });

  // Wire up user dropdown
  const trigger   = document.getElementById('user-menu-trigger');
  const dropdown  = document.getElementById('user-dropdown');

  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = trigger.getBoundingClientRect();
      const open = dropdown.style.display === 'block';
      dropdown.style.display = open ? 'none' : 'block';
      if (!open) {
        dropdown.style.top  = `${rect.bottom + 8}px`;
        dropdown.style.right = `${window.innerWidth - rect.right}px`;
      }
    });

    document.addEventListener('click', () => { dropdown.style.display = 'none'; });
  }

  window.__p2iLogout = logout;
}

// ── Footer renderer ───────────────────────────────────────
export function renderFooter() {
  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div>
            <div class="footer__brand-name">Problem<span>2</span>Impact</div>
            <p class="footer__tagline">A platform where citizens, students, and innovators solve India's real-world challenges — backed by government and industry.</p>
          </div>
          <div>
            <div class="footer__col-title">Platform</div>
            <div class="footer__links">
              <a href="/problems.html" class="footer__link">Browse Problems</a>
              <a href="/explore-challenges.html" class="footer__link">Explore Challenges</a>
              <a href="/post-problem.html" class="footer__link">Post a Problem</a>
            </div>
          </div>
          <div>
            <div class="footer__col-title">Account</div>
            <div class="footer__links">
              <a href="/register.html" class="footer__link">Sign up</a>
              <a href="/login.html" class="footer__link">Log in</a>
              <a href="/profile.html" class="footer__link">My Profile</a>
            </div>
          </div>
          <div>
            <div class="footer__col-title">About</div>
            <div class="footer__links">
              <a href="#" class="footer__link">Smart India Hackathon</a>
              <a href="#" class="footer__link">SIH26043</a>
              <a href="#" class="footer__link">How it works</a>
            </div>
          </div>
        </div>
        <div class="footer__bottom">
          <span>© 2026 Problem2Impact — SIH26043</span>
          <span>Built for Smart India Hackathon</span>
        </div>
      </div>
    </footer>
  `;

  const placeholder = document.getElementById('footer-placeholder');
  if (placeholder) {
    placeholder.outerHTML = footerHTML;
  } else {
    document.querySelector('.page-wrapper')?.insertAdjacentHTML('beforeend', footerHTML);
  }
}
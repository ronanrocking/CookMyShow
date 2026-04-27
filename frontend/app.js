/* ============================================
   COOKMYSHOW — app.js (Shared Utilities)
   ============================================ */

const API = 'http://localhost:8000';

// ============ TOKEN HELPERS ============
const Auth = {
  getToken: () => localStorage.getItem('cms_token'),
  setToken: (t) => localStorage.setItem('cms_token', t),
  getRole: () => parseInt(localStorage.getItem('cms_role') || '0'),
  setRole: (r) => localStorage.setItem('cms_role', String(r)),
  clear: () => { localStorage.removeItem('cms_token'); localStorage.removeItem('cms_role'); },
  isLoggedIn: () => !!localStorage.getItem('cms_token'),
  isOrganizer: () => parseInt(localStorage.getItem('cms_role') || '0') === 3,
};

// ============ API HELPERS ============
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = API + path;

  try {
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      Auth.clear();
      showToast('Session expired. Please log in.', 'error');
      setTimeout(() => window.location.href = 'login.html', 1500);
      throw new Error('Unauthorized');
    }

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      const msg = (data && data.detail) || `Error ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    if (err.message !== 'Unauthorized') throw err;
  }
}

const api = {
  get:    (path) => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: 'PUT',  body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

// ============ TOAST ============
function ensureToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = 'info', duration = 3500) {
  const container = ensureToastContainer();
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:1.1rem">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ============ MODAL HELPERS ============
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function showConfirmModal(title, body, onConfirm) {
  let overlay = document.getElementById('_confirm_modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '_confirm_modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;text-align:center">
        <div class="modal-error-icon">⚠️</div>
        <h2 class="modal-title" id="_cm_title" style="font-size:1.4rem;margin-bottom:12px"></h2>
        <p id="_cm_body" style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:28px"></p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-secondary btn-sm" id="_cm_cancel">Cancel</button>
          <button class="btn btn-danger btn-sm" id="_cm_confirm">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('_cm_cancel').onclick = () => closeModal('_confirm_modal');
  }
  document.getElementById('_cm_title').textContent = title;
  document.getElementById('_cm_body').textContent = body;
  document.getElementById('_cm_confirm').onclick = () => { closeModal('_confirm_modal'); onConfirm(); };
  openModal('_confirm_modal');
}

function showInfoModal(title, body) {
  let overlay = document.getElementById('_info_modal');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '_info_modal';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;text-align:center">
        <div class="modal-info-icon">📊</div>
        <h2 class="modal-title" id="_im_title" style="font-size:1.4rem;margin-bottom:12px"></h2>
        <p id="_im_body" style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:28px"></p>
        <button class="btn btn-secondary btn-sm" id="_im_close">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('_im_close').onclick = () => closeModal('_info_modal');
  }

  document.getElementById('_im_title').textContent = title;
  document.getElementById('_im_body').textContent = body;

  openModal('_info_modal');
}

// ============ NAVBAR RENDER ============
function renderNav(activePage) {
  const isLoggedIn = Auth.isLoggedIn();
  const isOrg = Auth.isOrganizer();

  const navEl = document.getElementById('main-nav');
  if (!navEl) return;

  navEl.innerHTML = `
    <a class="nav-logo" href="index.html">COOK<span>MY</span>SHOW</a>

    <div class="nav-search" id="nav-search-wrap">
      <span class="nav-search-icon">🔍</span>
      <input type="text" id="nav-search-input" placeholder="Search events, artists, venues…" autocomplete="off">
    </div>

    <nav class="nav-links">
      ${!isOrg ? `<a class="nav-link ${activePage==='index'?'active':''}" href="index.html">Events</a>` : ''}
      ${isLoggedIn && !isOrg ? `
        <a class="nav-link ${activePage==='bookings'?'active':''}" href="my-bookings.html">My Tickets</a>
      ` : ''}
      ${isLoggedIn && isOrg ? `
        <a class="nav-link ${activePage==='organizer'?'active':''}" href="organizer-dashboard.html">Dashboard</a>
      ` : ''}
      ${isLoggedIn ? `
        <div class="nav-dropdown">
          <div class="nav-avatar" id="nav-avatar-btn">U</div>
          <div class="nav-dropdown-menu" id="nav-dd">
            <a class="dropdown-item" href="profile.html">👤 Profile</a>
            ${isOrg ? '<a class="dropdown-item" href="organizer-dashboard.html">📊 Dashboard</a>' : ''}
            <button class="dropdown-item danger" id="nav-logout-btn">🚪 Sign Out</button>
          </div>
        </div>
      ` : `
        <a class="btn-nav" href="login.html">Sign In</a>
      `}
    </nav>`;

  // Avatar initials
  if (isLoggedIn) {
    api.get('/users/me').then(u => {
      if (u && u.name) {
        const av = document.getElementById('nav-avatar-btn');
        if (av) av.textContent = u.name[0].toUpperCase();
      }
    }).catch(() => {});
  }

  // Logout
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      Auth.clear();
      window.location.href = 'index.html';
    };
  }

  // Dropdown toggle
  const avatarBtn = document.getElementById('nav-avatar-btn');
  const dd = document.getElementById('nav-dd');
  if (avatarBtn && dd) {
    avatarBtn.onclick = (e) => {
      e.stopPropagation();
      dd.classList.toggle('open');
    };
    document.addEventListener('click', () => dd && dd.classList.remove('open'));
  }

  // Search
  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) window.location.href = `index.html?q=${encodeURIComponent(q)}`;
      }
    });
  }
}

// ============ TICKER ============
function renderTicker(items) {
  const t = document.getElementById('ticker-strip');
  if (!t) return;
  const doubled = [...items, ...items];
  t.innerHTML = `<div class="ticker-inner">${doubled.map(i => `<span>★ ${i}</span>`).join('')}</div>`;
}

// ============ FORMAT HELPERS ============
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function formatTime(t) {
  if (!t) return '—';

  try {
    const d = new Date(t);
    if (isNaN(d)) return '—';

    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

function formatCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n);
}

function getAvailabilityClass(remaining, capacity) {
  if (remaining <= 0) return { cls: 'avail-none', label: 'Sold Out' };
  const pct = remaining / (capacity || remaining);
  if (pct > 0.5) return { cls: 'avail-high', label: `${remaining} left` };
  if (pct > 0.2) return { cls: 'avail-medium', label: `Few left — ${remaining}` };
  return { cls: 'avail-low', label: `Hurry! Only ${remaining} left` };
}

function categoryEmoji(type) {
  const map = {
    MUSIC: '🎵', COMEDY: '😂', THEATRE: '🎭',
    SPORT: '⚽', CONFERENCE: '🎤', FESTIVAL: '🎉',
    MOVIE: '🎬', WORKSHOP: '🛠️', ART: '🎨',
  };
  return map[(type || '').toUpperCase()] || '🎪';
}

function eventPlaceholder(type) {
  const colors = { MUSIC:'#1a1a2e', COMEDY:'#1a2e1a', THEATRE:'#2e1a1a', SPORT:'#1a201e', DEFAULT:'#1a1a2e' };
  const bg = colors[(type||'').toUpperCase()] || colors.DEFAULT;
  return `<div class="placeholder-img" style="background:linear-gradient(135deg,${bg},#0a0a0f)">${categoryEmoji(type)}</div>`;
}

// ============ WISHLIST TOGGLE ============
async function toggleWishlist(eventId, btn) {
  if (!Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  try {
    await api.post(`/events/${eventId}/wishlist`, {});
    btn.classList.toggle('active');
    showToast('Added to wishlist!', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ============ RENDER EVENT CARD ============
function renderEventCard(event, opts = {}) {
  const card = document.createElement('div');
  card.className = 'event-card';

  card.innerHTML = `
    <div class="event-card-image">
      ${event.image_url
        ? `<img src="${event.image_url}" alt="${event.title}" loading="lazy">`
        : eventPlaceholder(event.event_type)}
      <span class="event-card-badge">${event.event_type || 'EVENT'}</span>
      ${opts.showWishlist !== false ? `<button class="wishlist-btn" data-event-id="${event.event_id}" title="Add to Wishlist">♡</button>` : ''}
    </div>
    <div class="event-card-body">
      <div class="event-card-title">${event.title}</div>
      <div class="event-card-meta">
        ${event.language ? `<span>🌐 ${event.language}</span>` : ''}
        ${event.duration ? `<span>⏱ ${event.duration} min</span>` : ''}
      </div>
      <div class="event-card-price">
        <div>
          <div class="price-label">Starting from</div>
          <div class="price-value">${event.min_price ? formatCurrency(event.min_price) : (event.earliest_show ? formatDate(event.earliest_show) : 'TBA')}</div>
        </div>
      </div>
    </div>`;

  card.querySelector('.event-card-image, .event-card-body .event-card-title')
    ?.addEventListener('click', (e) => {
      if (e.target.classList.contains('wishlist-btn')) return;
      window.location.href = `event.html?id=${event.event_id}`;
    });

  const wb = card.querySelector('.wishlist-btn');
  if (wb) wb.addEventListener('click', (e) => { e.stopPropagation(); toggleWishlist(event.event_id, wb); });

  // Make whole card clickable except wishlist
  card.addEventListener('click', (e) => {
    if (e.target.closest('.wishlist-btn')) return;
    window.location.href = `event.html?id=${event.event_id}`;
  });

  return card;
}
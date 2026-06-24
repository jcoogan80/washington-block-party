import { loginUser, registerUser, logoutUser, getUserDoc, watchAuthState, resetPassword } from './auth.js';
import { db } from './firebase-config.js';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { init as initAnnouncements } from './announcements.js';
import { init as initDirectory }     from './directory.js';
import { init as initSchedule }      from './schedule.js';
import { init as initActivities }    from './activities.js';
import { init as initChat }          from './chat.js';
import { init as initHistory }       from './history.js';
import { init as initTrivia }        from './trivia.js';
import { init as initBudget }        from './budget.js';

// ── Shared State ─────────────────────────────────────────────────────────────
// Passed by reference to every module so all see current values.
export const appState = {
  user:    null,   // Firebase Auth user
  userDoc: null,   // Firestore users/{uid}
  isAdmin: false
};

const initializedTabs = new Set();

const moduleMap = {
  announcements: initAnnouncements,
  directory:     initDirectory,
  schedule:      initSchedule,
  activities:    initActivities,
  trivia:        initTrivia,
  budget:        initBudget,
  chat:          initChat,
  history:       initHistory
};

// ── Utility Functions (exported so modules can import them) ──────────────────

export function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function formatTimestamp(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)  return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function showConfirm(title, message) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent   = title;
    document.getElementById('confirm-message').textContent = message;
    modal.hidden = false;

    const cleanup = (result) => {
      modal.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);

    const okBtn     = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

const utils = { getInitials, formatTimestamp, formatFullDate, showToast, showConfirm };

// ── Screen Helpers ────────────────────────────────────────────────────────────

function showScreen(id) {
  ['auth-screen', 'pending-screen', 'app'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.hidden = (s !== id);
  });
}

// ── Auth State Listener ───────────────────────────────────────────────────────

watchAuthState(async (user) => {
  if (!user) {
    appState.user    = null;
    appState.userDoc = null;
    appState.isAdmin = false;
    showScreen('auth-screen');
    return;
  }

  appState.user = user;

  let userDoc;
  try {
    userDoc = await getUserDoc(user.uid);
  } catch (err) {
    // Firestore read failed (e.g. rules not yet propagated, token issue).
    // Show auth screen and let the user try again rather than crashing silently.
    showScreen('auth-screen');
    showToast('Could not load account data. Please sign in again.', 'error');
    await logoutUser();
    return;
  }

  if (!userDoc) {
    // Edge case: Firebase Auth account exists but Firestore doc missing
    showScreen('auth-screen');
    showToast('Account data missing — please register again.', 'error');
    await logoutUser();
    return;
  }

  appState.userDoc = userDoc;
  appState.isAdmin = userDoc.role === 'admin';

  if (!userDoc.approved) {
    document.getElementById('pending-name').textContent = userDoc.displayName || user.email;
    showScreen('pending-screen');
    return;
  }

  // Approved — show the app
  document.getElementById('header-user-name').textContent = userDoc.displayName || user.email;
  const adminBtn = document.getElementById('admin-panel-btn');
  adminBtn.hidden = !appState.isAdmin;
  showScreen('app');
  activateTab('announcements');
});

// ── Login Form ────────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = e.target.querySelector('[type=submit]');

  errEl.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    await loginUser(email, password);
  } catch (err) {
    errEl.textContent = friendlyAuthError(err.code);
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ── Register Form ─────────────────────────────────────────────────────────────

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  const btn      = e.target.querySelector('[type=submit]');

  if (!name) { errEl.textContent = 'Please enter your full name.'; errEl.hidden = false; return; }

  errEl.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    await registerUser(email, password, name);
    // onAuthStateChanged will fire and show pending screen
  } catch (err) {
    errEl.textContent = friendlyAuthError(err.code);
    errEl.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

// ── Auth form toggle ──────────────────────────────────────────────────────────
function showAuthForm(id) {
  ['login-form', 'register-form', 'forgot-form'].forEach(f => {
    document.getElementById(f).hidden = (f !== id);
  });
}

document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('register-form');
});
document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('login-form');
});
document.getElementById('show-forgot').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgot-error').hidden   = true;
  document.getElementById('forgot-success').hidden = true;
  document.getElementById('forgot-email').value    = '';
  showAuthForm('forgot-form');
});
document.getElementById('show-login-from-forgot').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthForm('login-form');
});

// ── Forgot Password Form ──────────────────────────────────────────────────────
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email     = document.getElementById('forgot-email').value.trim();
  const errorEl   = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  errorEl.hidden   = true;
  successEl.hidden = true;
  try {
    await resetPassword(email);
    successEl.hidden = false;
    document.getElementById('forgot-email').value = '';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', async () => {
  await logoutUser();
  initializedTabs.clear();
});
document.getElementById('pending-logout-btn').addEventListener('click', async () => {
  await logoutUser();
});

// ── Tab Routing ───────────────────────────────────────────────────────────────

export function activateTab(name) {
  // Update nav buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const active = panel.id === `tab-${name}`;
    panel.classList.toggle('active', active);
  });
  // Lazy-init module
  if (!initializedTabs.has(name) && moduleMap[name]) {
    const container = document.getElementById(`tab-${name}`);
    moduleMap[name](container, appState, utils);
    initializedTabs.add(name);
  }
}

document.getElementById('tab-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn || !appState.user || !appState.userDoc?.approved) return;
  activateTab(btn.dataset.tab);
});

// ── Admin Panel ───────────────────────────────────────────────────────────────

document.getElementById('admin-panel-btn').addEventListener('click', () => {
  openAdminPanel();
});

// Close modals via overlay or ✕ button
document.addEventListener('click', (e) => {
  const target = e.target.dataset.closeModal;
  if (target) {
    const modal = document.getElementById(target);
    if (modal) modal.hidden = true;
  }
});

async function openAdminPanel() {
  const modal = document.getElementById('admin-modal');
  const body  = document.getElementById('admin-modal-body');
  modal.hidden = false;
  body.innerHTML = '<div class="loading"><div class="spinner"></div> Loading…</div>';

  try {
    const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'asc')));
    const users = usersSnap.docs.map(d => d.data());
    renderAdminPanel(body, users);
  } catch (err) {
    body.innerHTML = `<p class="text-danger">Error loading users: ${err.message}</p>`;
  }
}

const POLL_DATES = [
  'Saturday, August 15, 2026',
  'Saturday, August 22, 2026',
  'Saturday, August 29, 2026',
  'Saturday, September 5, 2026',
  'Saturday, September 12, 2026',
  'Saturday, September 19, 2026',
  'Saturday, September 26, 2026',
];

async function loadAdminPollResults(panel) {
  panel.innerHTML = '<div class="loading"><div class="spinner"></div> Loading poll results…</div>';
  try {
    const snap  = await getDocs(collection(db, 'poll'));
    const votes = snap.docs.map(d => d.data());

    // Tally votes per date
    const totals = {};
    POLL_DATES.forEach(d => { totals[d] = { count: 0, names: [] }; });
    votes.forEach(v => {
      (v.dates || []).forEach(date => {
        if (totals[date]) {
          totals[date].count++;
          totals[date].names.push(v.displayName || 'Unknown');
        }
      });
    });

    // Sort highest votes first; keep original order as tiebreaker
    const sorted   = [...POLL_DATES].sort((a, b) => totals[b].count - totals[a].count);
    const maxCount = Math.max(...sorted.map(d => totals[d].count), 1);
    const total    = votes.length;

    panel.innerHTML = `
      <p class="text-muted" style="margin-bottom:1rem;font-size:.85rem;">
        ${total} neighbor${total !== 1 ? 's' : ''} responded
      </p>
      ${sorted.map(date => {
        const { count, names } = totals[date];
        const pct = Math.round((count / maxCount) * 100);
        return `
          <div class="poll-result-row">
            <div class="poll-result-header">
              <span class="poll-result-date">${escHtml(date)}</span>
              <span class="poll-result-count">${count} vote${count !== 1 ? 's' : ''}</span>
            </div>
            <div class="poll-result-bar-wrap">
              <div class="poll-result-bar" style="width:${pct}%"></div>
            </div>
            ${names.length > 0 ? `
              <details class="poll-result-details">
                <summary>${names.length} neighbor${names.length !== 1 ? 's' : ''} available</summary>
                <p class="poll-result-names">${names.map(n => escHtml(n)).join(' · ')}</p>
              </details>
            ` : '<p class="text-muted" style="font-size:.8rem;margin-top:.3rem;">No votes yet</p>'}
          </div>
        `;
      }).join('')}
    `;
  } catch (err) {
    panel.innerHTML = `<p class="text-danger">Error loading poll results: ${escHtml(err.message)}</p>`;
  }
}

function renderAdminPanel(container, users) {
  const pending  = users.filter(u => !u.approved);
  const approved = users.filter(u => u.approved);

  container.innerHTML = `
    <div class="admin-tabs">
      <button class="admin-tab-btn active" data-atab="pending">
        Pending (${pending.length})
      </button>
      <button class="admin-tab-btn" data-atab="approved">
        Members (${approved.length})
      </button>
      <button class="admin-tab-btn" data-atab="poll">
        📅 Poll Results
      </button>
    </div>
    <div id="atab-pending" class="admin-tab-panel active">
      ${pending.length === 0
        ? '<p class="text-muted">No pending accounts.</p>'
        : pending.map(u => userRow(u)).join('')}
    </div>
    <div id="atab-approved" class="admin-tab-panel">
      ${approved.map(u => userRow(u, true)).join('')}
    </div>
    <div id="atab-poll" class="admin-tab-panel"></div>
  `;

  // Admin tab switching — lazy-loads poll results on first click
  container.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(`atab-${btn.dataset.atab}`);
      panel.classList.add('active');
      if (btn.dataset.atab === 'poll' && !panel.dataset.loaded) {
        panel.dataset.loaded = '1';
        loadAdminPollResults(panel);
      }
    });
  });

  // Button handlers
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, uid } = btn.dataset;

    try {
      if (action === 'approve') {
        await updateDoc(doc(db, 'users', uid), { approved: true });
        showToast('User approved.', 'success');
        openAdminPanel(); // refresh
      } else if (action === 'deny') {
        const ok = await showConfirm('Deny Account', 'Remove this pending account?');
        if (!ok) return;
        await deleteDoc(doc(db, 'users', uid));
        await deleteDoc(doc(db, 'directory', uid));
        showToast('Account removed.', 'success');
        openAdminPanel();
      } else if (action === 'make-admin') {
        const ok = await showConfirm('Grant Admin', 'Make this user an admin?');
        if (!ok) return;
        await updateDoc(doc(db, 'users', uid), { role: 'admin' });
        showToast('User promoted to admin.', 'success');
        openAdminPanel();
      } else if (action === 'remove-admin') {
        const ok = await showConfirm('Remove Admin', 'Remove admin role from this user?');
        if (!ok) return;
        await updateDoc(doc(db, 'users', uid), { role: 'user' });
        showToast('Admin role removed.', 'success');
        openAdminPanel();
      } else if (action === 'delete-user') {
        const ok = await showConfirm('Delete User', 'Permanently remove this user and their directory entry?');
        if (!ok) return;
        await deleteDoc(doc(db, 'users', uid));
        await deleteDoc(doc(db, 'directory', uid));
        showToast('User deleted.', 'success');
        openAdminPanel();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function userRow(u, showRoleControls = false) {
  const isCurrentAdmin = u.role === 'admin';
  const isSelf = u.uid === appState.user?.uid;

  return `
    <div class="user-row">
      <div class="user-info">
        <strong>${escHtml(u.displayName || 'Unknown')}</strong>
        <small>${escHtml(u.email)}</small>
      </div>
      <div class="user-badges">
        ${isCurrentAdmin ? '<span class="badge badge-admin">Admin</span>' : ''}
        ${u.approved ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-pending">Pending</span>'}
      </div>
      <div class="card-actions">
        ${!u.approved ? `
          <button class="btn btn-sm btn-primary" data-action="approve" data-uid="${u.uid}">Approve</button>
          <button class="btn btn-sm btn-danger"  data-action="deny"    data-uid="${u.uid}">Deny</button>
        ` : ''}
        ${showRoleControls && !isSelf ? `
          ${!isCurrentAdmin
            ? `<button class="btn btn-sm btn-outline" data-action="make-admin"   data-uid="${u.uid}">Make Admin</button>`
            : `<button class="btn btn-sm btn-ghost"   data-action="remove-admin" data-uid="${u.uid}">Remove Admin</button>`
          }
          <button class="btn btn-sm btn-danger" data-action="delete-user" data-uid="${u.uid}">Delete</button>
        ` : ''}
      </div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function escHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/too-many-requests':    'Too many attempts. Please wait a moment and try again.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}

import { db } from './firebase-config.js';
import {
  collection, doc, updateDoc, deleteDoc, onSnapshot,
  query, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml } from './app.js';

// Longest mailto: URL we'll try to hand off to the OS before falling back
// to the copy-paste modal. Browsers / mail clients start truncating well
// past ~2000 chars, so stay comfortably under.
const MAX_MAILTO_LEN = 1900;

// Extract the first integer from an address string ("404 N. Washington" → 404).
// Returns Infinity for entries with no parseable number so they sort to the end.
function addrNum(address) {
  const m = (address || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : Infinity;
}

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div class="section-header">
      <h2>Neighbor Directory</h2>
      ${state.isAdmin ? `<button class="btn btn-primary btn-sm" id="email-everyone-btn">✉️ Email Everyone</button>` : ''}
    </div>
    <p class="text-muted" style="margin-bottom:1rem;">
      Click <strong>Edit</strong> on your own card to update your info. Your address and phone are only visible to logged-in neighbors.
    </p>
    <div id="dir-grid" class="directory-grid"></div>
  `;

  if (state.isAdmin) {
    container.querySelector('#email-everyone-btn')?.addEventListener('click', () => {
      emailEveryone(state, utils);
    });
  }

  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'directory')),
    (snap) => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      entries.sort((a, b) => {
        const numA = addrNum(a.address);
        const numB = addrNum(b.address);
        if (numA !== numB) return numA - numB;
        return (a.name || '').localeCompare(b.name || '');
      });
      renderDirectory(entries, state, utils);
    }
  );
}

function renderDirectory(entries, state, utils) {
  const grid = document.getElementById('dir-grid');
  if (!grid) return;

  if (entries.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">👥</div>
        <p>No neighbors listed yet.</p>
      </div>`;
    return;
  }

  grid.innerHTML = entries.map(entry => dirCard(entry, state)).join('');

  grid.querySelectorAll('[data-edit-dir]').forEach(btn => {
    const id    = btn.dataset.editDir;
    const entry = entries.find(e => e.id === id);
    btn.addEventListener('click', () => showDirModal(entry, state, utils));
  });

  grid.querySelectorAll('[data-delete-dir]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await utils.showConfirm('Remove Entry', 'Remove this neighbor from the directory?');
      if (!ok) return;
      try {
        await deleteDoc(doc(db, 'directory', btn.dataset.deleteDir));
        utils.showToast('Entry removed.', 'success');
      } catch (err) {
        utils.showToast(err.message, 'error');
      }
    });
  });
}

// ── Email Everyone (admin) ───────────────────────────────────────────────────

async function emailEveryone(state, utils) {
  const btn = document.getElementById('email-everyone-btn');
  if (btn) btn.disabled = true;

  try {
    const snap = await getDocs(collection(db, 'directory'));

    // Collect, trim, drop blanks, de-dupe case-insensitively (keep first form seen)
    const seen = new Set();
    const emails = [];
    snap.docs.forEach(d => {
      const email = (d.data().email || '').trim();
      if (!email) return;
      const key = email.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      emails.push(email);
    });

    if (emails.length === 0) {
      utils.showToast('No email addresses found in the directory.', 'error');
      return;
    }

    // Encode each address but keep literal commas as separators: mailto:?bcc=a,b,c
    const bcc = emails.map(encodeURIComponent).join(',');
    const mailto = `mailto:?bcc=${bcc}`;

    if (mailto.length <= MAX_MAILTO_LEN) {
      window.location.href = mailto;
    } else {
      showEmailListModal(emails, utils);
    }
  } catch (err) {
    utils.showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function showEmailListModal(emails, utils) {
  const old = document.getElementById('email-list-modal');
  if (old) old.remove();

  const list = emails.join(', ');

  const modal = document.createElement('div');
  modal.id = 'email-list-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>✉️ Email Everyone</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <p class="text-muted">
          There are too many addresses for a mailto link. Copy the list below and
          paste it into the <strong>BCC</strong> field of a new email.
        </p>
        <div class="form-group">
          <label>${emails.length} email addresses</label>
          <textarea id="email-list-text" rows="6" readonly>${escHtml(list)}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="email-list-close">Close</button>
        <button class="btn btn-primary" id="email-list-copy">Copy to Clipboard</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('email-list-close').addEventListener('click', close);

  document.getElementById('email-list-copy').addEventListener('click', async () => {
    const ta = document.getElementById('email-list-text');
    try {
      await navigator.clipboard.writeText(list);
      utils.showToast('Email list copied to clipboard!', 'success');
    } catch {
      // Fallback for browsers without clipboard API / permission
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      utils.showToast(ok ? 'Email list copied to clipboard!' : 'Press Ctrl/Cmd+C to copy.', ok ? 'success' : 'error');
    }
  });
}

function dirCard(entry, state) {
  const isOwn   = entry.uid === state.user?.uid;
  const canEdit = isOwn || state.isAdmin;
  const num     = addrNum(entry.address);
  const avatarText = num < Infinity ? String(num) : '?';

  return `
    <div class="dir-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
        <div class="dir-avatar">${escHtml(avatarText)}</div>
        ${canEdit ? `
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" data-edit-dir="${entry.id}">✏️ Edit</button>
            ${state.isAdmin && !isOwn ? `<button class="btn btn-ghost btn-sm" data-delete-dir="${entry.id}">🗑️</button>` : ''}
          </div>` : ''}
      </div>
      <h3>${escHtml(entry.name)}</h3>
      ${entry.address ? `<p class="dir-detail">📍 <span>${escHtml(entry.address)}</span></p>` : ''}
      ${entry.phone   ? `<p class="dir-detail">📞 <span>${escHtml(entry.phone)}</span></p>` : ''}
      <p class="dir-detail">✉️ <span>${escHtml(entry.email)}</span></p>
      ${entry.notes   ? `<p class="dir-detail" style="margin-top:.5rem;font-style:italic;">${escHtml(entry.notes)}</p>` : ''}
    </div>
  `;
}

function showDirModal(entry, state, utils) {
  const old = document.getElementById('dir-modal-instance');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'dir-modal-instance';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>Edit Directory Entry</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="dir-name" value="${escHtml(entry.name || '')}" required>
        </div>
        <div class="form-group">
          <label>Address on Block</label>
          <input type="text" id="dir-address" value="${escHtml(entry.address || '')}" placeholder="e.g. 142 Washington St">
        </div>
        <div class="form-group">
          <label>Phone (optional)</label>
          <input type="text" id="dir-phone" value="${escHtml(entry.phone || '')}" placeholder="(555) 000-0000">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="dir-email" value="${escHtml(entry.email || '')}">
        </div>
        <div class="form-group">
          <label>Notes / About (optional)</label>
          <textarea id="dir-notes" placeholder="e.g. 'The family with the big oak tree'">${escHtml(entry.notes || '')}</textarea>
        </div>
        <div id="dir-modal-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="dir-cancel">Cancel</button>
        <button class="btn btn-primary" id="dir-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('dir-cancel').addEventListener('click', close);

  document.getElementById('dir-save').addEventListener('click', async () => {
    const btn   = document.getElementById('dir-save');
    const errEl = document.getElementById('dir-modal-err');
    const name  = document.getElementById('dir-name').value.trim();

    if (!name) {
      errEl.textContent = 'Name is required.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    try {
      await updateDoc(doc(db, 'directory', entry.id), {
        name,
        address: document.getElementById('dir-address').value.trim(),
        phone:   document.getElementById('dir-phone').value.trim(),
        email:   document.getElementById('dir-email').value.trim(),
        notes:   document.getElementById('dir-notes').value.trim()
      });
      utils.showToast('Directory entry updated!', 'success');
      close();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

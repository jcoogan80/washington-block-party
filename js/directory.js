import { db } from './firebase-config.js';
import {
  collection, doc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml, getInitials } from './app.js';

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div class="section-header">
      <h2>Neighbor Directory</h2>
    </div>
    <p class="text-muted" style="margin-bottom:1rem;">
      Click <strong>Edit</strong> on your own card to update your info. Your address and phone are only visible to logged-in neighbors.
    </p>
    <div id="dir-grid" class="directory-grid"></div>
  `;

  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'directory'), orderBy('name', 'asc')),
    (snap) => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

function dirCard(entry, state) {
  const isOwn   = entry.uid === state.user?.uid;
  const canEdit = isOwn || state.isAdmin;

  return `
    <div class="dir-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
        <div class="dir-avatar">${escHtml(getInitials(entry.name))}</div>
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

import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml } from './app.js';

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div class="section-header">
      <h2>Past Years</h2>
      ${state.isAdmin ? `<button class="btn btn-primary btn-sm" id="new-year-btn">+ Add Year</button>` : ''}
    </div>
    <p class="text-muted" style="margin-bottom:1.25rem;">
      A look back at Washington Street Block Parties through the years.
    </p>
    <div id="history-grid" class="history-grid"></div>
  `;

  if (state.isAdmin) {
    container.querySelector('#new-year-btn')?.addEventListener('click', () => {
      showYearModal(null, state, utils);
    });
  }

  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'history'), orderBy('year', 'desc')),
    (snap) => {
      const years = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHistory(years, state, utils);
    }
  );
}

function renderHistory(years, state, utils) {
  const grid = document.getElementById('history-grid');
  if (!grid) return;

  if (years.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📸</div>
        <p>No history entries yet.${state.isAdmin ? ' Click <strong>+ Add Year</strong> to get started.' : ''}</p>
      </div>`;
    return;
  }

  grid.innerHTML = years.map(entry => historyCard(entry, state)).join('');

  grid.querySelectorAll('[data-lightbox]').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
  });

  if (state.isAdmin) {
    grid.querySelectorAll('[data-edit-year]').forEach(btn => {
      const id    = btn.dataset.editYear;
      const entry = years.find(y => y.id === id);
      btn.addEventListener('click', () => showYearModal(entry, state, utils));
    });
    grid.querySelectorAll('[data-delete-year]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await utils.showConfirm('Delete Year', 'Remove this year entry?');
        if (!ok) return;
        try {
          await deleteDoc(doc(db, 'history', btn.dataset.deleteYear));
          utils.showToast('Year entry removed.', 'success');
        } catch (err) {
          utils.showToast(err.message, 'error');
        }
      });
    });
  }
}

function historyCard(entry, state) {
  const photos  = (entry.photos || []).filter(Boolean).slice(0, 9);
  const photoHtml = photos.map(url =>
    `<img class="history-photo" src="${escHtml(url)}" alt="${entry.year} photo" loading="lazy" data-lightbox>`
  ).join('');

  return `
    <div class="history-card">
      <div class="history-year-banner">
        ${entry.year}
        ${entry.theme ? `<div class="history-theme">"${escHtml(entry.theme)}"</div>` : ''}
      </div>
      <div class="history-body">
        ${entry.highlights
          ? `<p class="history-highlights">${escHtml(entry.highlights)}</p>`
          : ''}
        ${photoHtml ? `<div class="history-photos">${photoHtml}</div>` : ''}
        ${state.isAdmin ? `
          <div class="card-actions" style="margin-top:.75rem;">
            <button class="btn btn-ghost btn-sm" data-edit-year="${entry.id}">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm" data-delete-year="${entry.id}">🗑️ Delete</button>
          </div>` : ''}
      </div>
    </div>
  `;
}

function openLightbox(src, alt) {
  const existing = document.getElementById('lightbox');
  if (existing) existing.remove();

  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.style.cssText = `
    position:fixed;inset:0;z-index:3000;
    background:rgba(0,0,0,.9);
    display:flex;align-items:center;justify-content:center;
    cursor:zoom-out;padding:1rem;
  `;
  lb.innerHTML = `
    <img src="${escHtml(src)}" alt="${escHtml(alt)}"
      style="max-width:100%;max-height:90vh;border-radius:6px;object-fit:contain;">
  `;
  document.body.appendChild(lb);
  lb.addEventListener('click', () => lb.remove());
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', esc); }
  });
}

function showYearModal(existing, state, utils) {
  const isEdit = !!existing;
  const old = document.getElementById('year-modal-instance');
  if (old) old.remove();

  const currentYear = new Date().getFullYear();
  const photosValue = (existing?.photos || []).join('\n');

  const modal = document.createElement('div');
  modal.id = 'year-modal-instance';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>${isEdit ? `Edit ${existing.year}` : 'Add Year'}</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-row">
          <div class="form-group">
            <label>Year</label>
            <input type="number" id="yr-year" value="${existing?.year || currentYear}" min="2000" max="${currentYear}" required>
          </div>
          <div class="form-group">
            <label>Theme</label>
            <input type="text" id="yr-theme" value="${escHtml(existing?.theme || '')}" placeholder="e.g. Tropical Paradise">
          </div>
        </div>
        <div class="form-group">
          <label>Highlights / Notes</label>
          <textarea id="yr-highlights" placeholder="Memorable moments from this year…">${escHtml(existing?.highlights || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Photo URLs (one per line)</label>
          <textarea id="yr-photos" style="min-height:100px;" placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg">${escHtml(photosValue)}</textarea>
          <small class="text-muted" style="margin-top:3px;">Up to 9 photos shown. Use direct image links (Google Photos, Imgur, etc.).</small>
        </div>
        <div id="yr-modal-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="yr-cancel">Cancel</button>
        <button class="btn btn-primary" id="yr-save">${isEdit ? 'Save Changes' : 'Add Year'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('yr-cancel').addEventListener('click', close);

  document.getElementById('yr-save').addEventListener('click', async () => {
    const btn    = document.getElementById('yr-save');
    const errEl  = document.getElementById('yr-modal-err');
    const year   = parseInt(document.getElementById('yr-year').value, 10);
    const theme  = document.getElementById('yr-theme').value.trim();
    const highlights = document.getElementById('yr-highlights').value.trim();
    const photos = document.getElementById('yr-photos').value
      .split('\n').map(s => s.trim()).filter(Boolean);

    if (!year) {
      errEl.textContent = 'A valid year is required.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    try {
      const data = { year, theme, highlights, photos };
      if (isEdit) {
        await updateDoc(doc(db, 'history', existing.id), data);
        utils.showToast('Year updated!', 'success');
      } else {
        await addDoc(collection(db, 'history'), { ...data, createdAt: serverTimestamp() });
        utils.showToast('Year added!', 'success');
      }
      close();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

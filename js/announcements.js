import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy, setDoc, getDoc, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml } from './app.js';
import { initPoll } from './poll.js';

const EMOJIS = ['👍','❤️','😂','🎉','🙌','🔥'];

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div id="event-banner-wrap"></div>
    <div id="poll-wrap"></div>
    <div class="section-header">
      <h2>Announcements</h2>
      ${state.isAdmin ? `<button class="btn btn-primary btn-sm" id="new-ann-btn">+ Post</button>` : ''}
    </div>
    <div id="ann-list"></div>
  `;

  loadEventBanner(state, utils);
  initPoll(container.querySelector('#poll-wrap'), state, utils);

  if (state.isAdmin) {
    container.querySelector('#new-ann-btn')?.addEventListener('click', () => {
      showAnnModal(null, state, utils);
    });
  }

  // Real-time feed
  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
    (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderFeed(docs, state, utils);
    }
  );
}

// ── Event Banner ──────────────────────────────────────────────────────────────

async function loadEventBanner(state, utils) {
  const wrap = document.getElementById('event-banner-wrap');
  if (!wrap) return;

  try {
    const snap = await getDoc(doc(db, 'settings', 'event'));
    const data = snap.exists() ? snap.data() : {};
    renderBanner(data, state, utils);
  } catch {
    renderBanner({}, state, utils);
  }
}

function renderBanner(data, state, utils) {
  const wrap = document.getElementById('event-banner-wrap');
  if (!wrap) return;

  const {
    date        = 'TBD',
    time        = 'TBD',
    location    = 'TBD',
    theme       = 'Summer Block Party',
    description = ''
  } = data;

  wrap.innerHTML = `
    <div class="event-banner">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <h2>${escHtml(theme)}</h2>
        ${state.isAdmin ? `<button class="btn btn-sm btn-outline" id="edit-event-btn" style="color:#fff;border-color:rgba(255,255,255,.5)">Edit</button>` : ''}
      </div>
      <div class="event-meta">
        <span class="event-meta-item"><span class="meta-icon">📅</span>${escHtml(date)}</span>
        <span class="event-meta-item"><span class="meta-icon">🕐</span>${escHtml(time)}</span>
        <span class="event-meta-item"><span class="meta-icon">📍</span>${escHtml(location)}</span>
      </div>
      ${description ? `<p class="event-desc">${escHtml(description)}</p>` : ''}
    </div>
  `;

  if (state.isAdmin) {
    document.getElementById('edit-event-btn')?.addEventListener('click', () => {
      showEventModal(data, state, utils);
    });
  }
}

function showEventModal(data, state, utils) {
  const existing = document.getElementById('event-edit-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'event-edit-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>Edit Event Details</h3>
        <button class="modal-close">✕</button>
      </div>
      <form class="modal-body form-stack" id="event-form">
        <div class="form-group">
          <label>Theme / Event Name</label>
          <input type="text" id="ev-theme" value="${escHtml(data.theme || '')}" placeholder="Summer Block Party" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date</label>
            <input type="text" id="ev-date" value="${escHtml(data.date || '')}" placeholder="Saturday, July 12, 2025">
          </div>
          <div class="form-group">
            <label>Time</label>
            <input type="text" id="ev-time" value="${escHtml(data.time || '')}" placeholder="11am – 5pm">
          </div>
        </div>
        <div class="form-group">
          <label>Location / Address</label>
          <input type="text" id="ev-location" value="${escHtml(data.location || '')}" placeholder="Washington Street, between Oak and Elm">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="ev-desc">${escHtml(data.description || '')}</textarea>
        </div>
        <div id="event-form-err" class="form-error" hidden></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-outline" id="ev-cancel">Cancel</button>
        <button class="btn btn-primary" id="ev-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('ev-cancel').addEventListener('click', close);

  document.getElementById('ev-save').addEventListener('click', async () => {
    const btn = document.getElementById('ev-save');
    btn.disabled = true;
    const errEl = document.getElementById('event-form-err');
    try {
      await setDoc(doc(db, 'settings', 'event'), {
        theme:       document.getElementById('ev-theme').value.trim(),
        date:        document.getElementById('ev-date').value.trim(),
        time:        document.getElementById('ev-time').value.trim(),
        location:    document.getElementById('ev-location').value.trim(),
        description: document.getElementById('ev-desc').value.trim()
      });
      utils.showToast('Event details updated!', 'success');
      close();
      loadEventBanner(state, utils);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

// ── Announcement Feed ─────────────────────────────────────────────────────────

function renderFeed(docs, state, utils) {
  const list = document.getElementById('ann-list');
  if (!list) return;

  if (docs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📢</div>
        <p>No announcements yet. Check back soon!</p>
      </div>`;
    return;
  }

  list.innerHTML = docs.map(d => annCard(d, state)).join('');

  // Bind reaction and action buttons
  list.querySelectorAll('[data-react]').forEach(btn => {
    btn.addEventListener('click', () => handleReaction(btn.dataset.react, btn.dataset.id, state, utils));
  });
  list.querySelectorAll('[data-add-reaction]').forEach(btn => {
    btn.addEventListener('click', (e) => showEmojiPicker(e, btn.dataset.id, state, utils));
  });
  list.querySelectorAll('[data-edit-ann]').forEach(btn => {
    const id   = btn.dataset.editAnn;
    const data = docs.find(d => d.id === id);
    btn.addEventListener('click', () => showAnnModal(data, state, utils));
  });
  list.querySelectorAll('[data-delete-ann]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await utils.showConfirm('Delete Announcement', 'Delete this announcement?');
      if (!ok) return;
      await deleteDoc(doc(db, 'announcements', btn.dataset.deleteAnn));
      utils.showToast('Announcement deleted.', 'success');
    });
  });
}

function annCard(d, state) {
  const reactions = d.reactions || {};
  const uid = state.user?.uid;

  const reactionHtml = Object.entries(reactions)
    .filter(([, uids]) => uids.length > 0)
    .map(([emoji, uids]) => {
      const reacted = uids.includes(uid);
      return `<button class="reaction-btn ${reacted ? 'reacted' : ''}" data-react="${emoji}" data-id="${d.id}" title="${uids.length} ${reacted ? '(including you)' : ''}">
        ${emoji} ${uids.length}
      </button>`;
    }).join('');

  return `
    <div class="announcement-card">
      <div class="ann-header">
        <div>
          <h3>${escHtml(d.title)}</h3>
          <div class="ann-meta">
            Posted by ${escHtml(d.authorName)} · ${utils.formatTimestamp(d.createdAt)}
          </div>
        </div>
        ${state.isAdmin ? `
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" data-edit-ann="${d.id}">✏️</button>
            <button class="btn btn-ghost btn-sm" data-delete-ann="${d.id}">🗑️</button>
          </div>
        ` : ''}
      </div>
      <div class="ann-body">${escHtml(d.body)}</div>
      <div class="reaction-bar">
        ${reactionHtml}
        <button class="add-reaction-btn" data-add-reaction="${d.id}">+ 😊</button>
      </div>
    </div>
  `;
}

async function handleReaction(emoji, docId, state, utils) {
  if (!state.user) return;
  const uid = state.user.uid;
  const ref = doc(db, 'announcements', docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const reactions = snap.data().reactions || {};
  const uids = reactions[emoji] || [];
  const hasReacted = uids.includes(uid);

  try {
    await updateDoc(ref, {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(uid) : arrayUnion(uid)
    });
  } catch (err) {
    utils.showToast(err.message, 'error');
  }
}

function showEmojiPicker(e, docId, state, utils) {
  // Remove any existing picker
  document.querySelectorAll('.emoji-picker-pop').forEach(el => el.remove());

  const picker = document.createElement('div');
  picker.className = 'emoji-picker-pop';
  picker.style.cssText = `
    position:fixed; z-index:2000;
    background:var(--card-bg); border:1px solid var(--border);
    border-radius:var(--radius); padding:.5rem;
    display:flex; gap:.35rem; box-shadow:var(--shadow-lg);
  `;
  picker.innerHTML = EMOJIS.map(em =>
    `<button style="font-size:1.2rem;background:none;border:none;cursor:pointer;padding:4px;" data-em="${em}">${em}</button>`
  ).join('');

  const rect = e.target.getBoundingClientRect();
  picker.style.top  = `${rect.bottom + 4}px`;
  picker.style.left = `${rect.left}px`;
  document.body.appendChild(picker);

  picker.addEventListener('click', (ev) => {
    const em = ev.target.dataset.em;
    if (em) {
      handleReaction(em, docId, state, utils);
      picker.remove();
    }
  });

  setTimeout(() => document.addEventListener('click', function handler(ev) {
    if (!picker.contains(ev.target)) {
      picker.remove();
      document.removeEventListener('click', handler);
    }
  }), 0);
}

// ── Announcement Modal ────────────────────────────────────────────────────────

function showAnnModal(existing, state, utils) {
  const isEdit = !!existing;
  const old = document.getElementById('ann-modal-instance');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'ann-modal-instance';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Announcement' : 'New Announcement'}</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="ann-title" value="${escHtml(existing?.title || '')}" placeholder="Announcement title" required>
        </div>
        <div class="form-group">
          <label>Body</label>
          <textarea id="ann-body" placeholder="Write your announcement here…">${escHtml(existing?.body || '')}</textarea>
        </div>
        <div id="ann-modal-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="ann-cancel">Cancel</button>
        <button class="btn btn-primary" id="ann-save">${isEdit ? 'Save Changes' : 'Post'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('ann-cancel').addEventListener('click', close);

  document.getElementById('ann-save').addEventListener('click', async () => {
    const btn   = document.getElementById('ann-save');
    const errEl = document.getElementById('ann-modal-err');
    const title = document.getElementById('ann-title').value.trim();
    const body  = document.getElementById('ann-body').value.trim();

    if (!title || !body) {
      errEl.textContent = 'Please fill in both fields.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'announcements', existing.id), { title, body });
        utils.showToast('Announcement updated.', 'success');
      } else {
        await addDoc(collection(db, 'announcements'), {
          title, body,
          authorId:   state.user.uid,
          authorName: state.userDoc.displayName,
          createdAt:  serverTimestamp(),
          reactions:  {}
        });
        utils.showToast('Announcement posted!', 'success');
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

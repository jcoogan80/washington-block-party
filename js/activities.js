import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml } from './app.js';

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div class="section-header">
      <h2>Activity Sign-Ups</h2>
      ${state.isAdmin ? `<button class="btn btn-primary btn-sm" id="new-act-btn">+ Add Activity</button>` : ''}
    </div>
    <p class="text-muted" style="margin-bottom:1.25rem;">
      Sign up for an activity or volunteer role to help make the party a success!
    </p>
    <div id="activities-grid" class="activities-grid"></div>
  `;

  if (state.isAdmin) {
    container.querySelector('#new-act-btn')?.addEventListener('click', () => {
      showActModal(null, state, utils);
    });
  }

  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'activities'), orderBy('createdAt', 'asc')),
    (snap) => {
      const acts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderActivities(acts, state, utils);
    }
  );
}

function renderActivities(acts, state, utils) {
  const grid = document.getElementById('activities-grid');
  if (!grid) return;

  if (acts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎯</div>
        <p>No activities yet.${state.isAdmin ? ' Click <strong>+ Add Activity</strong> to get started.' : ''}</p>
      </div>`;
    return;
  }

  grid.innerHTML = acts.map(act => actCard(act, state)).join('');

  grid.querySelectorAll('[data-signup]').forEach(btn => {
    btn.addEventListener('click', () => handleSignup(btn.dataset.signup, state, utils));
  });
  grid.querySelectorAll('[data-leave]').forEach(btn => {
    btn.addEventListener('click', () => handleLeave(btn.dataset.leave, state, utils));
  });
  if (state.isAdmin) {
    grid.querySelectorAll('[data-edit-act]').forEach(btn => {
      const id  = btn.dataset.editAct;
      const act = acts.find(a => a.id === id);
      btn.addEventListener('click', () => showActModal(act, state, utils));
    });
    grid.querySelectorAll('[data-delete-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await utils.showConfirm('Delete Activity', 'Remove this activity and all its sign-ups?');
        if (!ok) return;
        try {
          await deleteDoc(doc(db, 'activities', btn.dataset.deleteAct));
          utils.showToast('Activity removed.', 'success');
        } catch (err) {
          utils.showToast(err.message, 'error');
        }
      });
    });
  }
}

function actCard(act, state) {
  const signups   = act.signups  || [];
  const maxVols   = act.maxVolunteers || 0;
  const uid       = state.user?.uid;
  const isSignedUp = signups.some(s => s.uid === uid);
  const isFull    = maxVols > 0 && signups.length >= maxVols;
  const spotsLeft = maxVols > 0 ? maxVols - signups.length : null;

  const spotsClass = isFull ? 'activity-spots full' : 'activity-spots';
  const spotsText  = spotsLeft === null
    ? `${signups.length} signed up`
    : isFull
      ? `Full (${maxVols}/${maxVols})`
      : `${signups.length}/${maxVols} signed up · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`;

  const signupChips = signups.map(s =>
    `<span class="signup-chip ${s.uid === uid ? 'me' : ''}">${escHtml(s.name)}${s.uid === uid ? ' ✓' : ''}</span>`
  ).join('');

  let actionBtn = '';
  if (isSignedUp) {
    actionBtn = `<button class="btn btn-outline btn-sm" data-leave="${act.id}">Remove Myself</button>`;
  } else if (!isFull) {
    actionBtn = `<button class="btn btn-primary btn-sm" data-signup="${act.id}">Sign Up</button>`;
  } else {
    actionBtn = `<button class="btn btn-ghost btn-sm" disabled>Activity Full</button>`;
  }

  return `
    <div class="activity-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h3>${escHtml(act.name)}</h3>
          ${act.timeSlot ? `<span class="activity-badge">⏰ ${escHtml(act.timeSlot)}</span>` : ''}
        </div>
        ${state.isAdmin ? `
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm" data-edit-act="${act.id}">✏️</button>
            <button class="btn btn-ghost btn-sm" data-delete-act="${act.id}">🗑️</button>
          </div>` : ''}
      </div>
      <p class="activity-desc">${escHtml(act.description || '')}</p>
      <div class="${spotsClass}">${spotsText}</div>
      ${signupChips ? `<div class="signup-list">${signupChips}</div>` : ''}
      ${actionBtn}
    </div>
  `;
}

async function handleSignup(actId, state, utils) {
  if (!state.user) return;
  try {
    await updateDoc(doc(db, 'activities', actId), {
      signups: arrayUnion({ uid: state.user.uid, name: state.userDoc.displayName })
    });
    utils.showToast("You're signed up! 🎉", 'success');
  } catch (err) {
    utils.showToast(err.message, 'error');
  }
}

async function handleLeave(actId, state, utils) {
  if (!state.user) return;
  const ok = await utils.showConfirm('Remove Sign-Up', 'Remove yourself from this activity?');
  if (!ok) return;
  try {
    // arrayRemove requires an exact object match — fetch current list and filter
    const snap = await getDoc(doc(db, 'activities', actId));
    if (!snap.exists()) return;
    const signups = (snap.data().signups || []).filter(s => s.uid !== state.user.uid);
    await updateDoc(doc(db, 'activities', actId), { signups });
    utils.showToast('Sign-up removed.', 'info');
  } catch (err) {
    utils.showToast(err.message, 'error');
  }
}

function showActModal(existing, state, utils) {
  const isEdit = !!existing;
  const old = document.getElementById('act-modal-instance');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'act-modal-instance';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Activity' : 'Add Activity'}</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-group">
          <label>Activity Name</label>
          <input type="text" id="act-name" value="${escHtml(existing?.name || '')}" placeholder="e.g. Grill Master" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="act-desc" placeholder="What does this role involve?">${escHtml(existing?.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Time Slot</label>
            <input type="text" id="act-time" value="${escHtml(existing?.timeSlot || '')}" placeholder="e.g. 11am – 2pm">
          </div>
          <div class="form-group">
            <label>Max Volunteers (0 = unlimited)</label>
            <input type="number" id="act-max" value="${existing?.maxVolunteers ?? 0}" min="0">
          </div>
        </div>
        <div id="act-modal-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="act-cancel">Cancel</button>
        <button class="btn btn-primary" id="act-save">${isEdit ? 'Save Changes' : 'Add Activity'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('act-cancel').addEventListener('click', close);

  document.getElementById('act-save').addEventListener('click', async () => {
    const btn   = document.getElementById('act-save');
    const errEl = document.getElementById('act-modal-err');
    const name  = document.getElementById('act-name').value.trim();
    const desc  = document.getElementById('act-desc').value.trim();
    const time  = document.getElementById('act-time').value.trim();
    const max   = parseInt(document.getElementById('act-max').value, 10) || 0;

    if (!name) {
      errEl.textContent = 'Activity name is required.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    try {
      const data = { name, description: desc, timeSlot: time, maxVolunteers: max };
      if (isEdit) {
        await updateDoc(doc(db, 'activities', existing.id), data);
        utils.showToast('Activity updated!', 'success');
      } else {
        await addDoc(collection(db, 'activities'), {
          ...data,
          signups:   [],
          createdAt: serverTimestamp()
        });
        utils.showToast('Activity added!', 'success');
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

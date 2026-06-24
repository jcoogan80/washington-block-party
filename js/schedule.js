import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml } from './app.js';

const REF_2025 = [
  { time: '11:00 AM', title: 'Block closes for traffic' },
  { time: '12:00 PM', title: 'Bounce House is up' },
  { time: '1:00 PM',  title: 'Music starts' },
  { time: '3:00 PM',  title: 'Sno cone machine up' },
  { time: '4:00 PM',  title: 'Grill food' },
  { time: '5:00 PM',  title: 'Decorate cupcakes' },
  { time: '6:00 PM',  title: 'Piñata' },
  { time: '7:00 PM',  title: '(open / free time)' },
  { time: '8:00 PM',  title: 'Bring out glow bracelets' },
  { time: '9:00 PM',  title: 'Projector movie on for kids' },
  { time: '9:00 PM',  title: 'Light fire pit' },
  { time: '9:00 PM',  title: 'Turn off inflatable' },
  { time: '11:00 PM', title: 'Open block up to street traffic' },
];

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div class="section-header">
      <h2>Day Schedule</h2>
      ${state.isAdmin ? `<button class="btn btn-primary btn-sm" id="new-slot-btn">+ Add Time Slot</button>` : ''}
    </div>
    <div id="schedule-list"></div>
    <div id="schedule-ref"></div>
  `;

  if (state.isAdmin) {
    container.querySelector('#new-slot-btn')?.addEventListener('click', () => {
      showSlotModal(null, state, utils);
    });
  }

  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'schedule'), orderBy('sortTime', 'asc')),
    (snap) => {
      const slots = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSchedule(slots, state, utils);
    }
  );

  renderRefItinerary(container.querySelector('#schedule-ref'));
}

function renderRefItinerary(wrap) {
  wrap.innerHTML = `
    <details class="ref-itinerary">
      <summary class="ref-summary">
        <span class="ref-summary-label">
          📋 Last Year's Itinerary (2025) — for reference
        </span>
        <span class="badge ref-badge">Historical</span>
        <span class="ref-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="ref-body">
        <p class="ref-subtitle">
          This is what we did last year. This year's exact schedule may differ
          once we lock in activities and the date.
        </p>
        <div class="ref-list">
          ${REF_2025.map(item => `
            <div class="ref-row">
              <span class="ref-time">${escHtml(item.time)}</span>
              <span class="ref-title">${escHtml(item.title)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </details>
  `;
}

function renderSchedule(slots, state, utils) {
  const list = document.getElementById('schedule-list');
  if (!list) return;

  if (slots.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>No schedule items yet.${state.isAdmin ? ' Click <strong>+ Add Time Slot</strong> to get started.' : ''}</p>
      </div>`;
    return;
  }

  list.innerHTML = `
    <div class="timeline">
      ${slots.map(slot => timelineItem(slot, state)).join('')}
    </div>
  `;

  if (state.isAdmin) {
    list.querySelectorAll('[data-edit-slot]').forEach(btn => {
      const id   = btn.dataset.editSlot;
      const slot = slots.find(s => s.id === id);
      btn.addEventListener('click', () => showSlotModal(slot, state, utils));
    });
    list.querySelectorAll('[data-delete-slot]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await utils.showConfirm('Delete Time Slot', 'Remove this time slot from the schedule?');
        if (!ok) return;
        try {
          await deleteDoc(doc(db, 'schedule', btn.dataset.deleteSlot));
          utils.showToast('Time slot removed.', 'success');
        } catch (err) {
          utils.showToast(err.message, 'error');
        }
      });
    });
  }
}

function timelineItem(slot, state) {
  return `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-time">${escHtml(slot.time)}</div>
      <div class="timeline-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;">
          <div>
            <h3>${escHtml(slot.title)}</h3>
            ${slot.description ? `<p>${escHtml(slot.description)}</p>` : ''}
          </div>
          ${state.isAdmin ? `
            <div class="card-actions">
              <button class="btn btn-ghost btn-sm" data-edit-slot="${slot.id}">✏️</button>
              <button class="btn btn-ghost btn-sm" data-delete-slot="${slot.id}">🗑️</button>
            </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function showSlotModal(existing, state, utils) {
  const isEdit = !!existing;
  const old = document.getElementById('slot-modal-instance');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'slot-modal-instance';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Time Slot' : 'Add Time Slot'}</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-row">
          <div class="form-group">
            <label>Display Time</label>
            <input type="text" id="slot-time" value="${escHtml(existing?.time || '')}" placeholder="e.g. 10:00 AM" required>
          </div>
          <div class="form-group">
            <label>Sort Time (24h for ordering)</label>
            <input type="time" id="slot-sort" value="${existing?.sortTime || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Title / Activity</label>
          <input type="text" id="slot-title" value="${escHtml(existing?.title || '')}" placeholder="e.g. BBQ Lunch" required>
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <textarea id="slot-desc" placeholder="Any extra details…">${escHtml(existing?.description || '')}</textarea>
        </div>
        <div id="slot-modal-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="slot-cancel">Cancel</button>
        <button class="btn btn-primary" id="slot-save">${isEdit ? 'Save Changes' : 'Add Slot'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('slot-cancel').addEventListener('click', close);

  document.getElementById('slot-save').addEventListener('click', async () => {
    const btn   = document.getElementById('slot-save');
    const errEl = document.getElementById('slot-modal-err');
    const time  = document.getElementById('slot-time').value.trim();
    const sort  = document.getElementById('slot-sort').value.trim();
    const title = document.getElementById('slot-title').value.trim();
    const desc  = document.getElementById('slot-desc').value.trim();

    if (!time || !title) {
      errEl.textContent = 'Time and title are required.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    try {
      const data = { time, sortTime: sort || time, title, description: desc };
      if (isEdit) {
        await updateDoc(doc(db, 'schedule', existing.id), data);
        utils.showToast('Time slot updated!', 'success');
      } else {
        await addDoc(collection(db, 'schedule'), { ...data, createdAt: serverTimestamp() });
        utils.showToast('Time slot added!', 'success');
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

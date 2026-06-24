import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const POLL_DATES = [
  'Saturday, August 15, 2026',
  'Saturday, August 22, 2026',
  'Saturday, August 29, 2026',
  'Saturday, September 5, 2026',
  'Saturday, September 12, 2026',
  'Saturday, September 19, 2026',
  'Saturday, September 26, 2026',
];

// Called from announcements.js init — no await needed, loads asynchronously.
export async function initPoll(wrap, state, utils) {
  wrap.innerHTML = `
    <div class="poll-card">
      <h2 class="poll-card-title">📅 Which Saturday works for you?</h2>
      <p class="poll-card-sub">Select all dates you're available — we'll find the best fit for the block!</p>
      <div class="poll-loading loading"><div class="spinner"></div><span>Loading…</span></div>
      <div class="poll-body" hidden></div>
    </div>
  `;

  const loadingEl = wrap.querySelector('.poll-loading');
  const bodyEl    = wrap.querySelector('.poll-body');

  let savedDates = [];
  let hasVoted   = false;

  try {
    const snap = await getDoc(doc(db, 'poll', state.user.uid));
    if (snap.exists()) {
      savedDates = snap.data().dates || [];
      hasVoted   = true;
    }
  } catch { /* first vote or transient error — show empty form */ }

  loadingEl.hidden = true;
  bodyEl.hidden    = false;

  if (hasVoted) {
    _showConfirm(bodyEl, state, utils, savedDates);
  } else {
    _showForm(bodyEl, state, utils, [], false);
  }
}

function _showConfirm(bodyEl, state, utils, savedDates) {
  bodyEl.innerHTML = `
    <div class="poll-confirmed">✅ Thanks! Your availability has been recorded.</div>
    <button class="btn btn-ghost btn-sm poll-edit-btn" style="margin-top:.65rem;">Edit my response</button>
  `;
  bodyEl.querySelector('.poll-edit-btn').addEventListener('click', () => {
    _showForm(bodyEl, state, utils, savedDates, true);
  });
}

function _showForm(bodyEl, state, utils, checkedDates, hasVoted) {
  bodyEl.innerHTML = `
    <form class="poll-form">
      <div class="poll-options">
        ${POLL_DATES.map((date, i) => `
          <label class="poll-option" for="pd-${i}">
            <input type="checkbox" id="pd-${i}" name="pd" value="${date}"
              ${checkedDates.includes(date) ? 'checked' : ''}>
            <span class="poll-checkbox" aria-hidden="true"></span>
            <span class="poll-option-text">${date}</span>
          </label>
        `).join('')}
      </div>
      <div class="poll-actions">
        <button type="submit" class="btn btn-primary poll-submit-btn">
          ${hasVoted ? 'Update My Response' : 'Submit Availability'}
        </button>
        ${hasVoted
          ? `<button type="button" class="btn btn-ghost btn-sm poll-cancel-btn">Cancel</button>`
          : ''}
      </div>
    </form>
  `;

  if (hasVoted) {
    bodyEl.querySelector('.poll-cancel-btn').addEventListener('click', () => {
      _showConfirm(bodyEl, state, utils, checkedDates);
    });
  }

  bodyEl.querySelector('.poll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selected = [...bodyEl.querySelectorAll('input[name="pd"]:checked')].map(cb => cb.value);
    const btn = bodyEl.querySelector('.poll-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';
    try {
      await setDoc(doc(db, 'poll', state.user.uid), {
        uid:         state.user.uid,
        displayName: state.userDoc.displayName,
        dates:       selected,
        updatedAt:   serverTimestamp()
      });
      utils.showToast('Availability saved!', 'success');
      _showConfirm(bodyEl, state, utils, selected);
    } catch (err) {
      btn.disabled    = false;
      btn.textContent = hasVoted ? 'Update My Response' : 'Submit Availability';
      utils.showToast(err.message, 'error');
    }
  });
}

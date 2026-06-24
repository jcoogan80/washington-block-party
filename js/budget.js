import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, addDoc, updateDoc, getDocs, onSnapshot,
  collection, query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml } from './app.js';

// ── Module state ──────────────────────────────────────────────────────────────
let _pricing        = { adultPrice: 20, kidPrice: 15, guestPrice: 10 };
let _pricingUnsub   = null;
let _myExpUnsub     = null;
let _adminDuesUnsub = null;
let _adminExpUnsub  = null;
let _allDues        = [];
let _allExp         = [];
let _duesSort       = { col: 'name', dir: 'asc' };
let _expSort        = { col: 'date', dir: 'desc' };

// ── Entry point ───────────────────────────────────────────────────────────────
export function init(container, state, utils) {
  // Cancel any listeners left over from a previous session
  [_pricingUnsub, _myExpUnsub, _adminDuesUnsub, _adminExpUnsub].forEach(u => u?.());
  _pricingUnsub = _myExpUnsub = _adminDuesUnsub = _adminExpUnsub = null;

  container.innerHTML = `
    <div class="budget-wrap">
      <div class="section-header">
        <h2>💰 Budget</h2>
        ${state.isAdmin ? `<button class="btn btn-outline btn-sm" id="edit-prices-btn">✏️ Edit Prices</button>` : ''}
      </div>
      ${state.isAdmin ? `<div id="budget-admin" class="budget-admin-section"></div>` : ''}
      <div id="budget-household"></div>
      <div id="budget-expenses"></div>
    </div>
  `;

  // Real-time pricing — keeps household total in sync if admin changes prices
  _pricingUnsub = onSnapshot(doc(db, 'settings', 'pricing'), (snap) => {
    if (snap.exists()) {
      _pricing = { adultPrice: 20, kidPrice: 15, guestPrice: 10, ...snap.data() };
    }
    recalcHouseholdTotal();
  });

  if (state.isAdmin) {
    container.querySelector('#edit-prices-btn').addEventListener('click', () => {
      showEditPricesModal(utils);
    });
    initAdminDashboard(container.querySelector('#budget-admin'), state, utils);
  }

  initHousehold(container.querySelector('#budget-household'), state, utils);
  initExpenses(container.querySelector('#budget-expenses'), state, utils);
}

// ── Pricing modal (admin only) ────────────────────────────────────────────────

function recalcHouseholdTotal() {
  const adults = parseNum(document.getElementById('hh-adults')?.value);
  const kids   = parseNum(document.getElementById('hh-kids')?.value);
  const guests = parseNum(document.getElementById('hh-guests')?.value);
  const el = document.getElementById('hh-total');
  if (!el) return;
  el.textContent = `$${adults * _pricing.adultPrice + kids * _pricing.kidPrice + guests * _pricing.guestPrice}`;
}

function showEditPricesModal(utils) {
  const old = document.getElementById('edit-prices-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'edit-prices-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box modal-sm">
      <div class="modal-header">
        <h3>✏️ Edit Prices</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-row">
          <div class="form-group">
            <label>Adult ($)</label>
            <input type="number" id="price-adult" min="0" value="${_pricing.adultPrice}">
          </div>
          <div class="form-group">
            <label>Child ($)</label>
            <input type="number" id="price-kid" min="0" value="${_pricing.kidPrice}">
          </div>
          <div class="form-group">
            <label>Guest ($)</label>
            <input type="number" id="price-guest" min="0" value="${_pricing.guestPrice}">
          </div>
        </div>
        <div id="price-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="price-cancel">Cancel</button>
        <button class="btn btn-primary" id="price-save">Save Prices</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('price-cancel').addEventListener('click', close);

  document.getElementById('price-save').addEventListener('click', async () => {
    const btn        = document.getElementById('price-save');
    const errEl      = document.getElementById('price-err');
    const adultPrice = parseFloat(document.getElementById('price-adult').value);
    const kidPrice   = parseFloat(document.getElementById('price-kid').value);
    const guestPrice = parseFloat(document.getElementById('price-guest').value);

    if ([adultPrice, kidPrice, guestPrice].some(isNaN)) {
      errEl.textContent = 'All prices must be valid numbers.';
      errEl.hidden = false;
      return;
    }
    btn.disabled = true;
    try {
      await setDoc(doc(db, 'settings', 'pricing'), { adultPrice, kidPrice, guestPrice });
      utils.showToast('Prices updated!', 'success');
      close();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.hidden = false;
      btn.disabled = false;
    }
  });
}

// ── My Household ──────────────────────────────────────────────────────────────

async function initHousehold(wrap, state, utils) {
  wrap.innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;

  const [duesSnap, dirSnap] = await Promise.all([
    getDoc(doc(db, 'dues', state.user.uid)),
    getDoc(doc(db, 'directory', state.user.uid)),
  ]);

  const existing = duesSnap.exists() ? duesSnap.data() : null;
  const address  = dirSnap.exists()  ? (dirSnap.data().address || '') : '';
  const isPaid   = existing?.status === 'paid';

  wrap.innerHTML = `
    <div class="budget-card">
      <div class="budget-card-header">
        <h3>🏠 My Household</h3>
        ${existing
          ? (isPaid
            ? `<span class="budget-badge budget-badge-paid">✓ Paid</span>`
            : `<span class="budget-badge budget-badge-unpaid">Unpaid</span>`)
          : ''}
      </div>
      <p class="budget-pricing-note">
        Current pricing:
        <strong>$${_pricing.adultPrice}/adult · $${_pricing.kidPrice}/child · $${_pricing.guestPrice}/guest</strong>
      </p>
      <div class="form-row">
        <div class="form-group">
          <label>Adults</label>
          <input type="number" id="hh-adults" min="0" value="${existing?.adults ?? 0}" class="hh-input">
        </div>
        <div class="form-group">
          <label>Kids</label>
          <input type="number" id="hh-kids" min="0" value="${existing?.kids ?? 0}" class="hh-input">
        </div>
        <div class="form-group">
          <label>Guests</label>
          <input type="number" id="hh-guests" min="0" value="${existing?.guests ?? 0}" class="hh-input">
        </div>
      </div>
      <div class="hh-total-row">
        <span>Estimated Total</span>
        <span class="hh-total-amount" id="hh-total">$0</span>
      </div>
      <div id="hh-err" class="form-error" hidden></div>
      <div class="budget-card-actions">
        <button class="btn btn-primary" id="hh-save">Save</button>
      </div>
      ${!isPaid ? `
        <p class="hh-payment-note">
          💡 Payment will be marked once received by the organizer (cash, Venmo, etc.)
        </p>
      ` : ''}
    </div>
  `;

  recalcHouseholdTotal();
  wrap.querySelectorAll('.hh-input').forEach(inp => inp.addEventListener('input', recalcHouseholdTotal));

  wrap.querySelector('#hh-save').addEventListener('click', async () => {
    const btn    = wrap.querySelector('#hh-save');
    const errEl  = wrap.querySelector('#hh-err');
    const adults = parseNum(document.getElementById('hh-adults').value);
    const kids   = parseNum(document.getElementById('hh-kids').value);
    const guests = parseNum(document.getElementById('hh-guests').value);

    errEl.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const amountOwed = adults * _pricing.adultPrice + kids * _pricing.kidPrice + guests * _pricing.guestPrice;
    try {
      await setDoc(doc(db, 'dues', state.user.uid), {
        uid:         state.user.uid,
        displayName: state.userDoc?.displayName || state.user.displayName || '',
        address,
        adults,
        kids,
        guests,
        amountOwed,
        status:    existing?.status   || 'unpaid',
        paidDate:  existing?.paidDate || null,
        notes:     existing?.notes    || '',
        updatedAt: serverTimestamp(),
      });
      utils.showToast('Household info saved!', 'success');
      initHousehold(wrap, state, utils);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}

// ── My Expenses ───────────────────────────────────────────────────────────────

function initExpenses(wrap, state, utils) {
  wrap.innerHTML = `
    <div class="budget-card">
      <div class="budget-card-header">
        <h3>💸 My Expenses</h3>
        <button class="btn btn-primary btn-sm" id="log-expense-btn">+ Log Expense</button>
      </div>
      <div id="my-expenses-list">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  wrap.querySelector('#log-expense-btn').addEventListener('click', () => {
    showExpenseModal(state, utils);
  });

  if (_myExpUnsub) _myExpUnsub();
  _myExpUnsub = onSnapshot(
    query(collection(db, 'expenses'), where('submittedBy', '==', state.user.uid)),
    (snap) => {
      const expenses = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => tsMillis(b.submittedAt) - tsMillis(a.submittedAt));
      renderMyExpenses(document.getElementById('my-expenses-list'), expenses);
    }
  );
}

function renderMyExpenses(el, expenses) {
  if (!el) return;
  if (expenses.length === 0) {
    el.innerHTML = `<p class="text-muted" style="font-size:.875rem;margin-top:.25rem;">No expenses logged yet.</p>`;
    return;
  }
  el.innerHTML = `
    <div class="table-scroll">
      <table class="budget-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Activity</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(exp => `
            <tr>
              <td>${escHtml(exp.description)}</td>
              <td class="text-muted">${escHtml(exp.activityName || '—')}</td>
              <td class="budget-amount">$${Number(exp.amount || 0).toFixed(2)}</td>
              <td>${statusBadge(exp.status, 'expense')}</td>
              <td class="budget-date">${formatDate(exp.submittedAt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function showExpenseModal(state, utils) {
  const old = document.getElementById('expense-modal-inst');
  if (old) old.remove();

  let activities = [];
  try {
    const snap = await getDocs(collection(db, 'activities'));
    activities = snap.docs.map(d => d.data().name || '').filter(Boolean);
  } catch (_) {}

  const modal = document.createElement('div');
  modal.id = 'expense-modal-inst';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-box">
      <div class="modal-header">
        <h3>💸 Log an Expense</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body form-stack">
        <div class="form-group">
          <label>Description <span class="req">*</span></label>
          <input type="text" id="exp-desc" placeholder="e.g. Sno cone supplies">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount ($) <span class="req">*</span></label>
            <input type="number" id="exp-amount" min="0" step="0.01" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>Activity (optional)</label>
            <select id="exp-activity">
              <option value="">— None —</option>
              ${activities.map(a => `<option value="${escHtml(a)}">${escHtml(a)}</option>`).join('')}
              <option value="__other__">Other…</option>
            </select>
          </div>
        </div>
        <div class="form-group" id="exp-other-wrap" hidden>
          <label>Activity Name</label>
          <input type="text" id="exp-activity-other" placeholder="e.g. Sno Cone Machine">
        </div>
        <div id="exp-err" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="exp-cancel">Cancel</button>
        <button class="btn btn-primary" id="exp-save">Submit Expense</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  document.getElementById('exp-cancel').addEventListener('click', close);
  document.getElementById('exp-activity').addEventListener('change', (e) => {
    document.getElementById('exp-other-wrap').hidden = e.target.value !== '__other__';
  });

  document.getElementById('exp-save').addEventListener('click', async () => {
    const btn      = document.getElementById('exp-save');
    const errEl    = document.getElementById('exp-err');
    const desc     = document.getElementById('exp-desc').value.trim();
    const amount   = parseFloat(document.getElementById('exp-amount').value);
    const actSel   = document.getElementById('exp-activity').value;
    const actOther = document.getElementById('exp-activity-other').value.trim();
    const actName  = actSel === '__other__' ? actOther : actSel;

    errEl.hidden = true;
    if (!desc) { errEl.textContent = 'Description is required.'; errEl.hidden = false; return; }
    if (isNaN(amount) || amount <= 0) { errEl.textContent = 'Enter a valid amount greater than $0.'; errEl.hidden = false; return; }

    btn.disabled = true;
    try {
      await addDoc(collection(db, 'expenses'), {
        submittedBy:    state.user.uid,
        displayName:    state.userDoc?.displayName || state.user.displayName || '',
        activityName:   actName,
        description:    desc,
        amount,
        status:         'pending',
        submittedAt:    serverTimestamp(),
        reimbursedDate: null,
      });
      utils.showToast('Expense logged!', 'success');
      close();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.hidden = false;
      btn.disabled = false;
    }
  });
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function initAdminDashboard(wrap, state, utils) {
  wrap.innerHTML = `
    <h3 class="budget-admin-title">📊 Budget Overview</h3>
    <div id="budget-stats" class="budget-stats-grid"></div>
    <div class="budget-admin-table-section">
      <h4 class="budget-table-title">🏠 Household Dues</h4>
      <div id="budget-dues-table"></div>
    </div>
    <div class="budget-admin-table-section">
      <h4 class="budget-table-title">💸 Expense Claims</h4>
      <div id="budget-exp-table"></div>
    </div>
  `;

  if (_adminDuesUnsub) _adminDuesUnsub();
  _adminDuesUnsub = onSnapshot(collection(db, 'dues'), (snap) => {
    _allDues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshStats();
    renderDuesTable(utils);
  });

  if (_adminExpUnsub) _adminExpUnsub();
  _adminExpUnsub = onSnapshot(collection(db, 'expenses'), (snap) => {
    _allExp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshStats();
    renderExpTable(utils);
  });
}

function refreshStats() {
  const el = document.getElementById('budget-stats');
  if (!el) return;

  const totalExpected  = _allDues.reduce((s, d) => s + Number(d.amountOwed || 0), 0);
  const totalCollected = _allDues.filter(d => d.status === 'paid').reduce((s, d) => s + Number(d.amountOwed || 0), 0);
  const totalExpenses  = _allExp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalReimb     = _allExp.filter(e => e.status === 'reimbursed').reduce((s, e) => s + Number(e.amount || 0), 0);
  const netCash        = totalCollected - totalReimb;

  el.innerHTML = `
    <div class="budget-stat-card">
      <div class="budget-stat-value">$${totalExpected.toFixed(2)}</div>
      <div class="budget-stat-label">Total Expected</div>
    </div>
    <div class="budget-stat-card">
      <div class="budget-stat-value budget-stat-green">$${totalCollected.toFixed(2)}</div>
      <div class="budget-stat-label">Total Collected</div>
    </div>
    <div class="budget-stat-card">
      <div class="budget-stat-value">$${totalExpenses.toFixed(2)}</div>
      <div class="budget-stat-label">Expenses Logged</div>
    </div>
    <div class="budget-stat-card">
      <div class="budget-stat-value budget-stat-amber">$${totalReimb.toFixed(2)}</div>
      <div class="budget-stat-label">Total Reimbursed</div>
    </div>
    <div class="budget-net-card">
      <span class="budget-net-label">Net Cash on Hand</span>
      <span class="budget-net-value ${netCash >= 0 ? 'budget-stat-green' : 'budget-stat-red'}">$${netCash.toFixed(2)}</span>
    </div>
  `;
}

// ── Dues table ────────────────────────────────────────────────────────────────

function renderDuesTable(utils) {
  const el = document.getElementById('budget-dues-table');
  if (!el) return;

  if (_allDues.length === 0) {
    el.innerHTML = `<p class="text-muted" style="font-size:.875rem;">No households have submitted dues yet.</p>`;
    return;
  }

  const sorted = sortedArray(_allDues, _duesSort.col, _duesSort.dir, duesVal);

  el.innerHTML = `
    <div class="table-scroll">
      <table class="budget-table">
        <thead>
          <tr>
            ${thCell('name',    'Name',    _duesSort)}
            ${thCell('address', 'Address', _duesSort)}
            ${thCell('adults',  'Adults',  _duesSort)}
            ${thCell('kids',    'Kids',    _duesSort)}
            ${thCell('guests',  'Guests',  _duesSort)}
            ${thCell('amount',  'Amount',  _duesSort)}
            ${thCell('status',  'Status',  _duesSort)}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(d => `
            <tr>
              <td><strong>${escHtml(d.displayName || '—')}</strong></td>
              <td class="text-muted">${escHtml(d.address || '—')}</td>
              <td class="budget-center">${d.adults ?? 0}</td>
              <td class="budget-center">${d.kids ?? 0}</td>
              <td class="budget-center">${d.guests ?? 0}</td>
              <td class="budget-amount">$${Number(d.amountOwed || 0).toFixed(2)}</td>
              <td>${statusBadge(d.status, 'dues')}</td>
              <td>
                <button
                  class="btn btn-sm ${d.status === 'paid' ? 'btn-ghost' : 'btn-primary'}"
                  data-dues-id="${d.id}"
                  data-dues-status="${d.status || 'unpaid'}">
                  ${d.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('th[data-sort-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sortCol;
      _duesSort = { col, dir: _duesSort.col === col && _duesSort.dir === 'asc' ? 'desc' : 'asc' };
      renderDuesTable(utils);
    });
  });

  el.querySelectorAll('[data-dues-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id        = btn.dataset.duesId;
      const current   = btn.dataset.duesStatus;
      const newStatus = current === 'paid' ? 'unpaid' : 'paid';
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'dues', id), {
          status:   newStatus,
          paidDate: newStatus === 'paid' ? serverTimestamp() : null,
        });
        utils.showToast(`Marked ${newStatus}.`, 'success');
      } catch (e) {
        utils.showToast(e.message, 'error');
        btn.disabled = false;
      }
    });
  });
}

function duesVal(item, col) {
  switch (col) {
    case 'name':    return (item.displayName || '').toLowerCase();
    case 'address': return addrNum(item.address || '');
    case 'adults':  return item.adults  ?? 0;
    case 'kids':    return item.kids    ?? 0;
    case 'guests':  return item.guests  ?? 0;
    case 'amount':  return Number(item.amountOwed || 0);
    case 'status':  return item.status  || '';
    default:        return '';
  }
}

// ── Expenses table ────────────────────────────────────────────────────────────

function renderExpTable(utils) {
  const el = document.getElementById('budget-exp-table');
  if (!el) return;

  if (_allExp.length === 0) {
    el.innerHTML = `<p class="text-muted" style="font-size:.875rem;">No expenses logged yet.</p>`;
    return;
  }

  const sorted = sortedArray(_allExp, _expSort.col, _expSort.dir, expVal);

  el.innerHTML = `
    <div class="table-scroll">
      <table class="budget-table">
        <thead>
          <tr>
            ${thCell('name',     'Submitted By', _expSort)}
            ${thCell('desc',     'Description',  _expSort)}
            ${thCell('activity', 'Activity',     _expSort)}
            ${thCell('amount',   'Amount',       _expSort)}
            ${thCell('status',   'Status',       _expSort)}
            ${thCell('date',     'Date',         _expSort)}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(e => `
            <tr>
              <td><strong>${escHtml(e.displayName || '—')}</strong></td>
              <td>${escHtml(e.description || '—')}</td>
              <td class="text-muted">${escHtml(e.activityName || '—')}</td>
              <td class="budget-amount">$${Number(e.amount || 0).toFixed(2)}</td>
              <td>${statusBadge(e.status, 'expense')}</td>
              <td class="budget-date">${formatDate(e.submittedAt)}</td>
              <td>
                <button
                  class="btn btn-sm ${e.status === 'reimbursed' ? 'btn-ghost' : 'btn-primary'}"
                  data-exp-id="${e.id}"
                  data-exp-status="${e.status || 'pending'}">
                  ${e.status === 'reimbursed' ? 'Mark Pending' : 'Mark Reimbursed'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('th[data-sort-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sortCol;
      _expSort = { col, dir: _expSort.col === col && _expSort.dir === 'asc' ? 'desc' : 'asc' };
      renderExpTable(utils);
    });
  });

  el.querySelectorAll('[data-exp-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id        = btn.dataset.expId;
      const current   = btn.dataset.expStatus;
      const newStatus = current === 'reimbursed' ? 'pending' : 'reimbursed';
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'expenses', id), {
          status:         newStatus,
          reimbursedDate: newStatus === 'reimbursed' ? serverTimestamp() : null,
        });
        utils.showToast(`Marked ${newStatus}.`, 'success');
      } catch (e) {
        utils.showToast(e.message, 'error');
        btn.disabled = false;
      }
    });
  });
}

function expVal(item, col) {
  switch (col) {
    case 'name':     return (item.displayName  || '').toLowerCase();
    case 'desc':     return (item.description  || '').toLowerCase();
    case 'activity': return (item.activityName || '').toLowerCase();
    case 'amount':   return Number(item.amount || 0);
    case 'status':   return item.status || '';
    case 'date':     return tsMillis(item.submittedAt);
    default:         return '';
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function parseNum(val) {
  const n = parseInt(val || 0, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function addrNum(address) {
  const m = String(address).match(/\d+/);
  return m ? parseInt(m[0], 10) : Infinity;
}

function tsMillis(ts) {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds)  return ts.seconds * 1000;
  return new Date(ts).getTime();
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(tsMillis(ts));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status, type) {
  const isPosStatus = type === 'dues' ? status === 'paid' : status === 'reimbursed';
  const posLabel    = type === 'dues' ? '✓ Paid' : '✓ Reimbursed';
  const negLabel    = type === 'dues' ? 'Unpaid' : 'Pending';
  return isPosStatus
    ? `<span class="budget-badge budget-badge-paid">${posLabel}</span>`
    : `<span class="budget-badge budget-badge-unpaid">${negLabel}</span>`;
}

function thCell(col, label, sortState) {
  const active = sortState.col === col;
  const arrow  = active ? (sortState.dir === 'asc' ? ' ▲' : ' ▼') : '';
  return `<th class="sortable-th${active ? ' sort-active' : ''}" data-sort-col="${col}">${label}${arrow}</th>`;
}

function sortedArray(arr, col, dir, valFn) {
  return [...arr].sort((a, b) => {
    const va = valFn(a, col);
    const vb = valFn(b, col);
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return dir === 'asc' ? cmp : -cmp;
  });
}

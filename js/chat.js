import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml, getInitials } from './app.js';

let _unsub = null;

export function init(container, state, utils) {
  container.innerHTML = `
    <div class="section-header">
      <h2>Neighborhood Chat</h2>
    </div>
    <p class="text-muted" style="margin-bottom:1rem;">
      Real-time discussion board for all registered neighbors.
    </p>
    <div id="chat-messages"></div>
    <div class="chat-compose">
      <textarea id="chat-input" placeholder="Say something to the neighborhood…" rows="1"></textarea>
      <button class="btn btn-primary" id="chat-send-btn">Send</button>
    </div>
  `;

  const input   = container.querySelector('#chat-input');
  const sendBtn = container.querySelector('#chat-send-btn');

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  // Send on Enter (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(state, utils, input, sendBtn);
    }
  });

  sendBtn.addEventListener('click', () => sendMessage(state, utils, input, sendBtn));

  // Real-time listener — last 150 messages, ascending
  if (_unsub) _unsub();
  _unsub = onSnapshot(
    query(collection(db, 'chat'), orderBy('createdAt', 'asc'), limit(150)),
    (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderMessages(msgs, state, utils);
    }
  );
}

async function sendMessage(state, utils, input, btn) {
  const text = input.value.trim();
  if (!text || !state.user) return;

  btn.disabled = true;
  input.disabled = true;
  try {
    await addDoc(collection(db, 'chat'), {
      uid:         state.user.uid,
      displayName: state.userDoc.displayName,
      message:     text,
      createdAt:   serverTimestamp()
    });
    input.value = '';
    input.style.height = 'auto';
  } catch (err) {
    utils.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

function renderMessages(msgs, state, utils) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  if (msgs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>No messages yet. Be the first to say hello!</p>
      </div>`;
    return;
  }

  const uid = state.user?.uid;
  // Only re-render if the content actually changed (avoid scroll jump on no-op)
  const newHtml = msgs.map(msg => chatMessage(msg, uid, state.isAdmin)).join('');
  if (container.innerHTML === newHtml) return;

  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
  container.innerHTML = newHtml;

  // Auto-scroll to bottom if user was near the bottom
  if (wasAtBottom) {
    container.scrollTop = container.scrollHeight;
  }

  // Bind delete buttons
  container.querySelectorAll('[data-delete-msg]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await utils.showConfirm('Delete Message', 'Delete this message?');
      if (!ok) return;
      try {
        await deleteDoc(doc(db, 'chat', btn.dataset.deleteMsg));
        utils.showToast('Message deleted.', 'info');
      } catch (err) {
        utils.showToast(err.message, 'error');
      }
    });
  });
}

function chatMessage(msg, currentUid, isAdmin) {
  const isMe     = msg.uid === currentUid;
  const canDelete = isMe || isAdmin;
  const initials  = getInitials(msg.displayName);
  const time      = msg.createdAt
    ? new Date(msg.createdAt.toDate()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  return `
    <div class="chat-msg">
      <div class="chat-avatar" title="${escHtml(msg.displayName)}">${escHtml(initials)}</div>
      <div>
        <div class="chat-bubble ${isMe ? 'mine' : ''}">
          <div class="chat-name">
            ${escHtml(msg.displayName)}
            <span class="chat-time">${time}</span>
          </div>
          <div class="chat-text">${escHtml(msg.message)}</div>
        </div>
        ${canDelete ? `<button class="chat-delete" data-delete-msg="${msg.id}">🗑 Delete</button>` : ''}
      </div>
    </div>
  `;
}

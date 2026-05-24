// ── Firebase Configuration ───────────────────────────────────────────────────
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export const firebaseConfig = {
  apiKey:            "AIzaSyBPSLz0YETj2nJt7SeuswtH22ua2nlX6Wk",
  authDomain:        "washington-block-party.firebaseapp.com",
  projectId:         "washington-block-party",
  storageBucket:     "washington-block-party.firebasestorage.app",
  messagingSenderId: "997645295282",
  appId:             "1:997645295282:web:d23470d2c0f9a6088db3ab"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

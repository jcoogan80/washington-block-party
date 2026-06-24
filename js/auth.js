import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Public Auth Functions ────────────────────────────────────────────────────

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerUser(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  const uid = cred.user.uid;

  // Auth metadata record
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName,
    email,
    role:      'user',
    approved:  true,
    createdAt: serverTimestamp()
  });

  // Public directory entry — user can fill in address/phone later
  await setDoc(doc(db, 'directory', uid), {
    uid,
    name:    displayName,
    address: '',
    phone:   '',
    email,
    notes:   ''
  });

  return cred;
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

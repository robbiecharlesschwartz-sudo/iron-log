import { useEffect, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import { migrateSession, pruneSessions } from "./sessionUtils";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDKsl0F7_MDEYXHEH7YDUrbYOOXiRDGV_g",
  authDomain: "iron-log-718df.firebaseapp.com",
  projectId: "iron-log-718df",
  storageBucket: "iron-log-718df.firebasestorage.app",
  messagingSenderId: "432089493676",
  appId: "1:432089493676:web:1e488428143542600d6f09",
  measurementId: "G-SVHBFPQJZM"
};


export const FB_ENABLED = Boolean(FIREBASE_CONFIG.apiKey);
let _fbAuth = null, _fbDb = null;
if (FB_ENABLED) {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    _fbAuth = getAuth(app);
    _fbDb = getFirestore(app);
  } catch (e) { console.warn("Firebase init failed:", e); }
}

/* ── Firebase service functions ─────────────────────────────────────────── */
// Firestore hard-rejects `undefined` anywhere in a document. Strip it so one stray
// field can't silently fail an entire session write (and thus break sync).


export function stripUndefined(v) {
  if (v === undefined) return null;
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(stripUndefined);
  const out = {};
  for (const k of Object.keys(v)) { if (v[k] !== undefined) out[k] = stripUndefined(v[k]); }
  return out;
}


export async function fbSaveSession(uid, session) {
  if (!_fbDb || !uid) return { ok: false, error: "not signed in" };
  try { await setDoc(doc(_fbDb, "users", uid, "sessions", session.id), stripUndefined({ ...session, lastUpdatedAt: Date.now(), userId: uid })); return { ok: true }; }
  catch (e) { console.warn("fbSaveSession:", e); return { ok: false, error: String(e && e.message || e) }; }
}


export async function fbLoadSessions(uid) {
  if (!_fbDb || !uid) return [];
  // IMPORTANT: run every cloud doc through migrateSession. Firestore returns whatever
  // shape was written (possibly by an older app version, or a partially-written doc),
  // and merging a raw record into state crashes anything that reads .exercises/.sets.
  try { const snap = await getDocs(collection(_fbDb, "users", uid, "sessions")); return snap.docs.map(d => migrateSession(d.data())); } catch (e) { console.warn("fbLoadSessions:", e); return []; }
}


export async function fbDeleteSession(uid, sessionId) {
  if (!_fbDb || !uid) return { ok: false, error: "not signed in" };
  try { await deleteDoc(doc(_fbDb, "users", uid, "sessions", sessionId)); return { ok: true }; }
  catch (e) { console.warn("fbDeleteSession:", e); return { ok: false, error: String(e && e.message || e) }; }
}


export async function fbSaveData(uid, key, value) {
  if (!_fbDb || !uid) return { ok: false, error: "not signed in" };
  try { await setDoc(doc(_fbDb, "users", uid, "data", key), stripUndefined({ value, lastUpdatedAt: Date.now() })); return { ok: true }; }
  catch (e) { console.warn("fbSaveData:", key, e); return { ok: false, error: String(e && e.message || e) }; }
}


export async function fbLoadData(uid, key) {
  if (!_fbDb || !uid) return null;
  try { const snap = await getDoc(doc(_fbDb, "users", uid, "data", key)); return snap.exists() ? snap.data().value : null; } catch (e) { console.warn("fbLoadData:", key, e); return null; }
}


export function mergeSessions(local, cloud) {
  const map = {};
  for (const s of local) map[s.id] = { ...s, lastUpdatedAt: s.lastUpdatedAt || 0 };
  for (const s of cloud) { if (!map[s.id] || (s.lastUpdatedAt || 0) > (map[s.id].lastUpdatedAt || 0)) map[s.id] = s; }
  return pruneSessions(Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date)));
}

/* ── useAuth hook ──────────────────────────────────────────────────────── */


export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(FB_ENABLED);
  useEffect(() => {
    if (!_fbAuth) { setAuthLoading(false); return; }
    return onAuthStateChanged(_fbAuth, u => { setUser(u); setAuthLoading(false); });
  }, []);
  const signInGoogle = async () => { if (!_fbAuth) return; await signInWithPopup(_fbAuth, new GoogleAuthProvider()); };
  const signInEmail = async (email, pw) => { if (!_fbAuth) return; await signInWithEmailAndPassword(_fbAuth, email, pw); };
  const createAccount = async (email, pw) => { if (!_fbAuth) return; await createUserWithEmailAndPassword(_fbAuth, email, pw); };
  const logout = async () => { if (!_fbAuth) return; await signOut(_fbAuth); };
  return { user, authLoading, signInGoogle, signInEmail, createAccount, logout };
}

/* ── Backup / Restore ──────────────────────────────────────────────────── */
/* ── Excel export — last 30 days, formatted ────────────────────────────── */


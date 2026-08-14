/* ============================================================================
   IntelliLab Society — Firebase bridge
   ----------------------------------------------------------------------------
   The Firebase v12 Web SDK ships as ES modules. The rest of this site is
   written as plain classic scripts, so this file is the single bridge between
   the two: it imports what we need and hangs it on `window.FB`.

   Loaded with <script type="module">, which the browser defers automatically,
   so `window.FB` is ready before DOMContentLoaded fires and before auth.js
   decides which backend to use.

   If the config is empty, or the CDN is unreachable, or the project is
   misconfigured, this file quietly does nothing and the site falls back to
   browser-only accounts.
   ========================================================================== */

const V = '12.17.1';

function announce(ok, reason) {
  window.FB_STATUS = { ok: ok, reason: reason || '' };
  document.dispatchEvent(new CustomEvent('firebase:status', { detail: window.FB_STATUS }));
}

if (!window.FIREBASE_READY) {
  announce(false, 'Firebase config is empty — using browser-only accounts.');
} else {
  try {
    const { initializeApp } =
      await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);

    const {
      getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence,
      createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
      onAuthStateChanged, updateProfile, deleteUser, sendPasswordResetEmail
    } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);

    const {
      getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
      collection, addDoc, getDocs, query, orderBy, serverTimestamp
    } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

    const app  = initializeApp(window.FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db   = getFirestore(app);

    window.FB = {
      auth, db,
      setPersistence, browserLocalPersistence, browserSessionPersistence,
      createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
      onAuthStateChanged, updateProfile, deleteUser, sendPasswordResetEmail,
      doc, setDoc, getDoc, updateDoc, deleteDoc,
      collection, addDoc, getDocs, query, orderBy, serverTimestamp
    };

    announce(true, 'Connected to Firebase project "' + window.FIREBASE_CONFIG.projectId + '".');
  } catch (err) {
    console.warn('[IntelliLab] Firebase unavailable, falling back to browser-only accounts.', err);
    announce(false, 'Could not reach Firebase (' + (err && err.message ? err.message : 'unknown error') + ').');
  }
}

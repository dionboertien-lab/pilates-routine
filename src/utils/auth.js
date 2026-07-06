import { auth } from './firebase.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

// Detect if running inside Capacitor (native app)
function isNativeApp() {
  return window.Capacitor !== undefined;
}

export function subscribeToAuth(callback) {
  // Check for redirect result on app load (for native flow)
  getRedirectResult(auth).catch(() => {});
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function loginWithGoogle() {
  try {
    if (isNativeApp()) {
      // In native app, use redirect (popups don't work in WebView)
      await signInWithRedirect(auth, googleProvider);
      // This won't return immediately - the app will redirect and come back
      return { user: null, error: null };
    } else {
      // On web, use popup
      const result = await signInWithPopup(auth, googleProvider);
      return { user: result.user, error: null };
    }
  } catch (error) {
    return { user: null, error: error.message };
  }
}

export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

export async function registerWithEmail(email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

export async function logout() {
  await signOut(auth);
}


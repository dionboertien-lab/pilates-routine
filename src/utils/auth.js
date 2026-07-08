import { auth } from './firebase.js';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithCredential,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Detect if running inside Capacitor (native app)
function isNativeApp() {
  return window.Capacitor !== undefined;
}

// Initialize GoogleAuth on all platforms
GoogleAuth.initialize({
  clientId: '443627015452-607m0jgju0crolb3vptrib6a0ej3jfdu.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  grantOfflineAccess: true,
});

export function subscribeToAuth(callback) {
  // Check for redirect result on app load (for native flow, if we ever fallback)
  getRedirectResult(auth).catch(() => {});
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function loginWithGoogle() {
  try {
    if (isNativeApp()) {
      // In native app, use the Capacitor Google Auth plugin
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const result = await signInWithCredential(auth, credential);
      return { user: result.user, error: null };
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


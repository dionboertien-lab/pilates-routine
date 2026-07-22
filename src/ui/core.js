import { state } from '../state.js';
import { renderOnboarding } from './screens/onboardingScreen.js';
import { renderHome } from './screens/homeScreen.js';
import { renderWorkout } from './screens/workoutScreen.js';
import { renderComplete } from './screens/completeScreen.js';
import { renderSettings } from './screens/settingsScreen.js';
import { renderCommunityWrapper } from './screens/communityScreen.js';
import { renderCoach } from './screens/coachScreen.js';

export const app = document.getElementById('app');

const screenCleanups = new Map();
let activeScreen = null;

export function registerScreenCleanup(screen, cleanup) {
  screenCleanups.set(screen, cleanup);
}

export function cleanupScreen(screen) {
  const cleanup = screenCleanups.get(screen);
  if (cleanup) {
    try {
      cleanup();
    } catch (e) {
      console.warn('Error during screen cleanup:', e);
    } finally {
      screenCleanups.delete(screen);
    }
  }
}

export function render() {
  if (activeScreen && activeScreen !== state.screen) {
    cleanupScreen(activeScreen);
  }
  activeScreen = state.screen;

  const doRender = () => {
    switch (state.screen) {
      case 'onboarding': renderOnboarding(); break;
      case 'home': renderHome(); break;
      case 'workout': renderWorkout(); break;
      case 'complete': renderComplete(); break;
      case 'settings': renderSettings(); break;
      case 'community': renderCommunityWrapper(); break;
      case 'coach': renderCoach(); break;
    }
  };

  doRender();
}

export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function activateDialogAccessibility(overlay, dialog) {
  const previousFocus = document.activeElement;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const focusable = dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  setTimeout(() => first?.focus(), 50);

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Tab' && focusable.length > 0) {
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  function close() {
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    previousFocus?.focus?.();
  }

  document.addEventListener('keydown', handleKeydown);
  return close;
}

export function showDialog(title, message, confirmText, cancelText, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog">
      <h3 class="dialog__title">${title}</h3>
      <p class="dialog__message">${message}</p>
      <div class="dialog__buttons">
        ${cancelText ? `<button class="dialog__btn dialog__btn--cancel" id="dialog-cancel">${cancelText}</button>` : ''}
        <button class="dialog__btn dialog__btn--confirm" id="dialog-confirm">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const dialog = overlay.querySelector('.dialog');
  const closeDialog = activateDialogAccessibility(overlay, dialog);

  if (cancelText) {
    document.getElementById('dialog-cancel').addEventListener('click', () => closeDialog());
  }
  document.getElementById('dialog-confirm').addEventListener('click', () => { closeDialog(); if (onConfirm) onConfirm(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
}

export function showPrompt(title, message, confirmText, cancelText, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog">
      <h3 class="dialog__title">${title}</h3>
      <p class="dialog__message">${message}</p>
      <input type="text" class="settings__input" id="dialog-input" placeholder="Groepsnaam..." style="margin-bottom: var(--space-md); width: 100%; box-sizing: border-box;" autofocus />
      <div class="dialog__buttons">
        ${cancelText ? `<button class="dialog__btn dialog__btn--cancel" id="dialog-cancel">${cancelText}</button>` : ''}
        <button class="dialog__btn dialog__btn--confirm" id="dialog-confirm">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const input = document.getElementById('dialog-input');
  const dialog = overlay.querySelector('.dialog');
  const closeDialog = activateDialogAccessibility(overlay, dialog);
  
  if (cancelText) {
    document.getElementById('dialog-cancel').addEventListener('click', () => closeDialog());
  }
  
  document.getElementById('dialog-confirm').addEventListener('click', () => { 
    const val = input.value;
    closeDialog(); 
    if (onConfirm) onConfirm(val); 
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value;
      closeDialog(); 
      if (onConfirm) onConfirm(val);
    }
  });
  
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
}
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerText = message;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  document.body.appendChild(toast);
  
  // Force reflow for transition
  toast.getBoundingClientRect();
  toast.classList.add('toast--visible');
  
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
export function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {
    // AudioContext might be blocked or unsupported, fail silently
  }
}

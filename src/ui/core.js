import { state } from '../state.js';
import { renderOnboarding } from './screens/onboardingScreen.js';
import { renderHome } from './screens/homeScreen.js';
import { renderWorkout } from './screens/workoutScreen.js';
import { renderComplete } from './screens/completeScreen.js';
import { renderSettings } from './screens/settingsScreen.js';
import { renderCommunityWrapper } from './screens/communityScreen.js';

export const app = document.getElementById('app');

export function render() {
  const doRender = () => {
    switch (state.screen) {
      case 'onboarding': renderOnboarding(); break;
      case 'home': renderHome(); break;
      case 'workout': renderWorkout(); break;
      case 'complete': renderComplete(); break;
      case 'settings': renderSettings(); break;
      case 'community': renderCommunityWrapper(); break;
    }
  };

  if (!document.startViewTransition) {
    doRender();
  } else {
    document.startViewTransition(() => {
      doRender();
    });
  }
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
  if (cancelText) {
    document.getElementById('dialog-cancel').addEventListener('click', () => overlay.remove());
  }
  document.getElementById('dialog-confirm').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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
  input.focus();
  
  if (cancelText) {
    document.getElementById('dialog-cancel').addEventListener('click', () => overlay.remove());
  }
  
  document.getElementById('dialog-confirm').addEventListener('click', () => { 
    const val = input.value;
    overlay.remove(); 
    onConfirm(val); 
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value;
      overlay.remove(); 
      onConfirm(val);
    }
  });
  
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerText = message;
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

# Pilates Routine — Volledige Broncode voor ChatGPT Review

Dit document bevat de complete broncode van de Pilates Routine web-app.

## Bestand: package.json
```json
{
  "name": "pilates-routine",
  "private": true,
  "version": "1.2.2",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^8.4.1",
    "typescript": "~6.0.2",
    "vite": "^8.1.1",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "@capacitor-community/bluetooth-le": "^8.2.0",
    "@capacitor/android": "^8.4.1",
    "@capacitor/app": "^8.1.0",
    "@capacitor/core": "^8.4.1",
    "@capacitor/ios": "^8.4.1",
    "@capacitor/status-bar": "^8.0.2",
    "@codetrix-studio/capacitor-google-auth": "^3.4.0-rc.4",
    "@mlc-ai/web-llm": "^0.2.84",
    "canvas-confetti": "^1.9.4",
    "firebase": "^12.15.0"
  }
}

```

## Bestand: firestore.rules
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      // Users can only update their own documents. We prevent totalWorkouts from decreasing (XR.2, XR.8 protection) and enforce string constraints.
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && (resource == null || !('totalWorkouts' in request.resource.data) || !('totalWorkouts' in resource.data) || request.resource.data.totalWorkouts >= resource.data.totalWorkouts)
                   && (!('name' in request.resource.data) || (request.resource.data.name is string && request.resource.data.name.size() <= 50));
                   
      match /chats/{chatId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    match /communities/{communityId} {
      allow read: if request.auth != null;
      // Ensure ownerId is the creator and name is validated (XR.2)
      allow create: if request.auth != null 
                    && request.resource.data.ownerId == request.auth.uid
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 50;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
  }
}

```

## Bestand: src/main.js
```js
import './style.css';
import { state } from './state.js';
import { render } from './ui/core.js';
import { isOnboardingComplete, getProfile, getTotalCompleted, getCurrentWeek, getMissedWorkouts } from './utils/storage.js';
import { subscribeToAuth } from './utils/auth.js';
import { getLeaderboard, getUserCommunities, initializeSocialUser, joinCommunity } from './utils/social.js';
import { StatusBar, Style } from '@capacitor/status-bar';

// Setup auth listener
subscribeToAuth(async (user) => {
  state.currentUser = user;
  state.authLoading = false;
  if (user) {
    const profile = getProfile() || {};
    await initializeSocialUser(profile, getTotalCompleted(), getCurrentWeek(), getMissedWorkouts());
    
    const pendingInvite = localStorage.getItem('pilates_pending_invite');
    if (pendingInvite) {
      try {
        await joinCommunity(pendingInvite);
        localStorage.removeItem('pilates_pending_invite');
        state.activeCommunity = pendingInvite;
        const { showToast } = await import('./ui/core.js');
        showToast(`Lid geworden van groep ${pendingInvite}!`, 'success');
      } catch (e) {
        console.warn('Could not join community from invite:', e);
      }
    }

    if (state.screen === 'community') {
      state.loadingLeaderboard = true;
      render();
      state.myCommunities = await getUserCommunities();
      state.leaderboard = await getLeaderboard(state.activeCommunity);
      state.loadingLeaderboard = false;
      render();
    }
  } else if (state.screen === 'community') {
    render();
  }
});

// Parse invite code from URL on boot
const urlParams = new URLSearchParams(window.location.search);
const inviteCode = urlParams.get('invite');
if (inviteCode) {
  localStorage.setItem('pilates_pending_invite', inviteCode);
  // Optional: clear URL
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Initial boot

export async function applyTheme() {
  const profile = getProfile();
  let theme = profile ? profile.theme : 'auto';

  if (!theme || theme === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1A1C19' });
    } catch (e) {
      console.warn('StatusBar not available', e);
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#F7F2EA' });
    } catch (e) {
      console.warn('StatusBar not available', e);
    }
  }
}

// Watch for system theme changes if set to auto
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const profile = getProfile();
  if (!profile || !profile.theme || profile.theme === 'auto') {
    applyTheme();
  }
});

applyTheme();

if (isOnboardingComplete()) {
  state.screen = 'home';
} else {
  state.screen = 'onboarding';
  state.onboardingStep = 0;
}
render();

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

import { App as CapacitorApp } from '@capacitor/app';
import { disconnectHeartRateMonitor } from './utils/bluetooth.js';

CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (state.screen === 'home') {
    CapacitorApp.exitApp();
  } else if (state.screen === 'onboarding') {
    if (state.onboardingStep > 0) {
      state.onboardingStep--;
      render();
    } else {
      CapacitorApp.exitApp();
    }
  } else {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    if (state.trackerInterval) {
      clearInterval(state.trackerInterval);
      state.trackerInterval = null;
    }
    if (state.bluetoothDeviceId) {
      disconnectHeartRateMonitor(state.bluetoothDeviceId);
      state.bluetoothDeviceId = null;
    }
    state.screen = 'home';
    render();
  }
});

```

## Bestand: src/state.js
```js
export const state = {
  screen: 'home', 
  onboardingStep: 0,
  onboardingData: { name: '', gender: 'female', goals: [], dailyMinutes: 15, daysPerWeek: 6, startDate: '' },
  workoutSteps: [],
  currentStepIndex: 0,
  showingSectionIntro: false,
  currentSectionId: null,
  todayFocus: null,
  timerInterval: null,
  timerRunning: false,
  timerRemaining: 0,
  timerTotal: 0,
  repsRemaining: 0,
  repsTotal: 0,
  comboPhase: 'reps',
  exerciseComplete: false,
  skippedCount: 0,
  // Social/Auth State
  currentUser: null,
  authLoading: true,
  leaderboard: [],
  loadingLeaderboard: false,
  myCommunities: [],
  activeCommunity: 'global',
};

```

## Bestand: src/style.css
```css
/* ═══════════════════════════════════════════════════════════
   PILATES ROUTINE — Design System & Styles
   Inspired by the original exercise sheet's warm, feminine aesthetic
   ═══════════════════════════════════════════════════════════ */

/* ─── CSS Custom Properties ─── */
:root {
  --bg-primary: #F7F2EA;
  --bg-secondary: #EDE7DC;
  --bg-card: #FFFFFF;
  --bg-glass: rgba(255, 255, 255, 0.6);

  --sage: #8B9E7C;
  --sage-light: #A8C09A;
  --sage-dark: #6B7E5C;
  --sage-bg: #E8EFE3;

  --rose: #D4A0A0;
  --rose-light: #E8C4C4;
  --rose-dark: #B07070;
  --rose-bg: #F5E8E8;

  --sand: #C4A882;
  --sand-light: #DCC9AE;
  --sand-bg: #F0E8DC;

  --lavender: #B8A9C9;
  --lavender-bg: #EDE8F3;

  --sky: #9DB4C0;

  --gold: #FFD700;
  --silver: #C0C0C0;
  --bronze: #CD7F32;

  --text-primary: #3D4A3A;
  --text-secondary: #6B7B65;
  --text-muted: #9EA89A;
  --text-on-dark: #F7F2EA;

  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(61, 74, 58, 0.06);
  --shadow-md: 0 4px 12px rgba(61, 74, 58, 0.08);
  --shadow-lg: 0 8px 30px rgba(61, 74, 58, 0.12);
  --shadow-glow-sage: 0 0 20px rgba(139, 158, 124, 0.3);
  --shadow-glow-sage-strong: 0 0 30px rgba(139, 158, 124, 0.4), 0 0 60px rgba(139, 158, 124, 0.15);

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --transition-fast: 150ms var(--ease-out);
  --transition-normal: 300ms var(--ease-out);

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

:root[data-theme="dark"] {
  --bg-primary: #1A1C19;
  --bg-secondary: #242722;
  --bg-card: #2D312A;
  --bg-glass: rgba(45, 49, 42, 0.65);

  --sage: #A8C09A;
  --sage-light: #6B7E5C;
  --sage-dark: #C4D9B8;
  --sage-bg: #2B3822;

  --rose: #E8C4C4;
  --rose-light: #B07070;
  --rose-dark: #F5DADA;
  --rose-bg: #3D2323;

  --sand: #DCC9AE;
  --sand-light: #A58B68;
  --sand-bg: #382B1A;

  --lavender: #C8BBD6;
  --lavender-bg: #31263F;

  --sky: #ACC5D1;

  --text-primary: #E8EBE6;
  --text-secondary: #A0A89C;
  --text-muted: #757D71;
  --text-on-dark: #1A1C19;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.6);
  --shadow-glow-sage: 0 0 20px rgba(168, 192, 154, 0.15);
  --shadow-glow-sage-strong: 0 0 30px rgba(168, 192, 154, 0.25), 0 0 60px rgba(168, 192, 154, 0.1);
}

/* Dark mode: subtle radial gradient background */
[data-theme="dark"] body {
  background: radial-gradient(ellipse at 50% 0%, #252A22 0%, #1A1C19 60%);
}

[data-theme="dark"] .home__start-btn {
  box-shadow: var(--shadow-lg), 0 0 25px rgba(168, 192, 154, 0.2);
}

[data-theme="dark"] .interaction__fill {
  filter: drop-shadow(0 0 6px rgba(168, 192, 154, 0.4));
}

[data-theme="dark"] .calendar__cell--completed {
  box-shadow: 0 0 8px rgba(168, 192, 154, 0.15);
}

[data-theme="dark"] .home__stat-card {
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(168, 192, 154, 0.08);
}

/* ─── Reset & Base ─── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 16px; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
body {
  font-family: var(--font-body);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  line-height: 1.5;
  min-height: 100dvh;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}
#app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}
button {
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  font-size: inherit;
  -webkit-tap-highlight-color: transparent;
}
input, select {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--text-primary);
}
img { max-width: 100%; height: auto; display: block; }

/* ─── Screen Transitions ─── */
.screen {
  flex: 1;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: calc(var(--safe-top) + var(--space-xl)) var(--space-lg) calc(var(--safe-bottom) + var(--space-2xl));
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 100dvh;
  animation: fadeSlideIn 0.45s var(--ease-out) both;
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ═══════════════════════════════════════
   ONBOARDING
   ═══════════════════════════════════════ */
.onboarding {
  display: flex;
  flex-direction: column;
  max-width: 420px;
  margin: 0 auto;
  min-height: 100dvh;
}

.onboarding__progress {
  margin-bottom: var(--space-lg);
  height: 6px;
  background: var(--bg-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.onboarding__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--sage-light), var(--sage), var(--sage-dark));
  border-radius: var(--radius-full);
  transition: width 0.6s var(--ease-out);
  position: relative;
  box-shadow: 0 0 12px rgba(139, 158, 124, 0.4);
}

.onboarding__progress-track {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.onboarding__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sage-light), var(--sage));
  border-radius: var(--radius-full);
  transition: width 0.5s var(--ease-out);
}

.onboarding__progress-text {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

.onboarding__step-indicator {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: var(--space-md);
  letter-spacing: 0.05em;
}

.onboarding__step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-xl) 0;
  animation: fadeSlideIn 0.4s var(--ease-out) both;
}

.onboarding__emoji {
  font-size: 3rem;
  margin-bottom: var(--space-lg);
}

.onboarding__title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.onboarding__subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
  max-width: 300px;
}

.onboarding__field {
  width: 100%;
  max-width: 300px;
}

.onboarding__label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.onboarding__input {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 1.1rem;
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
}

.onboarding__input:focus {
  border-color: var(--sage);
}

.onboarding__date-input {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  font-size: 1.1rem;
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
  -webkit-appearance: none;
}

.onboarding__date-input:focus {
  border-color: var(--sage);
}

.onboarding__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  max-width: 320px;
}

.onboarding__option {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  transition: all 0.2s var(--ease-spring);
  text-align: left;
}

.onboarding__option--selected {
  border-color: var(--sage);
  background: var(--sage-bg);
  box-shadow: 0 0 12px rgba(139, 158, 124, 0.15);
  transform: scale(1.02);
}

.onboarding__option:active {
  transform: scale(0.95);
}

.onboarding__option-emoji {
  font-size: 1.5rem;
}

.onboarding__option-label {
  font-weight: 500;
  font-size: 0.95rem;
}

.onboarding__section {
  width: 100%;
  max-width: 320px;
  margin-bottom: var(--space-lg);
  text-align: left;
}

.onboarding__section-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.onboarding__chip-group {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.onboarding__chip {
  padding: var(--space-sm) var(--space-lg);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-full);
  background: var(--bg-card);
  font-weight: 500;
  font-size: 0.9rem;
  transition: all var(--transition-fast);
}

.onboarding__chip--selected {
  border-color: var(--sage);
  background: var(--sage-bg);
  color: var(--sage-dark);
}

.onboarding__chip:active {
  transform: scale(0.95);
}

.onboarding__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg) 0;
  margin-top: auto;
}

.onboarding__btn {
  padding: var(--space-md) var(--space-xl);
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: var(--shadow-md), var(--shadow-glow-sage);
  transition: all 0.2s var(--ease-spring);
}

.onboarding__btn:disabled {
  opacity: 0.4;
  box-shadow: var(--shadow-sm);
}

.onboarding__btn:active:not(:disabled) {
  transform: scale(0.93);
}

.onboarding__btn--secondary {
  background: none;
  color: var(--text-muted);
  box-shadow: none;
  font-size: 0.9rem;
  padding: var(--space-sm) var(--space-md);
}

.onboarding__btn--secondary:active {
  transform: scale(0.95);
}

.onboarding__back-btn {
  font-size: 0.9rem;
  color: var(--text-muted);
  padding: var(--space-sm) var(--space-md);
}

.onboarding__next-btn {
  padding: var(--space-md) var(--space-xl);
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
}

.onboarding__next-btn:active {
  transform: scale(0.95);
}

.onboarding__group {
  margin-bottom: var(--space-md);
}

/* ═══════════════════════════════════════
   HOME SCREEN
   ═══════════════════════════════════════ */
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  max-width: 420px;
  margin: 0 auto;
}

.home__header {
  text-align: center;
  width: 100%;
  padding: var(--space-lg) var(--space-lg) var(--space-xl);
  margin: calc(-1 * var(--space-xl)) calc(-1 * var(--space-lg)) 0;
  background: linear-gradient(160deg, rgba(139, 158, 124, 0.08) 0%, rgba(212, 160, 160, 0.05) 50%, transparent 100%);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  position: relative;
}

.home__header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--sage-bg), transparent);
}

.home__top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.home__leaf {
  font-size: 1.5rem;
}

.home__actions {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.home__action-btn {
  font-size: 1.8rem;
  padding: var(--space-xs);
  opacity: 0.7;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.home__action-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.home__action-btn:active {
  transform: scale(0.95);
}

.home__title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.home__subtitle {
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: var(--sage);
  font-weight: 400;
  font-style: italic;
  margin-top: var(--space-xs);
}

.home__meta {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
  margin-top: var(--space-md);
}

.home__meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.home__meta-value {
  font-weight: 600;
  font-size: 0.85rem;
}

.home__meta-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ─── Today's Focus ─── */
.home__today-focus {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  width: 100%;
  box-shadow: var(--shadow-sm);
  border-left: 3px solid var(--sage);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.home__today-focus:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.home__today-emoji {
  font-size: 1.8rem;
}

.home__today-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.home__today-value {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
}

/* ─── Start Button ─── */
.home__start-btn {
  width: 100%;
  padding: var(--space-lg) var(--space-xl);
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
  border-radius: var(--radius-lg);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: var(--shadow-lg), var(--shadow-glow-sage);
  transition: transform 0.2s var(--ease-spring), box-shadow var(--transition-fast);
  position: relative;
  overflow: hidden;
  animation: pulseGlow 3s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: var(--shadow-lg), var(--shadow-glow-sage); }
  50% { box-shadow: var(--shadow-lg), var(--shadow-glow-sage-strong); }
}

.home__start-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.home__start-btn:active { transform: scale(0.95); box-shadow: var(--shadow-md); animation: none; }

.home__start-btn--done {
  background: linear-gradient(135deg, var(--sage-light), var(--sage));
  opacity: 0.7;
  animation: none;
}
.home__start-btn--done::before { animation: none; }

.home__already-done {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: calc(-1 * var(--space-sm));
}

/* ─── Stats ─── */
.home__stats {
  display: flex;
  gap: var(--space-sm);
  width: 100%;
}

.home__stat-card {
  flex: 1;
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 158, 124, 0.1);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  animation: statCardIn 0.5s var(--ease-out) both;
}

.home__stat-card:nth-child(1) { animation-delay: 0.05s; }
.home__stat-card:nth-child(2) { animation-delay: 0.1s; }
.home__stat-card:nth-child(3) { animation-delay: 0.15s; }

@keyframes statCardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.home__stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.home__stat-number {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--sage-dark);
}

.home__stat-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ─── Home Ring (week progress) ─── */
.home__ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-xs);
}

.home__ring svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.home__ring-track {
  fill: none;
  stroke: var(--bg-secondary);
  stroke-width: 3;
}

.home__ring-fill {
  fill: none;
  stroke: var(--sage);
  stroke-width: 3;
  stroke-linecap: round;
  animation: ringDraw 1.2s var(--ease-out) 0.3s both;
}

@keyframes ringDraw {
  from { stroke-dashoffset: var(--ring-circumference); }
  to { stroke-dashoffset: var(--ring-offset); }
}

.home__ring-value {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--sage-dark);
  line-height: 1;
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: var(--surface);
  color: var(--text-main);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  font-size: 0.9rem;
  z-index: 1000;
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
  pointer-events: none;
  white-space: nowrap;
}

.toast--visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.toast--error {
  background: #ff4d4d;
  color: white;
}

.toast--success {
  background: #4caf50;
  color: white;
}

/* ─── Calendar ─── */
.calendar {
  width: 100%;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.calendar__title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: var(--space-md);
}

.calendar__header {
  display: grid;
  grid-template-columns: 70px repeat(7, 1fr);
  gap: 2px;
  margin-bottom: var(--space-sm);
}

.calendar__day-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.calendar__week-label-header {
  font-size: 0.6rem;
  color: transparent;
}

.calendar__grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.calendar__row {
  display: grid;
  grid-template-columns: 70px repeat(7, 1fr);
  gap: 3px;
  align-items: center;
}

.calendar__week-label {
  font-size: 0.62rem;
  font-weight: 500;
  color: var(--text-muted);
  padding-right: var(--space-sm);
  text-align: right;
  white-space: nowrap;
}

.calendar__row--current .calendar__week-label {
  color: var(--sage-dark);
  font-weight: 600;
}

.calendar__cell {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  background: var(--bg-secondary);
  transition: all 0.25s var(--ease-out);
  max-width: 34px;
  margin: 0 auto;
  width: 100%;
  color: var(--text-muted);
  animation: cellFadeIn 0.4s var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 25ms);
}

@keyframes cellFadeIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.calendar__cell:hover {
  transform: scale(1.15);
  box-shadow: var(--shadow-sm);
}

.calendar__cell--completed {
  background: linear-gradient(135deg, var(--sage-bg), var(--sage-light));
  color: var(--sage-dark);
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(139, 158, 124, 0.15);
}

.calendar__cell--today {
  border: 2px solid var(--sage);
  background: var(--sage-bg);
  font-weight: 700;
  color: var(--sage-dark);
  animation: cellFadeIn 0.4s var(--ease-out) both, todayPulse 2.5s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 25ms), 0s;
}

@keyframes todayPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 158, 124, 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(139, 158, 124, 0.1); }
}

.calendar__cell--future {
  opacity: 0.35;
}

.calendar__footer {
  margin-top: var(--space-md);
  display: flex;
  justify-content: center;
}

.calendar__reset-btn {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-decoration: underline;
  padding: var(--space-xs) var(--space-sm);
}

/* ─── Quote ─── */
.home__quote {
  text-align: center;
  padding: var(--space-sm);
  font-style: italic;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.6;
}

.home__quote-heart {
  color: var(--rose);
  font-style: normal;
}

/* ═══════════════════════════════════════
   SETTINGS SCREEN
   ═══════════════════════════════════════ */
.settings {
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.settings__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings__back-btn {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: var(--space-sm);
}

.settings__title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
}

.settings__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.settings__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.settings__input,
.settings__date {
  padding: var(--space-md);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  outline: none;
  transition: border-color var(--transition-fast);
}

.settings__input:focus,
.settings__date:focus {
  border-color: var(--sage);
}

.settings__goals {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.settings__row {
  display: flex;
  gap: var(--space-md);
}

.settings__group--half {
  flex: 1;
}

.settings__select {
  padding: var(--space-md);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  outline: none;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 8L1 3h10z' fill='%239EA89A'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.settings__save-btn {
  padding: var(--space-md) var(--space-lg);
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 1rem;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
}

.settings__save-btn:active { transform: scale(0.97); }

.settings__danger {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--bg-secondary);
  text-align: center;
}

.settings__reset-all-btn {
  font-size: 0.8rem;
  color: var(--rose-dark);
  padding: var(--space-sm) var(--space-md);
}

/* ═══════════════════════════════════════
   WORKOUT SCREEN
   ═══════════════════════════════════════ */
.workout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 0;
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}

.workout__progress-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
  padding: var(--space-sm) var(--space-lg);
  padding-top: calc(var(--safe-top) + var(--space-sm));
}

.workout__progress-track {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.workout__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sage-light), var(--sage));
  border-radius: var(--radius-full);
  transition: width 0.6s var(--ease-out);
}

.workout__progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-xs);
  font-size: 0.72rem;
  color: var(--text-muted);
}

.workout__quit-btn {
  font-size: 0.72rem;
  color: var(--text-muted);
  padding: var(--space-xs);
}

/* ─── Section Intro ─── */
.section-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60dvh;
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
  animation: sectionIntroIn 0.7s var(--ease-out) both;
  background: radial-gradient(ellipse at 50% 30%, var(--sage-bg) 0%, transparent 70%);
  border-radius: var(--radius-xl);
  margin: var(--space-md);
}

@keyframes sectionIntroIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.section-intro__emoji {
  font-size: 4rem;
  margin-bottom: var(--space-lg);
  animation: gentleBounce 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

@keyframes gentleBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.section-intro__name {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary), var(--sage-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-intro__duration {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.section-intro__encouragement {
  font-size: 0.95rem;
  color: var(--sage);
  font-style: italic;
  margin-top: var(--space-lg);
  opacity: 0;
  animation: fadeSlideIn 0.5s var(--ease-out) 0.4s both;
}

.section-intro__continue-btn {
  margin-top: var(--space-xl);
  padding: var(--space-md) var(--space-2xl);
  background: var(--bg-card);
  border-radius: var(--radius-full);
  font-weight: 600;
  box-shadow: var(--shadow-md);
  transition: all 0.2s var(--ease-spring);
}

.section-intro__continue-btn:active { transform: scale(0.93); }

/* ─── Exercise Card ─── */
.exercise {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-md) var(--space-lg);
  padding-bottom: var(--space-lg);
  animation: exerciseIn 0.5s var(--ease-out) both;
  border-top: 3px solid var(--section-color, var(--sage));
}

@keyframes exerciseIn {
  from { opacity: 0; transform: translateX(30px) scale(0.98); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

.exercise--exit {
  animation: exerciseOut 0.25s var(--ease-out) forwards;
}

@keyframes exerciseOut {
  to { opacity: 0; transform: translateX(-30px) scale(0.98); }
}

.exercise__badges {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  margin-bottom: var(--space-sm);
  flex-wrap: wrap;
}

.exercise__section-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 500;
}

.exercise__week-badge {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 500;
  background: var(--sand-bg);
  color: var(--sand);
}

.exercise__header { margin-bottom: var(--space-sm); }

.exercise__name {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.exercise__side-badge {
  display: inline-block;
  margin-left: var(--space-sm);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--sage-bg);
  color: var(--sage-dark);
  vertical-align: middle;
}

.exercise__instruction {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: var(--space-sm);
}

/* ─── Exercise Image ─── */
.exercise__image-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md) 0;
  min-height: 140px;
  max-height: 220px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border-radius: var(--radius-lg);
  margin: var(--space-sm) 0;
}

.exercise__image {
  max-height: 100%;
  max-width: 80%;
  object-fit: contain;
  border-radius: var(--radius-md);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.08));
}

.exercise__image-placeholder {
  width: 160px;
  height: 140px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

/* ─── Uniform Circle Interaction (reps + timer) ─── */
.interaction {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}

.interaction__circle {
  position: relative;
  width: 160px;
  height: 160px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  filter: drop-shadow(0 4px 12px rgba(139, 158, 124, 0.15));
}

.interaction__circle--timer {
  position: relative;
  width: 150px;
  height: 150px;
}

.interaction__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.interaction__track {
  fill: none;
  stroke: var(--bg-secondary);
  stroke-width: 6;
}

.interaction__fill {
  fill: none;
  stroke: var(--sage);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.4s var(--ease-out);
  filter: drop-shadow(0 0 4px rgba(139, 158, 124, 0.3));
}

.interaction__content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.interaction__value {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.interaction__unit {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.interaction__circle--pulse {
  animation: interactionPulse 0.3s var(--ease-spring);
}

@keyframes interactionPulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.92); }
  100% { transform: scale(1); }
}

.interaction__timer-btn {
  padding: var(--space-md) var(--space-2xl);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-md);
}

.interaction__timer-btn--start {
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
}

.interaction__timer-btn--pause {
  background: var(--sand-light);
  color: var(--text-primary);
}

.interaction__timer-btn:active { transform: scale(0.95); }

.interaction__hint {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ─── Hold Phase ─── */
.hold-phase {
  text-align: center;
  animation: fadeSlideIn 0.4s var(--ease-out) both;
}

.hold-phase__label {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--sand);
  margin-bottom: var(--space-md);
}

/* ─── Next / Skip Buttons ─── */
.exercise__next-btn {
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  font-weight: 600;
  box-shadow: var(--shadow-md), var(--shadow-glow-sage);
  transition: all var(--transition-fast);
  animation: fadeSlideIn 0.3s var(--ease-out) both;
  margin-top: auto;
}

.exercise__next-btn:active { transform: scale(0.97); }

.exercise__skip-btn {
  width: 100%;
  padding: var(--space-sm);
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--space-sm);
}

/* ═══════════════════════════════════════
   COMPLETION SCREEN
   ═══════════════════════════════════════ */
.complete {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
  gap: var(--space-lg);
  background: radial-gradient(ellipse at 50% 40%, var(--sage-bg) 0%, transparent 60%);
}

.complete__celebration {
  font-size: 5rem;
  animation: celebrationBounce 0.8s var(--ease-spring) both;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.1));
}

@keyframes celebrationBounce {
  0% { opacity: 0; transform: scale(0) rotate(-30deg); }
  60% { transform: scale(1.2) rotate(5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

.complete__title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--sage-dark), var(--sand));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fadeSlideIn 0.5s var(--ease-out) 0.3s both;
}

.complete__message {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 280px;
  animation: fadeSlideIn 0.5s var(--ease-out) 0.5s both;
}

.complete__stats {
  display: flex;
  gap: var(--space-md);
}

.complete__stat {
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 158, 124, 0.1);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  text-align: center;
  box-shadow: var(--shadow-sm);
  animation: statSlideUp 0.5s var(--ease-out) both;
}

.complete__stat:nth-child(1) { animation-delay: 0.6s; }
.complete__stat:nth-child(2) { animation-delay: 0.75s; }

@keyframes statSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.complete__stat-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--sage-dark);
}

.complete__stat-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.complete__home-btn {
  padding: var(--space-md) var(--space-2xl);
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  color: var(--text-on-dark);
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 1rem;
  box-shadow: var(--shadow-md), var(--shadow-glow-sage);
  transition: all 0.2s var(--ease-spring);
  margin-top: var(--space-lg);
  animation: fadeSlideIn 0.5s var(--ease-out) 0.9s both;
}

.complete__home-btn:active { transform: scale(0.93); }

.complete__quote {
  font-style: italic;
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: var(--space-lg);
  animation: fadeSlideIn 0.5s var(--ease-out) 1.1s both;
}

/* ═══════════════════════════════════════
   DIALOG
   ═══════════════════════════════════════ */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(61, 74, 58, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-lg);
  animation: overlayIn 0.2s ease both;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  max-width: 320px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: dialogIn 0.3s var(--ease-spring) both;
}

@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.dialog__title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.dialog__message {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

.dialog__buttons {
  display: flex;
  gap: var(--space-sm);
}

.dialog__btn {
  flex: 1;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.9rem;
  transition: all var(--transition-fast);
}

.dialog__btn--cancel { background: var(--bg-secondary); color: var(--text-secondary); }
.dialog__btn--confirm { background: var(--rose); color: white; }
.dialog__btn:active { transform: scale(0.95); }

/* ═══════════════════════════════════════════════════════════
   COMMUNITY SCREEN
   ═══════════════════════════════════════════════════════════ */
.community {
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.community__desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.6;
}

.community__leaderboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.community__loading,
.community__empty {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-muted);
  font-size: 0.9rem;
}

.community__user {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  gap: var(--space-md);
  transition: transform var(--transition-fast);
}

.community__user:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.community__rank {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--sage);
  width: 24px;
  text-align: center;
}

.community__user:nth-child(1) .community__rank { color: #FFD700; } /* Gold */
.community__user:nth-child(2) .community__rank { color: #C0C0C0; } /* Silver */
.community__user:nth-child(3) .community__rank { color: #CD7F32; } /* Bronze */

.community__user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.community__user-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.community__user-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.community__user-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.community__score-value {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.community__score-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.complete__community-btn {
  padding: var(--space-md) var(--space-2xl);
  background: var(--bg-card);
  color: var(--sage-dark);
  border: 2px solid var(--sage-light);
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
  margin-top: var(--space-sm);
}

.complete__community-btn:active { transform: scale(0.97); }

/* ═══════════════════════════════════════
   AUTH & COMMUNITY TABS
   ═══════════════════════════════════════ */
.auth-screen {
  max-width: 420px;
  margin: 0 auto;
}
.auth__container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-xl) 0;
}
.auth__icon { font-size: 3rem; margin-bottom: var(--space-md); }
.auth__title { font-family: var(--font-display); font-size: 1.5rem; margin-bottom: var(--space-sm); }
.auth__subtitle { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-xl); max-width: 300px; }
.auth__btn {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-full);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  transition: transform var(--transition-fast);
  margin-bottom: var(--space-md);
  box-shadow: var(--shadow-sm);
}
.auth__btn:active { transform: scale(0.97); }
.auth__btn--google { background: var(--bg-card); border: 2px solid var(--bg-secondary); }
.auth__btn--email { background: linear-gradient(135deg, var(--sage), var(--sage-dark)); color: white; border: none; }
.auth__btn--secondary { background: transparent; color: var(--text-muted); box-shadow: none; border: 2px solid transparent; }
.auth__divider { margin: var(--space-lg) 0; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; }
.auth__form { width: 100%; display: flex; flex-direction: column; gap: var(--space-sm); }
.auth__error { color: var(--rose-dark); font-size: 0.8rem; min-height: 20px; }
.auth__buttons { margin-top: var(--space-sm); }

.community__tabs {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: var(--space-sm);
  scrollbar-width: none;
}
.community__tabs::-webkit-scrollbar { display: none; }
.community__tab {
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 2px solid var(--bg-secondary);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
.community__tab--active {
  border-color: var(--sage);
  background: var(--sage-bg);
  color: var(--sage-dark);
}
.community__actions {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}
.community__action-btn {
  flex: 1;
  padding: var(--space-sm);
  background: var(--sand-bg);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 600;
  transition: transform var(--transition-fast);
}
.community__action-btn:active { transform: scale(0.95); }

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (min-width: 480px) {
  .interaction__circle,
  .interaction__circle--timer {
    width: 180px;
    height: 180px;
  }
}

@media (min-width: 768px) {
  #app {
    max-width: 480px;
    margin: 0 auto;
    box-shadow: var(--shadow-lg);
    min-height: 100vh;
  }
}

/* ═══════════════════════════════════════
   GLOBAL MICRO-INTERACTIONS
   ═══════════════════════════════════════ */
input:focus,
select:focus {
  box-shadow: 0 0 0 3px rgba(139, 158, 124, 0.15);
}

.settings__save-btn,
.complete__home-btn,
.complete__community-btn,
.section-intro__continue-btn,
.exercise__next-btn,
.auth__btn {
  transition: transform 0.2s var(--ease-spring), box-shadow var(--transition-fast);
}

/* Smooth scroll behavior */
html {
  scroll-behavior: smooth;
}

/* ─── Bottom Navigation ─── */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(139, 158, 124, 0.15);
  padding: var(--space-sm) 0 calc(env(safe-area-inset-bottom, 0px) + var(--space-sm));
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--text-muted);
  width: 60px;
  padding: var(--space-xs);
  transition: color var(--transition-fast), transform var(--transition-bounce);
}

.bottom-nav__item:active {
  transform: scale(0.92);
}

.bottom-nav__item--active {
  color: var(--sage-dark);
}

.bottom-nav__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-nav__label {
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* Adjust screens to account for bottom nav */
.screen {
  padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
}

/* ─── Biometrics Dashboard (Forma) ─── */
.home__biometrics {
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 158, 124, 0.1);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-top: var(--space-md);
  box-shadow: var(--shadow-sm);
  animation: fadeUp 0.6s var(--ease-out) 0.2s both;
}

.home__biometrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.home__biometrics-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
}

.home__biometrics-source {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sage);
  background: rgba(139, 158, 124, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.home__biometrics-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.home__bio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home__bio-val {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--sage-dark);
}

.home__bio-lbl {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.home__bio-insight {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.4);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--sage);
  line-height: 1.4;
}

[data-theme="dark"] .home__biometrics-source {
  color: var(--sage-light);
  background: rgba(163, 177, 138, 0.2);
}

[data-theme="dark"] .home__bio-insight {
  background: rgba(0, 0, 0, 0.2);
}

/* ─── Coach / Concierge Screen ─── */
.coach-screen {
  padding: var(--space-lg) var(--space-md) calc(100px + env(safe-area-inset-bottom, 0px));
}

.coach__premium-card {
  background: linear-gradient(135deg, var(--sage), var(--sage-dark));
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  color: var(--text-on-dark);
  text-align: center;
  margin-bottom: var(--space-xl);
  box-shadow: 0 10px 30px rgba(139, 158, 124, 0.3);
  position: relative;
  overflow: hidden;
}

.coach__premium-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  animation: rotatePulse 10s linear infinite;
}

.coach__premium-icon {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
}

.coach__premium-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  margin-bottom: var(--space-xs);
}

.coach__premium-desc {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-bottom: var(--space-md);
  line-height: 1.5;
}

.coach__upload-btn {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(5px);
  color: var(--text-on-dark);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: var(--space-sm) var(--space-lg);
  font-weight: 600;
  border-radius: 20px;
}

.coach__chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.coach__message {
  display: flex;
  gap: var(--space-sm);
  max-width: 85%;
  animation: fadeUp 0.4s var(--ease-out) both;
}

.coach__message:nth-child(1) { animation-delay: 0.1s; }
.coach__message:nth-child(2) { animation-delay: 0.3s; }
.coach__message:nth-child(3) { animation-delay: 0.5s; }

.coach__message--sent {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.coach__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--sage);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.coach__bubble {
  background: var(--bg-glass);
  padding: var(--space-sm) var(--space-md);
  border-radius: 16px;
  border-top-left-radius: 4px;
  font-size: 0.95rem;
  line-height: 1.4;
  box-shadow: var(--shadow-sm);
}

.coach__message--sent .coach__bubble {
  background: var(--sage);
  color: white;
  border-radius: 16px;
  border-top-right-radius: 4px;
}

.coach__input-area {
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  left: 0;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  display: flex;
  gap: var(--space-sm);
  box-sizing: border-box;
}

.coach__input {
  flex: 1;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  padding: var(--space-sm) var(--space-md);
  font-size: 0.95rem;
  color: var(--text-main);
  outline: none;
}

.coach__send-btn {
  background: var(--sage);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coach__chat {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
  padding-bottom: 80px; /* Space for input area */
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.coach__loading, .coach__typing {
  text-align: center;
  color: var(--sage);
  padding: var(--space-md);
  font-style: italic;
  font-size: 0.9rem;
  opacity: 0.7;
}

.coach__typing {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}

/* --- LIVE TRACKER --- */
.workout__live-tracker {
  background: var(--bg-glass);
  border: 1px solid var(--sage-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
  backdrop-filter: blur(10px);
}
.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}
.tracker-title {
  font-family: var(--font-accent);
  font-size: 0.9rem;
  color: var(--sage);
  letter-spacing: 1px;
}
.tracker-pulse-dot {
  width: 8px;
  height: 8px;
  background-color: var(--sage);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}
.tracker-stats {
  display: flex;
  gap: var(--space-lg);
  margin-bottom: var(--space-sm);
}
.tracker-stat {
  display: flex;
  flex-direction: column;
}
.tracker-val {
  font-family: var(--font-accent);
  font-size: 1.5rem;
  color: var(--charcoal);
  font-weight: 600;
}
.tracker-lbl {
  font-size: 0.75rem;
  color: var(--sage);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tracker-chart {
  opacity: 0.8;
}

/* --- AI ENGINE & LOCAL LLM STYLES --- */
.coach__engine-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: var(--radius-md, 12px);
  padding: 0.75rem 1rem;
  margin-bottom: 0.8rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.coach__engine-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.coach__engine-icon {
  font-size: 1.4rem;
}
.coach__engine-details {
  display: flex;
  flex-direction: column;
}
.coach__engine-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--charcoal, #2d3748);
}
.coach__engine-subtext {
  font-size: 0.75rem;
  color: var(--text-muted, #718096);
}
.coach__engine-btn {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
}

/* Download Progress Card */
.coach__download-card {
  background: linear-gradient(135deg, rgba(74, 107, 90, 0.08) 0%, rgba(200, 169, 126, 0.12) 100%);
  border: 1px solid var(--sage-light, #a3b899);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.coach__download-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}
.coach__progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0,0,0,0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}
.coach__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a6b5a, #84a98c);
  transition: width 0.3s ease;
}
.coach__download-detail {
  font-size: 0.75rem;
  color: var(--text-muted, #718096);
}

/* AI Settings Modal */
.coach__modal-content {
  max-width: 480px;
  width: 90%;
}
.coach__option-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.coach__radio-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}
.coach__radio-card:hover {
  border-color: var(--sage, #4a6b5a);
}
.coach__radio-card--selected {
  border-color: var(--sage, #4a6b5a);
  background-color: rgba(74, 107, 90, 0.05);
}
.coach__radio-content strong {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.2rem;
}
.coach__radio-content p {
  font-size: 0.8rem;
  color: var(--text-muted, #718096);
  margin: 0;
}
.coach__model-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.5rem;
}
.coach__model-card {
  padding: 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.coach__model-card:hover {
  background-color: rgba(0,0,0,0.02);
}
.coach__model-card--selected {
  border: 2px solid var(--sage, #4a6b5a);
  background-color: rgba(74, 107, 90, 0.06);
}
.coach__model-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.coach__model-tag {
  font-size: 0.7rem;
  background: var(--sage-light, #c8d6af);
  color: var(--charcoal, #2d3748);
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-weight: 600;
}
.coach__model-badge {
  font-size: 0.68rem;
  background: linear-gradient(135deg, #4a6b5a, #2c3e35);
  color: #ffffff;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-weight: 600;
  margin-right: 0.3rem;
}
.coach__model-desc {
  font-size: 0.78rem;
  color: var(--text-muted, #718096);
  margin: 0.3rem 0;
}
.coach__model-ram {
  font-size: 0.7rem;
  color: var(--sage-dark, #3b5245);
  font-weight: 500;
}

/* --- COACH PREMIUM CARD & MEDIA BUTTON --- */
.coach__premium-card {
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, var(--sage-dark, #3b5245) 0%, #1e2c25 100%);
  color: #ffffff;
  border-radius: var(--radius-lg, 16px);
  padding: 1.2rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
  gap: 0.8rem;
}
.coach__premium-icon {
  font-size: 1.8rem;
}
.coach__premium-title {
  font-family: var(--font-display, inherit);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.3rem 0;
  color: #ffffff;
}
.coach__premium-desc {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
  margin: 0;
}
.coach__upload-btn {
  align-self: flex-start;
  background: var(--gold, #d4af37);
  color: #1a241e;
  font-weight: 700;
  padding: 0.6rem 1.2rem;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.coach__input-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card, #ffffff);
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.08));
}
.coach__media-btn {
  background: rgba(74, 107, 90, 0.1);
  color: var(--sage, #4a6b5a);
  border: none;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.coach__media-btn:hover {
  background: rgba(74, 107, 90, 0.2);
  transform: scale(1.05);
}
.coach__input {
  flex: 1;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  outline: none;
}
.coach__input:focus {
  border-color: var(--sage, #4a6b5a);
}
.coach__send-btn {
  background: var(--sage, #4a6b5a);
  color: #ffffff;
  border: none;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.coach__chat {
  padding-bottom: 2rem;
}

/* ─── Accessibility & Reduced Motion ─── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}



```

## Bestand: src/data/exercises.js
```js
/**
 * Complete exercise data for the Pilates Routine.
 *
 * Sections:
 * 1. Warm-up
 * 2. Benen & Billen (+ Inner Thigh)
 * 3. Core
 * 4. Rug & Houding (NEW)
 * 5. Stretch (+ Chest Opener)
 *
 * Each exercise has a targetGender ('all', 'female', 'male').
 */

export const SECTIONS = [
  {
    id: 'warmup',
    name: 'Warm-up',
    emoji: '🌿',
    duration: '1 minuut',
    color: '#A8C09A',
  },
  {
    id: 'benen-billen',
    name: 'Benen & Billen',
    emoji: '🦵',
    duration: '6 minuten',
    color: '#D4A0A0',
  },
  {
    id: 'core',
    name: 'Core & Buik',
    emoji: '🧱',
    duration: '5 minuten',
    color: '#C4A882',
  },
  {
    id: 'rug-houding',
    name: 'Rug & Houding',
    emoji: '🧘',
    duration: '3 minuten',
    color: '#B8A9C9',
  },
  {
    id: 'stretch',
    name: 'Stretch',
    emoji: '🌸',
    duration: '2 minuten',
    color: '#9DB4C0',
  },
];

export function getWeekProgression(currentWeek, baseLevel = 1) {
  const effectiveLevel = Math.min(8, baseLevel + currentWeek - 1);
  
  const LEVELS = {
    1: { id: 'l1', label: 'Beginner', mult: 0.7 },
    2: { id: 'l2', label: 'Beginner+', mult: 0.85 },
    3: { id: 'l3', label: 'Licht Gemiddeld', mult: 1.0 },
    4: { id: 'l4', label: 'Gemiddeld', mult: 1.2 },
    5: { id: 'l5', label: 'Gemiddeld+', mult: 1.45 },
    6: { id: 'l6', label: 'Gevorderd', mult: 1.75 },
    7: { id: 'l7', label: 'Gevorderd+', mult: 2.1 },
    8: { id: 'l8', label: 'Expert', mult: 2.5 },
  };

  return LEVELS[effectiveLevel] || LEVELS[1];
}

export function applyProgression(exercise, currentWeek, baseLevel = 1) {
  const prog = getWeekProgression(currentWeek, baseLevel);
  const result = { ...exercise };

  // Don't scale warmup or stretch exercises
  const multiplier = (exercise.sectionId === 'warmup' || exercise.sectionId === 'stretch') ? 1.0 : prog.mult;

  if (result.type === 'reps' || result.type === 'combo') {
    result.reps = Math.max(1, Math.round(exercise.baseReps * multiplier));
  }
  if (result.type === 'timer' || result.type === 'combo') {
    const baseDuration = exercise.baseDuration || exercise.baseHoldDuration;
    if (result.type === 'timer') {
      // Respect maxDuration if present, otherwise use scaled duration
      const scaledDuration = Math.max(10, Math.round(baseDuration * multiplier));
      result.duration = exercise.maxDuration ? Math.min(scaledDuration, exercise.maxDuration) : scaledDuration;
    }
    if (result.type === 'combo') {
      const scaledHold = Math.max(5, Math.round((exercise.baseHoldDuration || 0) * multiplier));
      result.holdDuration = Math.min(30, scaledHold); // Healthy cap at 30 seconds
    }
  }

  result.weekLabel = prog.label;
  return result;
}

export const EXERCISES = [
  // ═══════════════════════════════════════
  // SECTION 1: WARM-UP
  // ═══════════════════════════════════════
  {
    id: 'cat-cow',
    sectionId: 'warmup',
    name: 'Cat-Cow',
    type: 'timer',
    baseDuration: 30,
    maxDuration: 45,
    perSide: false,
    image: 'cat-cow',
    targetGender: 'all',
    instruction: 'Kom op handen en knieën. Adem uit en maak je rug bol. Adem in en laat je rug hol zakken.',
  },
  {
    id: 'bekken-kantelen',
    sectionId: 'warmup',
    name: 'Bekken Kantelen',
    type: 'timer',
    baseDuration: 30,
    maxDuration: 45,
    perSide: false,
    image: 'bekken-kantelen',
    targetGender: 'all',
    instruction: 'Lig op je rug, knieën gebogen. Adem uit en kantel je bekken naar achteren (onderrug plat op de mat). Adem in en laat los.',
  },

  // ═══════════════════════════════════════
  // SECTION 2: BENEN & BILLEN
  // ═══════════════════════════════════════
  {
    id: 'glute-bridge',
    sectionId: 'benen-billen',
    name: 'Glute Bridge',
    type: 'combo',
    baseReps: 12,
    baseHoldDuration: 10,
    perSide: false,
    image: 'glute-bridge',
    targetGender: 'all',
    instruction: 'Tempo 3-1-3: Lig op je rug. Adem uit en duw heupen 3 sec omhoog. Knijp billen samen (1 sec). Laat in 3 sec zakken. Houd bovenaan de laatste rep vast.',
  },
  // Female focus
  {
    id: 'donkey-kicks',
    sectionId: 'benen-billen',
    name: 'Donkey Kicks',
    type: 'reps',
    baseReps: 10,
    perSide: true,
    sideLabel: 'been',
    image: 'donkey-kicks',
    targetGender: 'female',
    instruction: 'TUT Focus: Op handen/knieën. Adem uit, til been op (3 sec) met knie op 90 graden. Duw hiel naar plafond. Zak in 3 sec terug.',
  },
  {
    id: 'fire-hydrants',
    sectionId: 'benen-billen',
    name: 'Fire Hydrants',
    type: 'reps',
    baseReps: 10,
    perSide: true,
    sideLabel: 'been',
    image: 'fire-hydrants',
    targetGender: 'female',
    instruction: 'Tempo 3-1-3: Op handen/knieën. Adem uit, til knie zijwaarts op (3 sec). Houd vast en laat langzaam in 3 sec zakken.',
  },
  {
    id: 'inner-thigh-lift',
    sectionId: 'benen-billen',
    name: 'Inner Thigh Lift',
    type: 'reps',
    baseReps: 12,
    perSide: true,
    sideLabel: 'been',
    image: 'inner-thigh-lift',
    targetGender: 'female',
    instruction: 'Lig op je zij. Kruis je bovenste been over het onderste. Til het onderste been langzaam op.',
  },
  // Male focus (Replaces donkey kicks, fire hydrants, inner thigh)
  {
    id: 'lunges',
    sectionId: 'benen-billen',
    name: 'Lunges',
    type: 'reps',
    baseReps: 12,
    perSide: true,
    sideLabel: 'been',
    image: 'lunges',
    targetGender: 'male',
    instruction: 'Tempo 3-1-3: Adem in en stap naar voren. Zak in 3 sec door heupen. Adem uit, duw jezelf krachtig omhoog (Mind-Muscle Connection).',
  },
  {
    id: 'squats',
    sectionId: 'benen-billen',
    name: 'Bodyweight Squats',
    type: 'reps',
    baseReps: 15,
    perSide: false,
    image: 'squats',
    targetGender: 'male',
    instruction: 'Tempo 3-1-3: Voeten op schouderbreedte. Zak in 3 sec door knieën. Adem uit, span billen aan en kom gecontroleerd omhoog.',
  },
  {
    id: 'calf-raises',
    sectionId: 'benen-billen',
    name: 'Calf Raises',
    type: 'reps',
    baseReps: 20,
    perSide: false,
    image: 'calf-raises',
    targetGender: 'male',
    instruction: 'Ga rechtop staan. Duw jezelf omhoog op je tenen en laat langzaam weer zakken. Span je kuiten goed aan.',
  },
  {
    id: 'side-lying-leg-lift',
    sectionId: 'benen-billen',
    name: 'Side-Lying Leg Lift',
    type: 'reps',
    baseReps: 12,
    perSide: true,
    sideLabel: 'been',
    image: 'side-lying-leg-lift',
    targetGender: 'all',
    instruction: 'Ga op zij liggen. Til je bovenste gestrekte been langzaam op. Langzaam terug zonder neer te leggen.',
  },

  // ═══════════════════════════════════════
  // SECTION 3: CORE
  // ═══════════════════════════════════════
  {
    id: 'dead-bug',
    sectionId: 'core',
    name: 'Dead Bug',
    type: 'reps',
    baseReps: 8,
    perSide: true,
    sideLabel: 'kant',
    image: 'dead-bug',
    targetGender: 'all',
    instruction: 'TUT Focus: Lig op je rug, knieën tabletop. Strek langzaam (3 sec) arm en been. Adem uit, breng in 3 sec terug. Wissel. Houd core altijd op spanning.',
  },
  {
    id: 'forearm-plank',
    sectionId: 'core',
    name: 'Forearm Plank',
    type: 'timer',
    baseDuration: 30, // 15s beginner, 30s gemiddeld, 60s gevorderd, 120s expert
    perSide: false,
    image: 'forearm-plank',
    targetGender: 'all',
    instruction: 'Ellebogen onder je schouders. Lichaam in rechte lijn. Span buik, billen en benen aan.',
  },
  // Female focus
  {
    id: 'toe-taps',
    sectionId: 'core',
    name: 'Toe Taps',
    type: 'reps',
    baseReps: 10,
    perSide: true,
    sideLabel: 'kant',
    image: 'toe-taps',
    targetGender: 'female',
    instruction: 'TUT Focus: Lig op je rug, knieën 90 graden. Tik één voet in 3 sec naar de grond (constante buikspanning). Wissel langzaam.',
  },
  {
    id: 'the-hundred',
    sectionId: 'core',
    name: 'The Hundred',
    type: 'timer',
    baseDuration: 30,
    perSide: false,
    image: 'the-hundred',
    targetGender: 'female',
    instruction: 'Lig op je rug, benen in tabletop. Schouders iets van de grond. Pomp je armen op en neer.',
  },
  // Male focus (Replaces toe taps and the hundred)
  {
    id: 'push-ups',
    sectionId: 'core',
    name: 'Push-ups',
    type: 'reps',
    baseReps: 10,
    perSide: false,
    image: 'push-ups',
    targetGender: 'male',
    instruction: 'Plaats handen op schouderbreedte. Laat je lichaam zakken tot je borst bijna de grond raakt en duw weer op. (Op knieën mag ook).',
  },
  {
    id: 'commando-planks',
    sectionId: 'core',
    name: 'Commando Planks',
    type: 'reps',
    baseReps: 8,
    perSide: true,
    sideLabel: 'kant',
    image: 'commando-planks',
    targetGender: 'male',
    instruction: 'Start in een hoge plank. Zak één voor één naar je onderarmen. Duw jezelf één voor één weer omhoog.',
  },
  {
    id: 'side-plank',
    sectionId: 'core',
    name: 'Side Plank',
    type: 'timer',
    baseDuration: 20,
    perSide: true,
    sideLabel: 'kant',
    image: 'side-plank',
    targetGender: 'all',
    instruction: 'Steun op je onderarm. Lichaam in één rechte lijn. Span je core en bil aan.',
  },

  // ═══════════════════════════════════════
  // SECTION 4: RUG & HOUDING
  // ═══════════════════════════════════════
  {
    id: 'bird-dog',
    sectionId: 'rug-houding',
    name: 'Bird-Dog',
    type: 'reps',
    baseReps: 8,
    perSide: true,
    sideLabel: 'kant',
    image: 'bird-dog',
    targetGender: 'all',
    instruction: 'Tempo 3-1-3: Op handen/knieën. Strek langzaam (3 sec) arm naar voren, been naar achteren. Voel de contractie. Terug in 3 sec.',
  },
  {
    id: 'swimming',
    sectionId: 'rug-houding',
    name: 'Swimming',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 40,
    perSide: false,
    image: 'swimming',
    targetGender: 'all',
    instruction: 'Lig op je buik. Til afwisselend je rechterarm+linkerbeen en linkerarm+rechterbeen op.',
  },
  {
    id: 'superman-hold',
    sectionId: 'rug-houding',
    name: 'Superman Hold',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 45,
    perSide: false,
    image: 'superman-hold',
    targetGender: 'all',
    instruction: 'Lig op je buik. Adem uit en til tegelijk je armen en benen op, alsof je vliegt. Adem in en laat zakken. Houd bovenaan vast.',
  },

  // ═══════════════════════════════════════
  // SECTION 5: STRETCH
  // ═══════════════════════════════════════
  {
    id: 'childs-pose',
    sectionId: 'stretch',
    name: "Child's Pose",
    type: 'timer',
    baseDuration: 30,
    maxDuration: 45,
    perSide: false,
    image: 'childs-pose',
    targetGender: 'all',
    instruction: 'Zit op je hielen, strek je armen vooruit en laat je voorhoofd rusten.',
  },
  {
    id: 'hip-flexor-stretch',
    sectionId: 'stretch',
    name: 'Hip Flexor Stretch',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 30,
    perSide: true,
    sideLabel: 'kant',
    image: 'hip-flexor-stretch',
    targetGender: 'all',
    instruction: 'Stap één been naar achteren, zak door je voorste knie en duw je heupen licht naar voren.',
  },
  {
    id: 'chest-opener',
    sectionId: 'stretch',
    name: 'Borstopener Stretch',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 30,
    perSide: false,
    image: 'chest-opener',
    targetGender: 'all',
    instruction: 'Vouw je handen achter je rug, trek je schouderbladen naar elkaar en open je borst.',
  },
];

export function getSection(sectionId) {
  return SECTIONS.find(s => s.id === sectionId);
}

/**
 * Build the workout steps based on goals, current week, baseLevels object, and gender.
 */
export function buildWorkoutSteps(sectionIds, currentWeek, gender = 'female', baseLevels = {}) {
  const steps = [];

  // Determine user gender category (neutral maps to female for routine flow)
  const userGender = (gender === 'male') ? 'male' : 'female';

  const filteredExercises = EXERCISES.filter(e => {
    // Check section
    if (!sectionIds.includes(e.sectionId)) return false;
    // Check gender
    if (e.targetGender !== 'all' && e.targetGender !== userGender) return false;
    return true;
  });

  for (const exercise of filteredExercises) {
    // Use the specific baseLevel for this exercise's section, default to 1 (or core if not found)
    const sectionLevel = baseLevels[exercise.sectionId] || baseLevels['core'] || 1;
    const progressed = applyProgression(exercise, currentWeek, sectionLevel);

    if (progressed.perSide) {
      steps.push({
        ...progressed,
        stepId: `${progressed.id}-links`,
        sideName: 'Links',
        sideIndex: 0,
      });
      steps.push({
        ...progressed,
        stepId: `${progressed.id}-rechts`,
        sideName: 'Rechts',
        sideIndex: 1,
      });
    } else {
      steps.push({
        ...progressed,
        stepId: progressed.id,
        sideName: null,
        sideIndex: -1,
      });
    }
  }

  return steps;
}

// End of file

```

## Bestand: src/utils/aiService.js
```js
import { CreateMLCEngine } from '@mlc-ai/web-llm';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL; // Optional backend proxy endpoint

export const AVAILABLE_LOCAL_MODELS = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 (1B)',
    size: '~880 MB',
    badge: 'Nieuw & Aanbevolen',
    desc: 'Meta\'s nieuwste lightweight on-device model. Zeer slim en efficiënt.',
    recommendedRAM: '2GB+'
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 (3B)',
    size: '~1.9 GB',
    badge: 'High Quality',
    desc: 'Bovenklasse redeneervermogen van Meta op het apparaat.',
    recommendedRAM: '4GB+'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill (1.5B)',
    size: '~1.1 GB',
    badge: 'Reasoning AI',
    desc: 'Het populaire DeepSeek R1 redeneermodel, geoptimaliseerd voor mobiel.',
    recommendedRAM: '2.5GB+'
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (1.5B)',
    size: '~1.2 GB',
    badge: 'Top Meertalig',
    desc: 'Uitstekend in Nederlands en nauwkeurig opvolgen van instructies.',
    recommendedRAM: '2.5GB+'
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Google Gemma 2 (2B)',
    size: '~1.5 GB',
    badge: 'Google AI',
    desc: 'Google\'s 2e generatie Gemma model voor on-device taken.',
    recommendedRAM: '3GB+'
  },
  {
    id: 'SmolLM-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM (360M)',
    size: '~350 MB',
    badge: 'Ultra-Licht',
    desc: 'Super compact. Werkt soepel op vrijwel elk mobiel toestel.',
    recommendedRAM: '1GB+'
  }
];


const STORAGE_KEYS = {
  PROVIDER: 'ai_provider', // 'cloud' | 'local'
  MODEL_ID: 'ai_local_model' // Selected local model ID
};

let mlcEngine = null;
let currentEngineModelId = null;
let isInitializing = false;

export function getAIProvider() {
  return localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'cloud';
}

export function setAIProvider(provider) {
  if (provider !== 'cloud' && provider !== 'local') return;
  localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
}

export function getSelectedLocalModelId() {
  return localStorage.getItem(STORAGE_KEYS.MODEL_ID) || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
}

export function setSelectedLocalModelId(modelId) {
  localStorage.setItem(STORAGE_KEYS.MODEL_ID, modelId);
}

export async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU is niet ondersteund in deze browser of WebView. Gebruik Google Gemini (Cloud).'
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: 'Geen geschikte WebGPU grafische adapter gevonden op dit apparaat.'
      };
    }
    return { supported: true, reason: 'WebGPU is beschikbaar' };
  } catch (e) {
    return {
      supported: false,
      reason: `WebGPU controle mislukt: ${e.message}`
    };
  }
}

export async function initLocalEngine(modelId = null, onProgress = null) {
  const selectedModel = modelId || getSelectedLocalModelId();
  
  if (mlcEngine && currentEngineModelId === selectedModel) {
    return mlcEngine;
  }

  if (isInitializing) {
    throw new Error('Er is al een model bezig met initialiseren of downloaden...');
  }

  const gpuCheck = await checkWebGPUSupport();
  if (!gpuCheck.supported) {
    throw new Error(gpuCheck.reason);
  }

  isInitializing = true;

  try {
    const engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (progress) => {
        if (onProgress) {
          // progress contains: { text: string, progress: number }
          const text = progress.text || 'Laden...';
          const pct = Math.round((progress.progress || 0) * 100);
          onProgress(text, pct);
        }
      }
    });

    mlcEngine = engine;
    currentEngineModelId = selectedModel;
    isInitializing = false;
    return mlcEngine;
  } catch (err) {
    isInitializing = false;
    mlcEngine = null;
    currentEngineModelId = null;
    throw new Error(`Fout bij laden van lokaal model (${selectedModel}): ${err.message}`);
  }
}

export function isEngineLoaded() {
  return mlcEngine !== null;
}

export async function generateAIResponse({ prompt, history = [], systemInstruction = '', onProgress = null }) {
  const provider = getAIProvider();

  if (provider === 'local') {
    const engine = await initLocalEngine(null, onProgress);

    const formattedMessages = [];
    if (systemInstruction) {
      formattedMessages.push({ role: 'system', content: systemInstruction });
    }

    history.forEach((msg) => {
      const role = msg.role === 'model' ? 'assistant' : msg.role;
      const text = msg.parts ? msg.parts.map(p => p.text).join('\n') : (msg.text || '');
      if (text) {
        formattedMessages.push({ role: role, content: text });
      }
    });

    formattedMessages.push({ role: 'user', content: prompt });

    const completion = await engine.chat.completions.create({
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 256
    });

    return completion.choices[0]?.message?.content || 'Geen antwoord gegenereerd.';
  } else {
    // Cloud API via Google Gemini REST API
    if (!AI_PROXY_URL && (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLAK_HIER_JE_SLEUTEL')) {
      throw new Error('Google Gemini API-sleutel of Proxy URL ontbreekt in de configuratie.');
    }

    const contentsHistory = [];
    history.forEach(msg => {
      const role = msg.role === 'user' ? 'user' : 'model';
      const text = msg.parts ? msg.parts[0]?.text : (msg.text || '');
      contentsHistory.push({ role, parts: [{ text }] });
    });
    contentsHistory.push({ role: 'user', parts: [{ text: prompt }] });

    // Sanitize strictly alternating roles
    const historyClean = [];
    let lastRole = null;
    for (const msg of contentsHistory) {
      if (msg.role !== lastRole) {
        historyClean.push(msg);
        lastRole = msg.role;
      } else {
        historyClean[historyClean.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      }
    }

    const targetEndpoint = AI_PROXY_URL 
      ? AI_PROXY_URL 
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: historyClean,
        systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: { temperature: 0.7 }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Fout bij aanroepen van Gemini API');
    }

    const responseData = await response.json();
    return responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'Geen antwoord ontvangen van Gemini Cloud.';
  }
}

export async function extractVideoKeyframes(videoFile, numFrames = 4) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 1;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(width, 800);
        canvas.height = Math.round((canvas.width / width) * height);
        const ctx = canvas.getContext('2d');

        const frames = [];
        const interval = duration / (numFrames + 1);

        for (let i = 1; i <= numFrames; i++) {
          const time = interval * i;
          await new Promise(res => {
            video.currentTime = time;
            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              const base64Data = dataUrl.split(',')[1];
              frames.push(base64Data);
              res();
            };
          });
        }

        URL.revokeObjectURL(video.src);
        resolve(frames);
      } catch (err) {
        URL.revokeObjectURL(video.src);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Fout bij het laden van het videobestand in de browser.'));
    };
  });
}

export async function extractImageBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64Data = dataUrl.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(imageFile);
  });
}

export async function analyzeVideoForm({ file, exerciseName = 'Pilates oefening', onProgress = null }) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLAK_HIER_JE_SLEUTEL') {
    throw new Error('Google Gemini API-sleutel ontbreekt in de configuratie voor video-analyse.');
  }

  let frames = [];
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (isVideo) {
    if (onProgress) onProgress('Video keyframes verwerken...', 30);
    frames = await extractVideoKeyframes(file, 4);
  } else if (isImage) {
    if (onProgress) onProgress('Afbeelding verwerken...', 50);
    const b64 = await extractImageBase64(file);
    frames = [b64];
  } else {
    throw new Error('Alleen videobestanden en afbeeldingen worden ondersteund voor Form Check.');
  }

  if (onProgress) onProgress('Anatomische analyse uitvoeren via Kiné Gemini Multimodal Cloud...', 70);

  const promptText = `Je bent Kiné Coach, een expert in Pilates, anatomie en biomechanica. Analyseer de geüploade beelden van de oefening ("${exerciseName}"). 
Geef een professionele, opbouwende en accurate anatomische beoordeling in het Nederlands met de volgende opbouw:

🧘 **Houding & Uitlijning**: Wat gaat er goed aan de positie en vorm?
⚠️ **Aandachtspunten**: Waar zit compensatie (bijv. bekken, schouders, wervelkolom, nekhouding)?
💡 **3 Kiné Tips**: Geef 3 concrete tips/correcties om de vorm te perfectioneren.

Houd de antwoorden helder, aanmoedigend en professioneel.`;

  const inlineParts = frames.map(f => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: f
    }
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: promptText },
          ...inlineParts
        ]
      }],
      generationConfig: { temperature: 0.4 }
    })
  });

  if (onProgress) onProgress('Rapport genereren...', 95);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Fout bij verzenden van beelden naar Gemini Multimodal API.');
  }

  const responseData = await response.json();
  const feedbackText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!feedbackText) {
    throw new Error('Geen analyse-uitslag ontvangen van de Multimodale AI.');
  }

  return feedbackText;
}


```

## Bestand: src/utils/storage.js
```js
/**
 * LocalStorage utilities for user profile and 8-week progress tracking.
 *
 * Stores:
 * - User profile: name, goals, daily minutes, days per week
 * - Program: start date, completed days (with focus type)
 */

const STORAGE_KEYS = {
  PROFILE: 'pilates_user_profile',
  COMPLETED_DAYS: 'pilates_completed_days',
};

// ═══════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════

/**
 * Default profile shape.
 */
const DEFAULT_PROFILE = {
  name: '',
  gender: 'female',       // 'female', 'male', 'neutral'
  goals: ['alles'],       // ['billen-benen', 'core', 'rug', 'alles']
  dailyMinutes: 15,       // 10, 15, 20
  daysPerWeek: 6,         // 3, 4, 5, 6
  startDate: null,        // ISO date string
  baseLevels: {
    'core': 0,
    'benen-billen': 0,
    'rug-houding': 0
  },
  includeStretch: true,
  onboardingComplete: false,
  schemaVersion: 1,
};

/**
 * Get the user profile. Returns null if onboarding not complete.
 */
export function getProfile() {
  const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (stored) {
    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse profile', e);
      return null;
    }
    const profile = { ...DEFAULT_PROFILE, ...parsed };
    
    // Migrate old baseLevel to new baseLevels if necessary
    if (parsed.baseLevel !== undefined && !parsed.baseLevels) {
      profile.baseLevels = {
        'core': parsed.baseLevel,
        'benen-billen': parsed.baseLevel,
        'rug-houding': parsed.baseLevel
      };
      delete profile.baseLevel;
      saveProfile(profile);
    } else {
      // Deep-merge baseLevels: ensure all section keys exist with correct values
      profile.baseLevels = {
        ...DEFAULT_PROFILE.baseLevels,
        ...(parsed.baseLevels || {})
      };
    }
    return profile;
  }
  return null;
}

/**
 * Save the user profile.
 */
export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile to localStorage', e);
  }
}

/**
 * Check if onboarding is complete.
 */
export function isOnboardingComplete() {
  const profile = getProfile();
  return profile && profile.onboardingComplete;
}

/**
 * Get the user's name.
 */
export function getUserName() {
  const profile = getProfile();
  return profile ? profile.name : '';
}

/**
 * Get the program start date as a Date object.
 */
export function getProgramStartDate() {
  const profile = getProfile();
  if (profile && profile.startDate) {
    const parts = profile.startDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
  }
  return null;
}

/**
 * Update the start date.
 */
export function setStartDate(dateStr) {
  const profile = getProfile();
  if (profile) {
    profile.startDate = dateStr;
    saveProfile(profile);
  }
}

// ═══════════════════════════════════════
// COMPLETED DAYS
// ═══════════════════════════════════════

/**
 * Get all completed days as a Map of "YYYY-MM-DD" → focus type emoji.
 */
export function getCompletedDays() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COMPLETED_DAYS);
    if (stored) {
      let parsed;
      try {
        parsed = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse completed days', e);
        return {};
      }
      if (Array.isArray(parsed)) {
        const map = {};
        parsed.forEach(d => { map[d] = '✓'; });
        return map;
      }
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch (e) {
    console.error('Error reading completed days from localStorage', e);
  }
  return {};
}

/**
 * Mark today as completed with the given focus type.
 */
export function markTodayComplete(focusEmoji = '✓') {
  try {
    const days = getCompletedDays();
    const today = formatDate(new Date());
    days[today] = focusEmoji;
    localStorage.setItem(STORAGE_KEYS.COMPLETED_DAYS, JSON.stringify(days));
  } catch (e) {
    console.error('Failed to save completed day to localStorage', e);
  }
}

/**
 * Check if today is already completed.
 */
export function isTodayComplete() {
  const days = getCompletedDays();
  return formatDate(new Date()) in days;
}

/**
 * Get current week number (1-8) based on start date.
 * Returns 1 if program hasn't started or if before week 1.
 */
export function getCurrentWeek() {
  const startDate = getProgramStartDate();
  if (!startDate) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const diffMs = today - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  return Math.min(Math.max(week, 1), 8);
}

/**
 * Get the total number of completed workouts.
 */
export function getTotalCompleted() {
  return Object.keys(getCompletedDays()).length;
}

/**
 * Calculate how many workouts the user has missed based on start date, daysPerWeek, and completed workouts.
 */
export function getMissedWorkouts() {
  const profile = getProfile();
  const start = getProgramStartDate();
  if (!profile || !start) return 0;

  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  if (daysPassed <= 0) return 0; // Started today or in the future

  const weeksPassed = Math.floor(daysPassed / 7);
  const remainingDays = daysPassed % 7;
  
  // Total workouts they should have done up to yesterday
  const expectedWorkouts = (weeksPassed * profile.daysPerWeek) + Math.min(remainingDays, profile.daysPerWeek);
  
  const totalCompleted = getTotalCompleted();
  
  return Math.max(0, expectedWorkouts - totalCompleted);
}

/**
 * Build the 8-week calendar data using actual dates from start date.
 * Each cell contains real dates, completion status, and focus icons.
 */
export function buildCalendarData() {
  const startDate = getProgramStartDate();
  const completedDays = getCompletedDays();
  const currentWeek = getCurrentWeek();
  const todayStr = formatDate(new Date());

  const weeks = [];
  const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  for (let w = 0; w < 8; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      if (startDate) {
        const date = new Date(startDate);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + w * 7 + d);
        const dateStr = formatDate(date);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        days.push({
          date: dateStr,
          dayNumber: date.getDate(),
          monthLabel: MONTHS[date.getMonth()],
          dayOfWeek: d,
          isCompleted: dateStr in completedDays,
          completedIcon: completedDays[dateStr] || null,
          isToday: dateStr === todayStr,
          isPast: date < now,
          isFuture: date > now,
        });
      } else {
        days.push({
          date: null,
          dayNumber: null,
          monthLabel: null,
          dayOfWeek: d,
          isCompleted: false,
          completedIcon: null,
          isToday: false,
          isPast: false,
          isFuture: true,
        });
      }
    }

    // Determine week date range label
    let weekLabel = `Week ${w + 1}`;
    if (startDate && days[0].date && days[6].date) {
      const first = days[0];
      const last = days[6];
      if (first.monthLabel === last.monthLabel) {
        weekLabel = `${first.dayNumber}–${last.dayNumber} ${first.monthLabel}`;
      } else {
        weekLabel = `${first.dayNumber} ${first.monthLabel}–${last.dayNumber} ${last.monthLabel}`;
      }
    }

    weeks.push({
      weekNumber: w + 1,
      isCurrent: currentWeek === w + 1,
      weekLabel,
      days,
    });
  }

  return weeks;
}

/**
 * Reset all progress data (keeps profile).
 */
export function resetProgress() {
  localStorage.removeItem(STORAGE_KEYS.COMPLETED_DAYS);
  const profile = getProfile();
  if (profile) {
    profile.startDate = new Date().toISOString().split('T')[0];
    saveProfile(profile);
  }
}

/**
 * Reset everything including profile (full reset of local and cloud progress).
 */
export async function resetAll() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED_DAYS);
    localStorage.removeItem('pilates_pending_invite');
    const { resetCloudProgress } = await import('./social.js');
    await resetCloudProgress();
  } catch (e) {
    console.error('Error during resetAll:', e);
  }
}

/**
 * Format a Date to "YYYY-MM-DD" string.
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

```

## Bestand: src/utils/scheduler.js
```js
/**
 * Scheduler — determines which sections to train today
 * based on user goals and day rotation.
 */

import { SECTIONS } from '../data/exercises.js';
import { getProfile, getProgramStartDate, formatDate, getTotalCompleted } from './storage.js';

/**
 * Goal ID to section mapping.
 */
const GOAL_SECTIONS = {
  'billen-benen': ['benen-billen'],
  'core': ['core'],
  'rug': ['rug-houding'],
  'alles': ['benen-billen', 'core', 'rug-houding'],
};

/**
 * Goal ID to display info.
 */
export const GOAL_INFO = {
  'billen-benen': { emoji: '🦵', label: 'Billen & Benen', color: '#D4A0A0' },
  'core': { emoji: '🧱', label: 'Core, Buik & Armen', color: '#C4A882' },
  'rug': { emoji: '🧘', label: 'Rug & Houding', color: '#B8A9C9' },
  'alles': { emoji: '⭐', label: 'Alles', color: '#A8C09A' },
};

function getActiveGoals(profile) {
  if (!profile) return ['alles'];

  if (Array.isArray(profile.goals) && profile.goals.includes('alles')) {
    return ['alles'];
  }

  const baseLevels = profile.baseLevels || { core: 1, 'benen-billen': 1, 'rug-houding': 1 };
  const userGoals = Array.isArray(profile.goals) && profile.goals.length > 0 ? profile.goals : ['billen-benen', 'core', 'rug'];

  const activeGoals = [];
  if (userGoals.includes('core') && baseLevels.core !== 0) activeGoals.push('core');
  if ((userGoals.includes('billen-benen') || userGoals.includes('benen-billen')) && baseLevels['benen-billen'] !== 0) activeGoals.push('billen-benen');
  if (userGoals.includes('rug') && baseLevels['rug-houding'] !== 0) activeGoals.push('rug');

  if (activeGoals.length === 3 || activeGoals.length === 0) return ['alles'];
  return activeGoals;
}

/**
 * Get the sections to train today based on user profile.
 */
export function getTodaysFocus() {
  const profile = getProfile();
  if (!profile) {
    return {
      sectionIds: ['warmup', 'benen-billen', 'core', 'rug-houding', 'stretch'],
      focusLabel: 'Volledige Routine',
      focusEmoji: '⭐',
    };
  }

  const baseLevels = profile.baseLevels || { core: 1, 'benen-billen': 1, 'rug-houding': 1 };
  const goals = getActiveGoals(profile);

  if (goals.includes('alles')) {
    const sectionIds = ['warmup'];
    if (baseLevels.core > 0) sectionIds.push('core');
    if (baseLevels['benen-billen'] > 0) sectionIds.push('benen-billen');
    if (baseLevels['rug-houding'] > 0) sectionIds.push('rug-houding');
    
    const hasActiveSections = sectionIds.length > 1;
    if (profile.includeStretch !== false) sectionIds.push('stretch');
    
    return {
      sectionIds,
      focusLabel: hasActiveSections ? 'Volledige Routine' : 'Herstel & Stretch',
      focusEmoji: hasActiveSections ? '⭐' : '🧘',
    };
  }

  if (goals.length === 1) {
    const goal = goals[0];
    const info = GOAL_INFO[goal];
    const mainSections = GOAL_SECTIONS[goal] || [];
    const sectionIds = ['warmup', ...mainSections];
    if (profile.includeStretch !== false) sectionIds.push('stretch');
    return {
      sectionIds,
      focusLabel: info.label,
      focusEmoji: info.emoji,
    };
  }

  const dayIndex = getWorkoutDayIndex();
  const goalIndex = dayIndex % goals.length;
  const todayGoal = goals[goalIndex];
  const info = GOAL_INFO[todayGoal];
  const mainSections = GOAL_SECTIONS[todayGoal] || [];
  const sectionIds = ['warmup', ...mainSections];
  if (profile.includeStretch !== false) sectionIds.push('stretch');

  return {
    sectionIds,
    focusLabel: info.label,
    focusEmoji: info.emoji,
  };
}

export function getFocusForDate(dateStr) {
  const profile = getProfile();
  if (!profile) return GOAL_INFO['alles'];

  const goals = getActiveGoals(profile);

  if (goals.includes('alles') || goals.length === 1) {
    const goal = goals.includes('alles') ? 'alles' : goals[0];
    return GOAL_INFO[goal];
  }

  const startDate = getProgramStartDate();
  if (!startDate) return GOAL_INFO['alles'];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  const goalIndex = ((diffDays % goals.length) + goals.length) % goals.length;

  return GOAL_INFO[goals[goalIndex]];
}

export function getGoalSubtitle() {
  const profile = getProfile();
  if (!profile) return 'Strakke benen & strakke buik';

  const goals = getActiveGoals(profile);

  if (goals.includes('alles')) {
    return 'Strakke benen, sterke core & gezonde rug';
  }

  const parts = goals.map(g => {
    switch (g) {
      case 'billen-benen': return 'strakke billen & benen';
      case 'core': return 'sterke core & buik';
      case 'rug': return 'gezonde rug & houding';
      default: return '';
    }
  }).filter(Boolean);

  return parts.join(' & ').replace(/^./, c => c.toUpperCase());
}

function getWorkoutDayIndex() {
  return getTotalCompleted();
}

```

## Bestand: src/utils/social.js
```js
import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { 
  doc, setDoc, getDoc, getDocs, 
  collection, query, orderBy, where, 
  arrayUnion, serverTimestamp 
} from 'firebase/firestore';

/**
 * Handle a new user login: merge their local profile/progress into Firestore
 * and process any pending invites.
 */
export async function initializeSocialUser(localProfile, localTotal, localWeek, localMissed) {
  try {
    const user = getCurrentUser();
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let communities = ['global'];

    // Check for pending invite
    const pendingInvite = localStorage.getItem('pilates_pending_invite');

    if (!userSnap.exists()) {
      // New user
      if (pendingInvite) {
        communities.push(pendingInvite);
      }
      await setDoc(userRef, {
        name: localProfile.name || user.displayName || 'Pilates Fan',
        totalWorkouts: localTotal || 0,
        currentWeek: localWeek || 1,
        missedWorkouts: localMissed || 0,
        communities: communities,
        lastActive: serverTimestamp()
      });
    } else {
      // Existing user
      const data = userSnap.data();
      communities = data.communities || ['global'];
      if (pendingInvite && !communities.includes(pendingInvite)) {
        communities.push(pendingInvite);
      }
      await setDoc(userRef, {
        name: localProfile.name || data.name || user.displayName || 'Pilates Fan',
        totalWorkouts: Math.max(localTotal, data.totalWorkouts || 0),
        currentWeek: Math.max(localWeek, data.currentWeek || 1),
        missedWorkouts: localMissed || data.missedWorkouts || 0,
        communities: communities,
        lastActive: serverTimestamp()
      }, { merge: true });
    }

    // Clear pending invite
    if (pendingInvite) {
      localStorage.removeItem('pilates_pending_invite');
    }

    return communities;
  } catch (error) {
    console.error("Error initializing user:", error);
    import('../ui/core.js').then(module => module.showToast('Kan niet verbinden met de server.', 'error'));
    return ['global'];
  }
}

/**
 * Push the current user's progress to Firestore.
 */
export async function pushUserProgress(data) {
  const user = getCurrentUser();
  if (!user) return; // Only push if authenticated

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    let remoteTotal = 0;
    if (userSnap.exists()) {
      remoteTotal = userSnap.data().totalWorkouts || 0;
    }
    
    const displayName = data.name && data.name.trim() !== '' ? sanitizeText(data.name, 40) : 'Pilates Fan';

    await setDoc(userRef, {
      name: displayName || 'Pilates Fan',
      totalWorkouts: Math.max(remoteTotal, data.totalWorkouts || 0),
      currentWeek: data.currentWeek || 1,
      missedWorkouts: data.missedWorkouts || 0,
      lastActive: serverTimestamp()
    }, { merge: true });
    
  } catch (error) {
    console.error("Error pushing progress:", error);
    import('../ui/core.js').then(module => module.showToast('Voortgang niet lokaal gesynchroniseerd.', 'error'));
  }
}

/**
 * Reset cloud progress for authenticated user.
 */
export async function resetCloudProgress() {
  try {
    const user = getCurrentUser();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      totalWorkouts: 0,
      currentWeek: 1,
      missedWorkouts: 0,
      lastActive: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn("Could not reset cloud progress:", error);
  }
}

/**
 * Fetch the leaderboard for a specific community.
 */
export async function getLeaderboard(communityCode = 'global') {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('communities', 'array-contains', communityCode)
    );
    const querySnapshot = await getDocs(q);
    
    const leaderboard = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Handle timestamp conversion safely
      let lastActiveStr = 'Onbekend';
      if (data.lastActive && data.lastActive.toDate) {
        lastActiveStr = data.lastActive.toDate().toLocaleDateString();
      } else if (data.lastActive) {
        lastActiveStr = new Date(data.lastActive).toLocaleDateString();
      }

      leaderboard.push({
        id: doc.id,
        name: data.name || 'Pilates Fan',
        totalWorkouts: data.totalWorkouts || 0,
        missedWorkouts: data.missedWorkouts || 0,
        currentWeek: data.currentWeek || 1,
        lastActive: lastActiveStr
      });
    });
    
    // Sort locally by totalWorkouts descending to avoid Firebase composite index requirement
    leaderboard.sort((a, b) => b.totalWorkouts - a.totalWorkouts);

    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    import('../ui/core.js').then(module => module.showToast('Kan leaderboard niet laden. Ben je offline?', 'error'));
    return [];
  }
}

/**
 * Create a new community
 */
function sanitizeText(str, maxLen = 40) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

export async function createCommunity(name) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const cleanName = sanitizeText(name, 40);
    if (!cleanName) throw new Error("Ongeldige groepsnaam.");

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const commRef = doc(db, 'communities', code);
    await setDoc(commRef, {
      id: code,
      name: cleanName,
      ownerId: user.uid,
      createdAt: serverTimestamp()
    });

    // Add owner to this community
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      communities: arrayUnion(code)
    }, { merge: true });

    return code;
  } catch (error) {
    console.error("Error creating community:", error);
    import('../ui/core.js').then(module => module.showToast('Fout bij maken groep.', 'error'));
    throw error;
  }
}

/**
 * Join an existing community by code
 */
export async function joinCommunity(code) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const formattedCode = code.trim().toUpperCase();

    // Optionally verify if community exists
    const commRef = doc(db, 'communities', formattedCode);
    const commSnap = await getDoc(commRef);
    
    if (!commSnap.exists() && formattedCode !== 'GLOBAL') {
      throw new Error("Community niet gevonden!");
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      communities: arrayUnion(formattedCode)
    }, { merge: true });

    return formattedCode;
  } catch (error) {
    console.error("Error joining community:", error);
    import('../ui/core.js').then(module => module.showToast(error.message || 'Fout bij joinen groep.', 'error'));
    throw error;
  }
}

/**
 * Get user's communities details
 */
export async function getUserCommunities() {
  try {
    const user = getCurrentUser();
    if (!user) return [];

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [{ id: 'global', name: 'Global' }];

    const data = userSnap.data();
    const codes = data.communities || ['global'];

    const results = [];
    for (const code of codes) {
      if (code === 'global' || code === 'GLOBAL') {
        results.push({ id: 'global', name: 'Global Community' });
      } else {
        const commRef = doc(db, 'communities', code);
        const commSnap = await getDoc(commRef);
        if (commSnap.exists()) {
          results.push({ id: code, name: commSnap.data().name });
        } else {
          results.push({ id: code, name: `Groep ${code}` }); // Fallback
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error getting user communities:", error);
    import('../ui/core.js').then(module => module.showToast('Kan groepen niet laden.', 'error'));
    return [{ id: 'global', name: 'Global' }];
  }
}

```

## Bestand: src/utils/auth.js
```js
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
  return window.Capacitor?.isNative === true;
}

// Initialize GoogleAuth only on web platform (native platforms use configuration files and crash on initialize)
if (!isNativeApp()) {
  GoogleAuth.initialize({
    clientId: '443627015452-607m0jgju0crolb3vptrib6a0ej3jfdu.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

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


```

## Bestand: src/utils/i18n.js
```js
import { getProfile } from './storage.js';

export const translations = {
  nl: {
    // Shared
    'btn.back': '← Terug',
    'btn.save': 'Opslaan',
    'btn.cancel': 'Annuleren',
    'btn.confirm': 'Bevestigen',
    'btn.next': 'Volgende →',
    'btn.quit': '✕ Stop',
    'btn.skip': 'Overslaan',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pauze',
    'btn.finish': 'Afronden ✓',
    'nav.home': 'Home',
    'nav.coach': 'Coach',
    'nav.community': 'Community',
    'nav.settings': 'Instellingen',
    
    // Home
    'home.greeting': 'Hoi',
    'home.minPerDay': 'min per dag',
    'home.daysPerWeek': 'dagen per week',
    'home.avgLevel': 'Gem. Niveau',
    'home.today': 'Vandaag',
    'home.doneToday': 'Vandaag al voltooid — goed bezig! 💚',
    'home.playAgain': '✓ Nogmaals oefenen',
    'home.workouts': 'Workouts',
    'home.weeks': 'Weken',
    'home.intensity': 'Intensiteit',
    'home.scienceBadge': 'Science-Backed (TUT)',
    'home.quote': '♥ Jouw consistentie vandaag, is je resultaat morgen. ♥',
    
    // Calendar
    'calendar.title': '📅 Schema',
    'calendar.reset': 'Voortgang resetten',
    'calendar.days': ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],

    // Onboarding
    'ob.step.of': 'Stap {0} van {1}',
    'ob.welcome.title': 'Welkom!',
    'ob.welcome.sub': 'Laten we je Pilates routine instellen.',
    'ob.name.label': 'Hoe mogen we je noemen?',
    'ob.name.placeholder': 'Je naam...',
    'ob.gender.title': 'Wat is je geslacht?',
    'ob.gender.sub': 'Hier stemmen we de oefeningen op af.',
    'ob.gender.f': 'Vrouw',
    'ob.gender.m': 'Man',
    'ob.gender.n': 'Liever niet zeggen',
    'ob.goals.title': 'Waar wil je aan werken',
    'ob.goals.sub': 'Kies één of meer focusgebieden.',
    'ob.goals.legs': 'Billen & Benen',
    'ob.goals.core': 'Core, Buik & Armen',
    'ob.goals.back': 'Rug & Houding',
    'ob.goals.all': 'Alles',
    'ob.level.title': 'Wat is je startniveau?',
    'ob.level.sub': 'We bouwen de intensiteit vanaf hier langzaam op.',
    'ob.level.beg.title': 'Beginner (Makkelijk)',
    'ob.level.beg.desc': 'Start rustig aan.',
    'ob.level.int.title': 'Gemiddeld',
    'ob.level.int.desc': 'Je hebt al wat ervaring.',
    'ob.level.adv.title': 'Gevorderd',
    'ob.level.adv.desc': 'Klaar voor een uitdaging!',
    'ob.time.title': 'Tijd & frequentie',
    'ob.time.sub': 'Hoeveel tijd per dag en hoe vaak per week?',
    'ob.time.minLabel': 'Minuten per dag',
    'ob.time.daysLabel': 'Dagen per week',
    'ob.start.title': 'Wanneer begin je?',
    'ob.start.sub': 'Het schema start op deze datum.',
    'ob.btn.start': 'Starten! 🎉',

    // Settings
    'set.title': 'Instellingen',
    'set.name': 'Naam',
    'set.startDate': 'Startdatum Schema',
    'set.lvl.core': 'Niveau Core, Buik & Armen',
    'set.lvl.legs': 'Niveau Billen & Benen',
    'set.lvl.back': 'Niveau Rug & Houding',
    'set.gender': 'Geslacht',
    'set.goals': 'Focusgebieden',
    'set.stretch': 'Inclusief stretch',
    'set.resetAll': 'Alles resetten & opnieuw beginnen',
    'set.language': 'Taal',
    'set.theme': 'Thema',
    'set.theme.light': 'Licht',
    'set.theme.dark': 'Donker',
    'set.theme.auto': 'Automatisch',
    
    // Workout
    'wk.nextSection': 'Volgende sectie',
    'wk.hold': '🔒 Houd vast!',
    'wk.ofReps': 'van {0} reps',
    'wk.tapHint': 'Langzaam: ±4 sec. per rep',
    'wk.tut.tooFast': 'Te snel! Behoud de spierspanning (Time Under Tension).',
    'wk.seconds': 'seconden',
    'wk.intro.encouragement1': 'Laten we beginnen, {0}! 🌿',
    'wk.intro.encouragement2': 'Goed bezig, {0}! 💪',
    'wk.intro.encouragement3': 'Klaar voor de volgende? 🔥',
    'wk.intro.encouragement4': 'Je doet het geweldig! 🌟',
    'wk.intro.btn': 'Laten we gaan →',

    // Complete
    'comp.title': 'Routine Voltooid!',
    'comp.msg1': 'Geweldig gedaan, {0}! Je lichaam bedankt je. 💚',
    'comp.msg2': 'Weer een workout erop! Elke dag een stapje sterker.',
    'comp.msg3': 'Fantastisch! Consistentie is de sleutel. 🔑',
    'comp.workoutsTotal': 'Workouts totaal',
    'comp.currentWeek': 'Huidig',
    'comp.btn.home': 'Terug naar Home',
    'comp.btn.leaderboard': 'Bekijk Leaderboard 🏆',

    // Community
    'comm.title': 'Community 🏆',
    'comm.logout': 'Log uit',
    'comm.inviteCopy': '🔗 Invite Link Kopiëren',
    'comm.inviteCopied': '✓ Gekopieerd!',
    'comm.newGroup': '➕ Nieuwe Groep',
    'comm.loading': 'Laden...',
    'comm.empty': 'Nog niemand in deze groep.',
    'comm.you': '(Jij)',
    'comm.week': 'Week',
    'comm.lastActive': 'Laatst actief:',
    'comm.missed': 'gemist',

    // Auth
    'auth.title': 'Word lid van de Community',
    'auth.sub1': 'Log in om je voortgang te vergelijken, samen met vrienden te trainen in privé groepen, en gemotiveerd te blijven.',
    'auth.sub2': 'Log in om de uitnodiging voor groep <b>{0}</b> te accepteren!',
    'auth.google': 'Ga verder met Google',
    'auth.or': 'of',
    'auth.email': 'E-mailadres',
    'auth.pass': 'Wachtwoord',
    'auth.loginBtn': 'Inloggen',
    'auth.regBtn': 'Registreren',

    // Dialogs
    'dlg.quit.title': 'Routine stoppen?',
    'dlg.quit.msg': 'Je voortgang voor deze workout gaat verloren.',
    'dlg.quit.confirm': 'Doorgaan',
    'dlg.quit.cancel': 'Stoppen',
    'dlg.reset.title': 'Voortgang resetten?',
    'dlg.reset.msg': 'Je workout-voortgang wordt gewist. Je profiel blijft behouden.',
    'dlg.resetAll.title': 'Alles resetten (Lokaal & Cloud)?',
    'dlg.resetAll.msg': 'Je lokale profiel én je opgeslagen cloud-voortgang worden hiermee volledig gewist.',
    'dlg.science.title': '🧘 Principes van de Routine',
    'dlg.science.msg': 'Deze routine maakt gebruik van een <b>rustig herhalingstempo</b> en <b>geleidelijke opbouw</b>.<br><br><b>Rustig tempo:</b> Door gecontroleerd te bewegen focus je op balans, houding en spierbeheersing.<br><b>Geleidelijke opbouw:</b> Het programma verhoogt in stappen de intensiteit om je spieren op een veilige manier uit te dagen.<br><br>Daarom is te snel doorklikken geblokkeerd.',

    // Workout skip/fail
    'wk.skipWarning': 'Let op: als je nog meer oefeningen overslaat, telt deze workout niet meer mee voor je voortgang.',
    'wk.notCompleted.title': 'Niet voltooid',
    'wk.notCompleted.msg': 'Je hebt meer dan de helft van de oefeningen overgeslagen. Deze workout telt helaas niet mee voor je voortgang.',

    // Community prompts
    'comm.createPrompt': 'Naam:',
    'comm.createSuccess.title': 'Groep aangemaakt!',
    'comm.createSuccess.msg': 'Deel de invite link met je vrienden.',
    'comm.createError': 'Fout bij maken groep.',
    'auth.fieldsRequired': 'Vul je e-mail en wachtwoord in.',

    // Settings level labels
    'set.lvl.0': 'Uit (Niet trainen)',
    'set.lvl.1': 'Beginner (Makkelijk)',
    'set.lvl.2': 'Beginner+',
    'set.lvl.3': 'Licht Gemiddeld',
    'set.lvl.4': 'Gemiddeld',
    'set.lvl.5': 'Gemiddeld+',
    'set.lvl.6': 'Gevorderd',
    'set.lvl.7': 'Gevorderd+',
    'set.lvl.8': 'Expert',

    'side.been': 'been',
    'side.kant': 'kant',
  },
  en: {
    'side.been': 'leg',
    'side.kant': 'side',
    // Shared
    'btn.back': '← Back',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',
    'btn.next': 'Next →',
    'btn.quit': '✕ Quit',
    'btn.skip': 'Skip',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pause',
    'btn.finish': 'Finish ✓',
    'nav.home': 'Home',
    'nav.coach': 'Coach',
    'nav.community': 'Community',
    'nav.settings': 'Settings',

    // Home
    'home.greeting': 'Hi',
    'home.minPerDay': 'min per day',
    'home.daysPerWeek': 'days per week',
    'home.avgLevel': 'Avg. Level',
    'home.today': 'Today',
    'home.doneToday': 'Already completed today — great job! 💚',
    'home.playAgain': '✓ Practice Again',
    'home.workouts': 'Workouts',
    'home.weeks': 'Weeks',
    'home.intensity': 'Intensity',
    'home.scienceBadge': 'Science-Backed (TUT)',
    'home.quote': '♥ Your consistency today is your result tomorrow. ♥',

    // Calendar
    'calendar.title': '📅 Schedule',
    'calendar.reset': 'Reset Progress',
    'calendar.days': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    // Onboarding
    'ob.step.of': 'Step {0} of {1}',
    'ob.welcome.title': 'Welcome!',
    'ob.welcome.sub': "Let's set up your Pilates routine.",
    'ob.name.label': 'What should we call you?',
    'ob.name.placeholder': 'Your name...',
    'ob.gender.title': 'What is your gender?',
    'ob.gender.sub': 'We tailor the exercises based on this.',
    'ob.gender.f': 'Female',
    'ob.gender.m': 'Male',
    'ob.gender.n': 'Prefer not to say',
    'ob.goals.title': 'What do you want to work on',
    'ob.goals.sub': 'Choose one or more focus areas.',
    'ob.goals.legs': 'Glutes & Legs',
    'ob.goals.core': 'Core, Abs & Arms',
    'ob.goals.back': 'Back & Posture',
    'ob.goals.all': 'Everything',
    'ob.level.title': 'What is your starting level?',
    'ob.level.sub': 'We will slowly build up the intensity from here.',
    'ob.level.beg.title': 'Beginner (Easy)',
    'ob.level.beg.desc': 'Start off slowly.',
    'ob.level.int.title': 'Intermediate',
    'ob.level.int.desc': 'You have some experience.',
    'ob.level.adv.title': 'Advanced',
    'ob.level.adv.desc': 'Ready for a challenge!',
    'ob.time.title': 'Time & Frequency',
    'ob.time.sub': 'How much time per day and how often per week?',
    'ob.time.minLabel': 'Minutes per day',
    'ob.time.daysLabel': 'Days per week',
    'ob.start.title': 'When are you starting?',
    'ob.start.sub': 'The routine will start on this date.',
    'ob.btn.start': 'Start! 🎉',

    // Settings
    'set.title': 'Settings',
    'set.name': 'Name',
    'set.startDate': 'Routine Start Date',
    'set.lvl.core': 'Level Core, Abs & Arms',
    'set.lvl.legs': 'Level Glutes & Legs',
    'set.lvl.back': 'Level Back & Posture',
    'set.gender': 'Gender',
    'set.goals': 'Focus Areas',
    'set.stretch': 'Include stretch',
    'set.resetAll': 'Reset Everything & Start Over',
    'set.language': 'Language',
    'set.theme': 'Theme',
    'set.theme.light': 'Light',
    'set.theme.dark': 'Dark',
    'set.theme.auto': 'Auto',

    // Workout
    'wk.nextSection': 'Next section',
    'wk.hold': '🔒 Hold it!',
    'wk.ofReps': 'of {0} reps',
    'wk.tapHint': 'Slow: ±4 sec. per rep',
    'wk.tut.tooFast': 'Too fast! Maintain Time Under Tension (TUT).',
    'wk.seconds': 'seconds',
    'wk.intro.encouragement1': "Let's begin, {0}! 🌿",
    'wk.intro.encouragement2': 'Great job, {0}! 💪',
    'wk.intro.encouragement3': 'Ready for the next one? 🔥',
    'wk.intro.encouragement4': "You're doing amazing! 🌟",
    'wk.intro.btn': "Let's go →",

    // Complete
    'comp.title': 'Routine Completed!',
    'comp.msg1': 'Amazing job, {0}! Your body thanks you. 💚',
    'comp.msg2': 'Another workout in the bag! A little stronger every day.',
    'comp.msg3': 'Fantastic! Consistency is key. 🔑',
    'comp.workoutsTotal': 'Total Workouts',
    'comp.currentWeek': 'Current',
    'comp.btn.home': 'Back to Home',
    'comp.btn.leaderboard': 'View Leaderboard 🏆',

    // Community
    'comm.title': 'Community 🏆',
    'comm.logout': 'Logout',
    'comm.inviteCopy': '🔗 Copy Invite Link',
    'comm.inviteCopied': '✓ Copied!',
    'comm.newGroup': '➕ New Group',
    'comm.loading': 'Loading...',
    'comm.empty': 'No one in this group yet.',
    'comm.you': '(You)',
    'comm.week': 'Week',
    'comm.lastActive': 'Last active:',
    'comm.missed': 'missed',

    // Auth
    'auth.title': 'Join the Community',
    'auth.sub1': 'Log in to compare your progress, work out with friends in private groups, and stay motivated.',
    'auth.sub2': 'Log in to accept the invite for group <b>{0}</b>!',
    'auth.google': 'Continue with Google',
    'auth.or': 'or',
    'auth.email': 'Email Address',
    'auth.pass': 'Password',
    'auth.loginBtn': 'Login',
    'auth.regBtn': 'Register',

    // Dialogs
    'dlg.quit.title': 'Quit routine?',
    'dlg.quit.msg': 'Your progress for this workout will be lost.',
    'dlg.quit.confirm': 'Continue Workout',
    'dlg.quit.cancel': 'Quit', 
    'dlg.reset.title': 'Reset progress?',
    'dlg.reset.msg': 'Your workout progress will be cleared. Your profile is kept.',
    'dlg.resetAll.title': 'Reset everything?',
    'dlg.resetAll.msg': 'Your profile and progress will be cleared.',
    'dlg.science.title': '🔬 The Science behind the Routine',
    'dlg.science.msg': 'This app relies on <b>Time Under Tension (TUT)</b> and <b>Progressive Overload</b>.<br><br><b>TUT:</b> Moving slowly and with control eliminates momentum, causing significantly higher muscle activation and metabolic stress.<br><b>Progressive Overload:</b> The app increases difficulty weekly, forcing your body to adapt (grow stronger).<br><br>This is why fast clicking is blocked. Enjoy the burn!',

    // Workout skip/fail
    'wk.skipWarning': 'Warning: if you skip more exercises, this workout will no longer count towards your progress.',
    'wk.notCompleted.title': 'Not Completed',
    'wk.notCompleted.msg': 'You skipped more than half of the exercises. This workout does not count towards your progress.',

    // Community prompts
    'comm.createPrompt': 'Name:',
    'comm.createSuccess.title': 'Group created!',
    'comm.createSuccess.msg': 'Share the invite link with your friends.',
    'comm.createError': 'Error creating group.',
    'auth.fieldsRequired': 'Please enter your email and password.',

    // Settings level labels
    'set.lvl.0': 'Off (Do not train)',
    'set.lvl.1': 'Beginner (Easy)',
    'set.lvl.2': 'Beginner+',
    'set.lvl.3': 'Light Intermediate',
    'set.lvl.4': 'Intermediate',
    'set.lvl.5': 'Intermediate+',
    'set.lvl.6': 'Advanced',
    'set.lvl.7': 'Advanced+',
    'set.lvl.8': 'Expert',
  }
};

export function getLanguage() {
  const profile = getProfile();
  return profile?.language || 'nl';
}

export function t(key, ...args) {
  const lang = getLanguage();
  let text = translations[lang][key] || translations['nl'][key] || key;
  
  if (args && args.length > 0) {
    args.forEach((arg, i) => {
      text = text.replace(`{${i}}`, arg);
    });
  }
  return text;
}

```

## Bestand: src/utils/bluetooth.js
```js
import { BleClient } from '@capacitor-community/bluetooth-le';

const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

/**
 * Connects to a Bluetooth Low Energy Heart Rate Monitor.
 * Requests the user to select a device broadcasting the Heart Rate Service.
 * @param {Function} onHeartRateUpdate Callback fired when a new BPM is received.
 * @param {Function} onDisconnect Callback fired when the device disconnects.
 * @returns {Promise<string>} The device ID of the connected monitor.
 */
export async function connectHeartRateMonitor(onHeartRateUpdate, onDisconnect) {
  try {
    // Initialize the BLE client (requests necessary permissions on Android/iOS)
    await BleClient.initialize();

    // Request device that broadcasts the HR service
    const device = await BleClient.requestDevice({
      services: [HEART_RATE_SERVICE],
    });

    // Connect to the device
    await BleClient.connect(device.deviceId, (disconnectedDeviceId) => {
      console.log(`Smartwatch disconnected: ${disconnectedDeviceId}`);
      if (onDisconnect) onDisconnect();
    });

    // Start receiving notifications
    await BleClient.startNotifications(
      device.deviceId,
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT,
      (value) => {
        // Parse the characteristic value according to GATT specifications
        // Value is a DataView. The first byte contains flags.
        const flags = value.getUint8(0);
        // If the 0th bit is 0, heart rate format is 8-bit (UINT8)
        // If 1, format is 16-bit (UINT16)
        const is16BitFormat = flags & 0x01;
        
        let heartRate;
        if (is16BitFormat) {
          heartRate = value.getUint16(1, true); // true for little-endian
        } else {
          heartRate = value.getUint8(1);
        }
        
        onHeartRateUpdate(heartRate);
      }
    );
    
    return device.deviceId;
  } catch (error) {
    console.error("Bluetooth connection failed:", error);
    throw error;
  }
}

/**
 * Disconnects from the connected Heart Rate Monitor.
 * @param {string} deviceId The device ID to disconnect from.
 */
export async function disconnectHeartRateMonitor(deviceId) {
  if (!deviceId) return;
  try {
    await BleClient.disconnect(deviceId);
    console.log(`Disconnected from ${deviceId}`);
  } catch (error) {
    console.error("Failed to disconnect:", error);
  }
}

```

## Bestand: src/utils/firebase.js
```js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const auth = getAuth(app);

```

## Bestand: src/ui/core.js
```js
import { state } from '../state.js';
import { renderOnboarding } from './screens/onboardingScreen.js';
import { renderHome } from './screens/homeScreen.js';
import { renderWorkout } from './screens/workoutScreen.js';
import { renderComplete } from './screens/completeScreen.js';
import { renderSettings } from './screens/settingsScreen.js';
import { renderCommunityWrapper } from './screens/communityScreen.js';
import { renderCoach } from './screens/coachScreen.js';

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

```

## Bestand: src/ui/components/navigation.js
```js
import { state } from '../../state.js';
import { t } from '../../utils/i18n.js';
import { render } from '../core.js';

export function getBottomNavHTML(activeTab) {
  // SVG paths for icons (Feather icons)
  const icons = {
    home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    coach: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
    community: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    settings: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  };

  const tabs = [
    { id: 'home', icon: icons.home, label: t('nav.home') || 'Home' },
    { id: 'coach', icon: icons.coach, label: t('nav.coach') || 'Coach' },
    { id: 'community', icon: icons.community, label: t('nav.community') || 'Community' },
    { id: 'settings', icon: icons.settings, label: t('nav.settings') || 'Settings' }
  ];

  return `
    <nav class="bottom-nav">
      ${tabs.map(tab => `
        <button class="bottom-nav__item ${activeTab === tab.id ? 'bottom-nav__item--active' : ''}" data-nav-target="${tab.id}">
          <div class="bottom-nav__icon">${tab.icon}</div>
          <span class="bottom-nav__label">${tab.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

export function attachBottomNavListeners() {
  document.querySelectorAll('[data-nav-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-nav-target');
      state.screen = target;
      render();
    });
  });
}

```

## Bestand: src/ui/screens/homeScreen.js
```js
import { state } from '../../state.js';
import { app, render, escapeHTML, showDialog } from '../core.js';
import { getProfile, getUserName, isTodayComplete, getTotalCompleted, getCurrentWeek, getProgramStartDate, buildCalendarData, resetProgress } from '../../utils/storage.js';
import { getTodaysFocus, getGoalSubtitle } from '../../utils/scheduler.js';
import { getWeekProgression, buildWorkoutSteps } from '../../data/exercises.js';
import { loadCommunitiesAndLeaderboard } from './communityScreen.js';
import { t } from '../../utils/i18n.js';
import confetti from 'canvas-confetti';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';

export function renderHome() {
  const profile = getProfile();
  const name = getUserName();
  const todayDone = isTodayComplete();
  const totalCompleted = getTotalCompleted();
  const currentWeek = getCurrentWeek();
  const hasStarted = !!getProgramStartDate();
  const focus = getTodaysFocus();
  const subtitle = getGoalSubtitle();
  
  const baseLevels = profile?.baseLevels || { core: 1, 'benen-billen': 1, 'rug-houding': 1 };
  const avgBaseLevel = Math.round((baseLevels.core + baseLevels['benen-billen'] + baseLevels['rug-houding']) / 3) || 1;
  const weekProg = getWeekProgression(currentWeek, avgBaseLevel);

  const calendarHTML = renderCalendar();

  app.innerHTML = `
    <div class="screen home" id="home-screen">
      <div class="home__header">
        <div class="home__top-bar">
          <div class="home__leaf">🌿</div>
        </div>
        <h1 class="home__title">${t('home.greeting')}${name ? ` ${escapeHTML(name)}` : ''}!</h1>
        <p class="home__subtitle">${subtitle}</p>
        <div class="home__science-badge" id="science-badge" style="cursor: pointer; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; margin: 10px 0 15px 0; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          🔬 ${t('home.scienceBadge')}
        </div>
        <div class="home__meta">
          <div class="home__meta-item">
            <span class="home__meta-value">${profile ? profile.dailyMinutes : 15} min</span>
            <span class="home__meta-label">${t('home.minPerDay').replace('min ', '')}</span>
          </div>
          <div class="home__meta-item">
            <span class="home__meta-value">${profile ? profile.daysPerWeek : 6} ${t('home.daysPerWeek').split(' ')[0]}</span>
            <span class="home__meta-label">${t('home.daysPerWeek').replace(/^[^\s]+\s/, '')}</span>
          </div>
          <div class="home-stat">
            <span class="home-stat__value">${Math.min(8, avgBaseLevel + currentWeek - 1)}<span class="home-stat__max">/8</span></span>
            <span class="home-stat__label">${t('home.avgLevel')}</span>
          </div>
        </div>
      </div>

      ${hasStarted ? `
        <div class="home__today-focus">
          <span class="home__today-emoji">${focus.focusEmoji}</span>
          <div>
            <div class="home__today-label">${t('home.today')}</div>
            <div class="home__today-value">${focus.focusLabel}</div>
          </div>
        </div>
      ` : ''}

      <button class="home__start-btn ${todayDone ? 'home__start-btn--done' : ''}" id="start-btn">
        ${todayDone ? t('home.playAgain') : `${t('btn.start')} ${focus.focusLabel}`.replace('▶ Start', '▶')}
      </button>
      ${todayDone ? `<p class="home__already-done">${t('home.doneToday')}</p>` : ''}

      ${hasStarted ? `
        <div class="home__stats">
          <div class="home__stat-card">
            <div class="home__stat-number">${totalCompleted}</div>
            <div class="home__stat-label">${t('home.workouts')}</div>
          </div>
          <div class="home__stat-card">
            <div class="home__ring">
              <svg viewBox="0 0 36 36">
                <circle class="home__ring-track" cx="18" cy="18" r="14" />
                <circle class="home__ring-fill" cx="18" cy="18" r="14"
                  stroke-dasharray="${2 * Math.PI * 14}"
                  style="--ring-circumference: ${2 * Math.PI * 14}; --ring-offset: ${2 * Math.PI * 14 * (1 - currentWeek / 8)};"
                  stroke-dashoffset="${2 * Math.PI * 14}" />
              </svg>
              <div class="home__ring-value">${currentWeek}/8</div>
            </div>
            <div class="home__stat-label">${t('home.weeks')}</div>
          </div>
          <div class="home__stat-card">
            <div class="home__stat-number">${weekProg.label}</div>
            <div class="home__stat-label">${t('home.intensity')}</div>
          </div>
        </div>

        <div class="home__biometrics">
          <div class="home__biometrics-header">
            <span class="home__biometrics-title">Hartslagmeter (Bluetooth)</span>
            <span class="home__biometrics-source">${state.bluetoothDeviceId ? '🟢 Verbonden' : '⚪ Niet verbonden'}</span>
          </div>
          <div class="home__biometrics-grid">
            <div class="home__bio-item" style="grid-column: span 3; text-align: center; padding: 0.5rem;">
              <span class="home__bio-val">${state.bluetoothDeviceId && state.liveBpm ? `${state.liveBpm} BPM` : 'Geen sensor gekoppeld'}</span>
              <span class="home__bio-lbl">${state.bluetoothDeviceId ? 'Gemeten hartslag' : 'Koppel een Bluetooth hartslagmeter tijdens de workout'}</span>
            </div>
          </div>
        </div>
      ` : ''}

      ${calendarHTML}

      <div class="home__quote">
        <span class="home__quote-heart">♥</span> ${t('home.quote').replace(/♥/g, '')} <span class="home__quote-heart">♥</span>
      </div>

      </div>
      ${getBottomNavHTML('home')}
    `;

  attachBottomNavListeners();

  document.getElementById('start-btn').addEventListener('click', startWorkout);

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', handleReset);

  const scienceBadge = document.getElementById('science-badge');
  if (scienceBadge) {
    scienceBadge.addEventListener('click', () => {
      showDialog(t('dlg.science.title'), t('dlg.science.msg'), t('btn.confirm'), null, () => {});
    });
  }

  if (state.justFinishedWorkout) {
    state.justFinishedWorkout = false;
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3A5A40', '#A3B18A', '#F7F2EA', '#D4A373'],
        zIndex: 9999
      });
    }, 300);
  }
}

function renderCalendar() {
  const hasStarted = !!getProgramStartDate();
  const calendarData = buildCalendarData();
  const DAY_NAMES = t('calendar.days');
  let dayLabels = [DAY_NAMES[1], DAY_NAMES[2], DAY_NAMES[3], DAY_NAMES[4], DAY_NAMES[5], DAY_NAMES[6], DAY_NAMES[0]];

  if (hasStarted) {
    const startDate = getProgramStartDate();
    const startDow = startDate.getDay();
    dayLabels = [];
    for (let i = 0; i < 7; i++) {
      dayLabels.push(DAY_NAMES[(startDow + i) % 7]);
    }
  }

  return `
    <div class="calendar">
      <div class="calendar__title">${t('calendar.title')}</div>
      <div class="calendar__header">
        <span class="calendar__week-label-header"></span>
        ${dayLabels.map(d => `<span class="calendar__day-label">${d}</span>`).join('')}
      </div>
      <div class="calendar__grid">
        ${calendarData.map(week => `
          <div class="calendar__row ${week.isCurrent ? 'calendar__row--current' : ''}">
            <span class="calendar__week-label">${week.weekLabel}</span>
            ${week.days.map((day, di) => {
              let cellClass = 'calendar__cell';
              let cellContent = '';
              const cellIndex = calendarData.indexOf(week) * 7 + di;

              if (day.isCompleted) {
                cellClass += ' calendar__cell--completed';
                cellContent = day.completedIcon || '✓';
              } else if (day.isToday) {
                cellClass += ' calendar__cell--today';
                cellContent = day.dayNumber || '';
              } else if (day.isFuture) {
                cellClass += ' calendar__cell--future';
                cellContent = day.dayNumber || '';
              } else if (day.isPast) {
                cellContent = day.dayNumber || '';
              }

              return `<div class="${cellClass}" title="${day.date || ''}" style="--i: ${cellIndex}">${cellContent}</div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
      ${hasStarted ? `
        <div class="calendar__footer">
          <button class="calendar__reset-btn" id="reset-btn">${t('calendar.reset')}</button>
        </div>
      ` : ''}
    </div>
  `;
}

function handleReset() {
  showDialog(
    t('dlg.reset.title'),
    t('dlg.reset.msg'),
    t('btn.confirm'), t('btn.cancel'),
    () => { resetProgress(); render(); }
  );
}

import { startWorkout } from './workoutScreen.js';

```

## Bestand: src/ui/screens/workoutScreen.js
```js
import { state } from '../../state.js';
import { app, render, showDialog, showToast, playBeep, escapeHTML } from '../core.js';
import { getUserName, getProfile, markTodayComplete, getTotalCompleted, getMissedWorkouts } from '../../utils/storage.js';
import { getSection, getWeekProgression, buildWorkoutSteps } from '../../data/exercises.js';
import { getCurrentWeek } from '../../utils/storage.js';
import { getTodaysFocus } from '../../utils/scheduler.js';
import { t, getLanguage } from '../../utils/i18n.js';
import { connectHeartRateMonitor, disconnectHeartRateMonitor } from '../../utils/bluetooth.js';
import { pushUserProgress } from '../../utils/social.js';

export function renderWorkout() {
  const steps = state.workoutSteps;
  const step = steps[state.currentStepIndex];
  const totalSteps = steps.length;
  const progress = ((state.currentStepIndex) / totalSteps) * 100;
  const section = getSection(step.sectionId);
  const currentWeek = getCurrentWeek();
  
  const profile = getProfile();
  const baseLevel = profile?.baseLevels?.[section.id] || 1;
  const weekProg = getWeekProgression(currentWeek, baseLevel);
  const lang = getLanguage();

  if (state.showingSectionIntro) {
    renderSectionIntro(section, progress, totalSteps);
    return;
  }

  const sectionSteps = steps.filter(s => s.sectionId === step.sectionId);
  const uniqueExercises = [...new Set(sectionSteps.map(s => s.id))];
  const exerciseIndexInSection = uniqueExercises.indexOf(step.id) + 1;
  const totalInSection = uniqueExercises.length;

  app.innerHTML = `
    <div class="workout" id="workout-screen">
      <div class="workout__progress-bar">
        <div class="workout__progress-track">
          <div class="workout__progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="workout__progress-text">
          <span>${section.emoji} ${section.name[lang] || section.name} — ${exerciseIndexInSection}/${totalInSection}</span>
          <button class="workout__quit-btn" id="quit-btn">${t('btn.quit')}</button>
        </div>
      </div>

      <div class="exercise" id="exercise-container" style="--section-color: ${section.color}">
        <div class="exercise__badges">
          <div class="exercise__section-badge" style="background: ${section.color}22; color: ${section.color}">
            ${section.emoji} ${section.name[lang] || section.name}
          </div>
          <div class="exercise__week-badge">W${currentWeek} · ${weekProg.label}</div>
        </div>

        <div class="exercise__header">
          <h2 class="exercise__name">
            ${step.name}
            ${step.sideName ? `<span class="exercise__side-badge">${step.sideName} ${step.sideLabel ? (t('side.' + step.sideLabel) || step.sideLabel) : ''}</span>` : ''}
          </h2>
          <p class="exercise__instruction">${step.instruction[lang] || step.instruction}</p>
        </div>

        <div class="exercise__image-container">
          ${renderExerciseImage(step)}
        </div>

        <div class="workout__live-tracker">
          <div class="tracker-header">
            <span class="tracker-title">Smartwatch Sync</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button id="ble-connect-btn" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0;">🔗</button>
              <div class="tracker-pulse-dot" id="tracker-pulse-dot"></div>
            </div>
          </div>
          <div class="tracker-stats">
            <div class="tracker-stat">
              <span class="tracker-val" id="live-bpm">${state.liveBpm || 85}</span>
              <span class="tracker-lbl">BPM</span>
            </div>
            <div class="tracker-stat">
              <span class="tracker-val" id="live-kcal">${Math.floor(state.liveKcal || 0)}</span>
              <span class="tracker-lbl">Kcal</span>
            </div>
          </div>
          <div class="tracker-chart">
             <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
               <path d="M0,30 L10,25 L20,35 L30,15 L40,25 L50,5 L60,20 L70,30 L80,10 L90,25 L100,20" 
                     fill="none" stroke="var(--sage)" stroke-width="2" class="tracker-line" id="tracker-svg-path" />
             </svg>
          </div>
        </div>

        ${renderInteraction(step)}

        ${state.exerciseComplete ? `
          <button class="exercise__next-btn" id="next-btn">
            ${state.currentStepIndex < totalSteps - 1 ? t('btn.next') : t('btn.finish')}
          </button>
        ` : `
          <button class="exercise__skip-btn" id="skip-btn">${t('btn.skip')}</button>
        `}
      </div>
    </div>
  `;

  document.getElementById('quit-btn').addEventListener('click', handleQuit);
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.addEventListener('click', nextStep);
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) skipBtn.addEventListener('click', handleSkip);
  const bleBtn = document.getElementById('ble-connect-btn');
  if (bleBtn) bleBtn.addEventListener('click', handleBleConnect);
  attachInteractionListeners(step);
}

async function handleBleConnect() {
  try {
    const deviceId = await connectHeartRateMonitor(
      (bpm) => {
        state.liveBpm = bpm;
        const bpmEl = document.getElementById('live-bpm');
        if (bpmEl) bpmEl.textContent = state.liveBpm;
        
        // Pulse the dot
        const dot = document.getElementById('tracker-pulse-dot');
        if (dot) {
          dot.style.transform = 'scale(1.5)';
          setTimeout(() => dot.style.transform = 'scale(1)', 100);
        }
      },
      () => {
        state.bluetoothDeviceId = null;
        showToast('Smartwatch disconnected', 'warning');
      }
    );
    state.bluetoothDeviceId = deviceId;
    showToast('Smartwatch Connected!', 'success');
  } catch (error) {
    showToast('Koppelen mislukt', 'error');
  }
}

function renderExerciseImage(step) {
  const imgSrc = step && step.image ? `/images/${step.image}.webp` : '';
  return `
    <img
      class="exercise__image"
      src="${imgSrc}"
      alt="${escapeHTML(step ? step.name : 'Oefening')}"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
    />
    <div class="exercise__image-placeholder" style="display:none; align-items:center; justify-content:center; width:100%; height:100%; background:var(--bg-glass); border-radius:var(--radius-md);">
      ${getExerciseIcon(step ? step.id : '')}
    </div>
  `;
}

function getExerciseIcon(exerciseId) {
  // Return an elegant, minimalist abstract SVG shape instead of an emoji
  return `
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--sage); opacity: 0.8;">
      <circle cx="50" cy="50" r="40" stroke-dasharray="2 6" />
      <path d="M50 20 L80 80 L20 80 Z" stroke-width="1" />
      <circle cx="50" cy="50" r="10" fill="var(--sage-light)" opacity="0.3" stroke="none" />
    </svg>
  `;
}

function renderInteraction(step) {
  if (step.type === 'reps') return renderCircleInteraction('reps');
  if (step.type === 'timer') return renderCircleInteraction('timer');
  if (step.type === 'combo') {
    if (state.comboPhase === 'reps') return renderCircleInteraction('reps');
    return `
      <div class="hold-phase">
        <div class="hold-phase__label">${t('wk.hold')}</div>
        ${renderCircleInteraction('timer')}
      </div>
    `;
  }
  return '';
}

function renderCircleInteraction(mode) {
  const circumference = 2 * Math.PI * 78;

  if (mode === 'reps') {
    const progress = state.repsTotal > 0 ? (state.repsTotal - state.repsRemaining) / state.repsTotal : 0;
    const dashOffset = circumference * (1 - progress);
    return `
      <div class="interaction">
        <button class="interaction__circle" id="rep-tap">
          <svg class="interaction__svg" viewBox="0 0 180 180">
            <circle class="interaction__track" cx="90" cy="90" r="78" />
            <circle class="interaction__fill" cx="90" cy="90" r="78" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" id="rep-fill" />
          </svg>
          <div class="interaction__content">
            <span class="interaction__value" id="rep-count">${state.repsRemaining}</span>
            <span class="interaction__unit">${t('wk.ofReps', state.repsTotal)}</span>
          </div>
        </button>
        <p class="interaction__hint">${t('wk.tapHint')}</p>
      </div>
    `;
  } else {
    const progress = state.timerTotal > 0 ? (state.timerTotal - state.timerRemaining) / state.timerTotal : 0;
    const dashOffset = circumference * (1 - progress);
    return `
      <div class="interaction">
        <div class="interaction__circle interaction__circle--timer">
          <svg class="interaction__svg" viewBox="0 0 180 180">
            <circle class="interaction__track" cx="90" cy="90" r="78" />
            <circle class="interaction__fill" cx="90" cy="90" r="78" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" />
          </svg>
          <div class="interaction__content">
            <span class="interaction__value" id="timer-display">${state.timerRemaining}</span>
            <span class="interaction__unit">${t('wk.seconds')}</span>
          </div>
        </div>
        <button 
          class="interaction__timer-btn ${state.timerRunning ? 'interaction__timer-btn--pause' : 'interaction__timer-btn--start'}" 
          id="timer-btn"
          aria-label="${state.timerRunning ? 'Pauzeer timer' : 'Start timer'}">
          ${state.timerRunning ? '⏸' : '▶'}
        </button>
      </div>
    `;
  }
}

function renderSectionIntro(section, progress, totalSteps) {
  const name = getUserName();
  const n = name ? name : '';
  const encouragements = [
    t('wk.intro.encouragement2', n),
    t('wk.intro.encouragement3', n),
    t('wk.intro.encouragement4', n),
  ];
  const encouragement = state.currentStepIndex === 0
    ? t('wk.intro.encouragement1', n)
    : encouragements[Math.floor(Math.random() * encouragements.length)];
  const lang = getLanguage();

  app.innerHTML = `
    <div class="workout" id="workout-screen">
      <div class="workout__progress-bar">
        <div class="workout__progress-track">
          <div class="workout__progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="workout__progress-text">
          <span>${t('wk.nextSection')}</span>
          <button class="workout__quit-btn" id="quit-btn">${t('btn.quit')}</button>
        </div>
      </div>
      <div class="section-intro">
        <div class="section-intro__emoji">${section.emoji}</div>
        <h2 class="section-intro__name">${section.name[lang] || section.name}</h2>
        <p class="section-intro__duration">${section.duration[lang] || section.duration}</p>
        <p class="section-intro__encouragement">${encouragement}</p>
        <button class="section-intro__continue-btn" id="section-continue-btn">${t('wk.intro.btn')}</button>
      </div>
    </div>
  `;
  document.getElementById('quit-btn').addEventListener('click', handleQuit);
  document.getElementById('section-continue-btn').addEventListener('click', () => {
    state.showingSectionIntro = false;
    state.currentSectionId = section.id;
    render();
  });
}

export function startWorkout() {
  const focus = getTodaysFocus();
  const currentWeek = getCurrentWeek();
  const profile = getProfile();
  const gender = profile ? profile.gender : 'female';
  const baseLevels = profile ? (profile.baseLevels || {}) : {};

  // Debug logging for level issues
  console.log('[Workout] Starting workout:', {
    currentWeek,
    gender,
    baseLevels,
    focusSections: focus.sectionIds
  });

  state.screen = 'workout';
  state.todayFocus = focus;
  state.workoutSteps = buildWorkoutSteps(focus.sectionIds, currentWeek, gender, baseLevels);
  state.currentStepIndex = 0;
  state.exerciseComplete = false;
  state.showingSectionIntro = true;
  state.currentSectionId = null;
  state.skippedCount = 0;
  state.skippedCoreCount = 0;
  state.liveKcal = 0;
  state.liveBpm = 85;
  
  if (state.trackerInterval) clearInterval(state.trackerInterval);
  state.trackerInterval = setInterval(() => {
    if (state.screen !== 'workout') return;
    
    // Only update BPM if connected via Bluetooth
    if (state.bluetoothDeviceId && state.liveBpm) {
      const bpmEl = document.getElementById('live-bpm');
      if (bpmEl) bpmEl.textContent = state.liveBpm;
    }

    // Animate line if active
    const pathEl = document.getElementById('tracker-svg-path');
    if (pathEl) {
      const shift = Math.floor(Math.random() * 6) - 3;
      pathEl.style.transform = `translateY(${shift}px)`;
      pathEl.style.transition = 'transform 0.5s ease';
    }
  }, 1000);

  // Log the first few generated steps with their effective reps/durations
  console.log('[Workout] Generated steps (first 5):', state.workoutSteps.slice(0, 5).map(s => ({
    name: s.name,
    section: s.sectionId,
    reps: s.reps,
    duration: s.duration,
    weekLabel: s.weekLabel
  })));

  initializeStep(state.workoutSteps[0]);
  render();
}

function initializeStep(step) {
  clearTimerInterval();
  state.timerRunning = false;
  state.exerciseComplete = false;
  state.comboPhase = 'reps';
  state.lastRepTime = 0;

  if (step.type === 'reps') {
    state.repsRemaining = step.reps;
    state.repsTotal = step.reps;
  } else if (step.type === 'timer') {
    state.timerRemaining = step.duration;
    state.timerTotal = step.duration;
  } else if (step.type === 'combo') {
    state.repsRemaining = step.reps;
    state.repsTotal = step.reps;
    state.comboPhase = 'reps';
  }
}

function attachInteractionListeners(step) {
  if ((step.type === 'reps') || (step.type === 'combo' && state.comboPhase === 'reps')) {
    const tapArea = document.getElementById('rep-tap');
    if (tapArea) tapArea.addEventListener('click', handleRepTap);
  }
  if ((step.type === 'timer') || (step.type === 'combo' && state.comboPhase === 'hold')) {
    const timerBtn = document.getElementById('timer-btn');
    if (timerBtn) timerBtn.addEventListener('click', handleTimerToggle);
  }
}

function handleRepTap() {
  if (state.repsRemaining <= 0) return;

  const now = Date.now();
  if (state.lastRepTime > 0 && (now - state.lastRepTime < 3000)) {
    showToast(t('wk.tut.tooFast'), 'error');
    return;
  }
  state.lastRepTime = now;

  state.repsRemaining--;

  const countEl = document.getElementById('rep-count');
  const tapArea = document.getElementById('rep-tap');
  const fillEl = document.getElementById('rep-fill');

  if (countEl) countEl.textContent = state.repsRemaining;

  if (fillEl) {
    const circumference = 2 * Math.PI * 78;
    const progress = (state.repsTotal - state.repsRemaining) / state.repsTotal;
    fillEl.style.strokeDashoffset = circumference * (1 - progress);
  }

  if (tapArea) {
    tapArea.classList.remove('interaction__circle--pulse');
    void tapArea.offsetWidth;
    tapArea.classList.add('interaction__circle--pulse');
  }

  if (state.repsRemaining <= 0) {
    const step = state.workoutSteps[state.currentStepIndex];
    if (step.type === 'combo') {
      setTimeout(() => {
        state.comboPhase = 'hold';
        state.timerRemaining = step.holdDuration;
        state.timerTotal = step.holdDuration;
        render();
      }, 400);
    } else {
      setTimeout(() => {
        state.exerciseComplete = true;
        playBeep();
        render();
      }, 300);
    }
  }
}

function handleTimerToggle() {
  if (state.timerRunning) {
    clearTimerInterval();
    state.timerRunning = false;
    render();
  } else {
    state.timerRunning = true;
    render();

    state.timerInterval = setInterval(() => {
      state.timerRemaining--;

      if (state.timerRemaining <= 0) {
        state.timerRemaining = 0;
        clearTimerInterval();
        state.timerRunning = false;
        state.exerciseComplete = true;

        playBeep();
        
        render();
        return;
      }

      updateTimerDisplay();
    }, 1000);
  }
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display');
  const circleFill = document.querySelector('.interaction__fill');

  if (timerDisplay) timerDisplay.textContent = state.timerRemaining;

  if (circleFill) {
    const circumference = 2 * Math.PI * 78;
    const progress = (state.timerTotal - state.timerRemaining) / state.timerTotal;
    circleFill.style.strokeDashoffset = circumference * (1 - progress);
  }
}

function clearTimerInterval() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function handleSkip() {
  state.skippedCount++;
  
  const steps = state.workoutSteps;
  const currentStep = steps[state.currentStepIndex];
  if (currentStep && currentStep.sectionId !== 'warmup' && currentStep.sectionId !== 'stretch') {
    state.skippedCoreCount = (state.skippedCoreCount || 0) + 1;
  }

  const coreSteps = steps.filter(s => s.sectionId !== 'warmup' && s.sectionId !== 'stretch');
  const totalCoreCount = coreSteps.length || 1;
  const skippedCoreCount = state.skippedCoreCount || 0;

  if (skippedCoreCount === Math.floor(totalCoreCount / 2)) {
    showToast(t('wk.skipWarning'), 'error');
  }
  
  nextStep();
}

function nextStep() {
  clearTimerInterval();

  const steps = state.workoutSteps;
  const currentStep = steps[state.currentStepIndex];
  const nextIndex = state.currentStepIndex + 1;

  if (nextIndex >= steps.length) {
    const coreSteps = steps.filter(s => s.sectionId !== 'warmup' && s.sectionId !== 'stretch');
    const totalCoreCount = coreSteps.length || 1;
    const skippedCoreCount = state.skippedCoreCount || 0;

    if (skippedCoreCount > totalCoreCount / 2) {
      showDialog(
        t('wk.notCompleted.title'),
        t('wk.notCompleted.msg'),
        t('btn.confirm'),
        null,
        () => { state.screen = 'home'; render(); }
      );
      return;
    }

    if (state.trackerInterval) {
      clearInterval(state.trackerInterval);
      state.trackerInterval = null;
    }
    
    if (state.bluetoothDeviceId) {
      disconnectHeartRateMonitor(state.bluetoothDeviceId);
      state.bluetoothDeviceId = null;
    }

    const focus = state.todayFocus;
    markTodayComplete(focus ? focus.focusEmoji : '✓');
    
    // Push score to Firebase immediately upon completion (only once!)
    const profile = getProfile();
    if (profile) {
      const progressData = {
        name: profile.name,
        totalWorkouts: getTotalCompleted(),
        missedWorkouts: getMissedWorkouts(),
        currentWeek: getCurrentWeek()
      };
      console.log('[Workout] Pushing progress to Firebase:', progressData);
      pushUserProgress(progressData);
    }
    state.screen = 'complete';
    render();
    return;
  }

  const nextStepData = steps[nextIndex];
  if (nextStepData.sectionId !== currentStep.sectionId) {
    state.showingSectionIntro = true;
  }

  state.currentStepIndex = nextIndex;
  initializeStep(nextStepData);

  const exerciseContainer = document.getElementById('exercise-container');
  if (exerciseContainer && !state.showingSectionIntro) {
    exerciseContainer.classList.add('exercise--exit');
    setTimeout(() => render(), 200);
  } else {
    render();
  }
}

function handleQuit() {
  showDialog(
    t('dlg.quit.title'),
    t('dlg.quit.msg'),
    t('dlg.quit.confirm'), t('dlg.quit.cancel'),
    () => { 
      clearTimerInterval(); 
      if (state.trackerInterval) clearInterval(state.trackerInterval);
      if (state.bluetoothDeviceId) disconnectHeartRateMonitor(state.bluetoothDeviceId);
      state.screen = 'home'; 
      render(); 
    }
  );
}

```

## Bestand: src/ui/screens/coachScreen.js
```js
import { app, showToast, showDialog, escapeHTML } from '../core.js';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';
import { db } from '../../utils/firebase.js';
import { getCurrentUser } from '../../utils/auth.js';
import { getProfile, getTotalCompleted } from '../../utils/storage.js';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { 
  getAIProvider, 
  setAIProvider, 
  getSelectedLocalModelId, 
  setSelectedLocalModelId, 
  AVAILABLE_LOCAL_MODELS, 
  checkWebGPUSupport, 
  generateAIResponse,
  analyzeVideoForm
} from '../../utils/aiService.js';

let unsubscribeChat = null;

export function renderCoach() {
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }

  const currentProvider = getAIProvider();
  const currentModelId = getSelectedLocalModelId();

  app.innerHTML = `
    <div class="screen coach-screen">
      <div class="screen__header">
        <h1 class="screen__title">Kiné Coach</h1>
        <p class="screen__subtitle">Your private concierge & feedback.</p>
      </div>

      <div class="screen__content">
        <!-- Premium Video Form Check Card -->
        <div class="coach__premium-card" id="coach-form-check-card">
          <div class="coach__premium-icon">✨</div>
          <div class="coach__premium-text">
            <h2 class="coach__premium-title">Upload Video Form Check</h2>
            <p class="coach__premium-desc">Upload een video of foto van je Pilates oefening voor gepersonaliseerde, anatomische feedback via Gemini Multimodal AI.</p>
          </div>
          <button class="btn btn--primary coach__upload-btn" id="coach-upload-video-btn">
            🎥 Upload Video / Foto
          </button>
          <input type="file" id="form-check-file-input" accept="video/*,image/*" style="display: none;" />
        </div>

        <!-- AI Engine Bar -->
        <div class="coach__engine-bar" id="coach-engine-bar">
          <div class="coach__engine-info">
            <span class="coach__engine-icon">${currentProvider === 'local' ? '📱' : '☁️'}</span>
            <div class="coach__engine-details">
              <span class="coach__engine-title">${currentProvider === 'local' ? 'Lokale LLM (On-Device)' : 'Google Gemini (Cloud)'}</span>
              <span class="coach__engine-subtext" id="engine-subtext">
                ${currentProvider === 'local' ? getModelName(currentModelId) : 'Vereist internet & API-sleutel'}
              </span>
            </div>
          </div>
          <button class="btn btn--secondary coach__engine-btn" id="coach-engine-settings-btn">
            ⚙️ AI Kies
          </button>
        </div>

        <!-- Download / Processing Progress Bar -->
        <div class="coach__download-card" id="coach-download-card" style="display: none;">
          <div class="coach__download-header">
            <span class="coach__download-title" id="download-status-title">Model downloaden...</span>
            <span class="coach__download-pct" id="download-status-pct">0%</span>
          </div>
          <div class="coach__progress-bar">
            <div class="coach__progress-fill" id="download-progress-fill" style="width: 0%;"></div>
          </div>
          <p class="coach__download-detail" id="download-status-detail">Bestanden worden verwerkt...</p>
        </div>

        <div class="coach__chat" id="coach-chat-container">
          <div class="coach__loading">Connecting to Kiné Coach...</div>
        </div>
      </div>

      <div class="coach__input-area">
        <button class="coach__media-btn" id="coach-media-btn" title="Upload Video voor Form Check" aria-label="Upload video of foto voor Form Check">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </button>
        <input type="text" class="coach__input" id="coach-input" placeholder="Message your coach..." aria-label="Bericht voor Kiné Coach" />
        <button class="coach__send-btn" id="coach-send" aria-label="Verstuur bericht">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      <!-- Modal voor AI Selector -->
      <div class="modal" id="ai-settings-modal" style="display: none;">
        <div class="modal__content coach__modal-content">
          <div class="modal__header">
            <h3>AI Engine & Model Selectie</h3>
            <button class="modal__close" id="ai-modal-close">&times;</button>
          </div>
          <div class="modal__body">
            <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
              Kies hoe je AI Kiné Coach wil uitvoeren op je apparaat voor tekst-chat.
            </p>

            <div class="coach__option-group">
              <label class="coach__radio-card ${currentProvider === 'cloud' ? 'coach__radio-card--selected' : ''}" id="option-cloud">
                <input type="radio" name="ai_provider_radio" value="cloud" ${currentProvider === 'cloud' ? 'checked' : ''} />
                <div class="coach__radio-content">
                  <strong>☁️ Google Gemini Cloud (Aanbevolen)</strong>
                  <p>Directe antwoorden & Vorm Check. Lichtgewicht (0 MB download).</p>
                </div>
              </label>

              <label class="coach__radio-card ${currentProvider === 'local' ? 'coach__radio-card--selected' : ''}" id="option-local">
                <input type="radio" name="ai_provider_radio" value="local" ${currentProvider === 'local' ? 'checked' : ''} />
                <div class="coach__radio-content">
                  <strong>📱 Lokale LLM (On-Device via WebGPU)</strong>
                  <p>100% lokaal & privé. ⚠️ Vereist eenmalige download van 0.35 - 1.9 GB en WebGPU ondersteuning op je mobiel.</p>
                </div>
              </label>
            </div>

            <div class="coach__local-models-section" id="local-models-section" style="${currentProvider === 'local' ? 'display: block;' : 'display: none;'}">
              <h4 style="margin-top: 1.2rem; margin-bottom: 0.5rem;">Kies Lokaal Model (Llama 3.2 / DeepSeek R1 / Gemma 2 / Qwen 2.5)</h4>
              <div class="coach__model-list">
                ${AVAILABLE_LOCAL_MODELS.map(m => `
                  <div class="coach__model-card ${currentModelId === m.id ? 'coach__model-card--selected' : ''}" data-model-id="${m.id}">
                    <div class="coach__model-main">
                      <strong>${escapeHTML(m.name)}</strong>
                      <div>
                        ${m.badge ? `<span class="coach__model-badge">${escapeHTML(m.badge)}</span>` : ''}
                        <span class="coach__model-tag">${escapeHTML(m.size)}</span>
                      </div>
                    </div>
                    <p class="coach__model-desc">${escapeHTML(m.desc)}</p>
                    <span class="coach__model-ram">RAM advies: ${escapeHTML(m.recommendedRAM)}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="modal__footer" style="margin-top: 1.5rem; text-align: right;">
              <button class="btn btn--primary" id="ai-settings-save">Opslaan & Gebruiken</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${getBottomNavHTML('coach')}
  `;

  attachBottomNavListeners();

  const user = getCurrentUser();
  if (!user) {
    document.getElementById('coach-chat-container').innerHTML = `
      <div class="coach__message coach__message--received">
        <div class="coach__avatar">F</div>
        <div class="coach__bubble">Please log in to use the Kiné AI Coach.</div>
      </div>`;
    return;
  }

  // Setup Firebase Firestore chat stream
  const chatRef = collection(db, 'users', user.uid, 'chats');
  const q = query(chatRef, orderBy('createdAt', 'asc'));

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    const container = document.getElementById('coach-chat-container');
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="coach__message coach__message--received">
          <div class="coach__avatar">F</div>
          <div class="coach__bubble">
            Welcome to Kiné Premium. How can I assist you with your routine today?
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isUser = data.role === 'user';
      html += `
        <div class="coach__message ${isUser ? 'coach__message--sent' : 'coach__message--received'}">
          ${!isUser ? '<div class="coach__avatar">F</div>' : ''}
          <div class="coach__bubble">
            ${escapeHTML(data.text || '').replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    setTimeout(() => {
      const chatContainer = document.getElementById('coach-chat-container');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  });

  // Event Listeners voor AI Selector Modal
  const settingsBtn = document.getElementById('coach-engine-settings-btn');
  const modal = document.getElementById('ai-settings-modal');
  const modalClose = document.getElementById('ai-modal-close');
  const modalSave = document.getElementById('ai-settings-save');

  const optionCloud = document.getElementById('option-cloud');
  const optionLocal = document.getElementById('option-local');
  const localModelsSection = document.getElementById('local-models-section');

  if (settingsBtn && modal) {
    settingsBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
  }

  if (modalClose && modal) {
    modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
  }

  const radios = document.querySelectorAll('input[name="ai_provider_radio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isLocal = e.target.value === 'local';
      localModelsSection.style.display = isLocal ? 'block' : 'none';
      optionCloud.classList.toggle('coach__radio-card--selected', !isLocal);
      optionLocal.classList.toggle('coach__radio-card--selected', isLocal);
    });
  });

  let selectedModelInModal = currentModelId;
  const modelCards = document.querySelectorAll('.coach__model-card');
  modelCards.forEach(card => {
    card.addEventListener('click', () => {
      modelCards.forEach(c => c.classList.remove('coach__model-card--selected'));
      card.classList.add('coach__model-card--selected');
      selectedModelInModal = card.dataset.modelId;
    });
  });

  if (modalSave) {
    modalSave.addEventListener('click', async () => {
      const chosenProvider = document.querySelector('input[name="ai_provider_radio"]:checked').value;
      setAIProvider(chosenProvider);
      setSelectedLocalModelId(selectedModelInModal);

      if (chosenProvider === 'local') {
        const gpuCheck = await checkWebGPUSupport();
        if (!gpuCheck.supported) {
          showToast(gpuCheck.reason, 'error');
          setAIProvider('cloud');
          renderCoach();
          return;
        }
      }

      modal.style.display = 'none';
      showToast(`AI Engine ingesteld op: ${chosenProvider === 'local' ? 'Lokale LLM' : 'Google Gemini Cloud'}`);
      renderCoach();
    });
  }

  // Video Upload & Form Check Handler
  const fileInput = document.getElementById('form-check-file-input');
  const uploadBtn = document.getElementById('coach-upload-video-btn');
  const mediaBtn = document.getElementById('coach-media-btn');

  const triggerUpload = () => {
    if (fileInput) fileInput.click();
  };

  if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
  if (mediaBtn) mediaBtn.addEventListener('click', triggerUpload);

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      fileInput.value = '';

      showDialog(
        '🔒 Privacy & AI Form Check',
        'Vier stilstaande beelden uit je bestand worden verwerkt door Google Gemini AI voor anatomische feedback. Zorg dat er geen gevoelige beelden van derden zichtbaar zijn. Wil je doorgaan met de analyse?',
        'Ja, verwerk beelden',
        'Annuleren',
        async () => {
          const isVideo = file.type.startsWith('video/');
          const fileLabel = isVideo ? '🎥 [Videobestand geüpload voor Vorm-check]' : '📷 [Afbeelding geüpload voor Vorm-check]';

          try {
            await addDoc(chatRef, {
              role: 'user',
              text: fileLabel,
              createdAt: serverTimestamp()
            });

        const downloadCard = document.getElementById('coach-download-card');
        const downloadTitle = document.getElementById('download-status-title');
        const downloadPct = document.getElementById('download-status-pct');
        const downloadFill = document.getElementById('download-progress-fill');
        const downloadDetail = document.getElementById('download-status-detail');

        if (downloadCard) {
          downloadCard.style.display = 'block';
          downloadTitle.innerText = 'Video / Foto analyseren...';
          downloadPct.innerText = '10%';
          downloadFill.style.width = '10%';
          downloadDetail.innerText = 'Sleutelframes worden verwerkt...';
        }

        const chatContainer = document.getElementById('coach-chat-container');
        if (chatContainer) {
          const typingDiv = document.createElement('div');
          typingDiv.className = 'coach__typing';
          typingDiv.id = 'coach-typing-indicator';
          typingDiv.innerText = 'Kiné Gemini Multimodal is de houding aan het analyseren...';
          chatContainer.appendChild(typingDiv);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        const feedback = await analyzeVideoForm({
          file: file,
          exerciseName: 'Pilates Routine',
          onProgress: (text, pct) => {
            if (downloadCard) {
              downloadTitle.innerText = 'Kiné Form Check verwerken...';
              downloadPct.innerText = `${pct}%`;
              downloadFill.style.width = `${pct}%`;
              downloadDetail.innerText = text;
            }
          }
        });

        if (downloadCard) downloadCard.style.display = 'none';
        const indicator = document.getElementById('coach-typing-indicator');
        if (indicator) indicator.remove();

        const reportText = `✨ Kiné Anatomische Form Check Rapport:\n\n${feedback}`;
        await addDoc(chatRef, {
          role: 'model',
          text: reportText,
          createdAt: serverTimestamp()
        });

        showToast('Form Check analyse voltooid!', 'success');

      } catch (err) {
        console.error(err);
        const downloadCard = document.getElementById('coach-download-card');
        if (downloadCard) downloadCard.style.display = 'none';

        const indicator = document.getElementById('coach-typing-indicator');
        if (indicator) indicator.remove();

        await addDoc(chatRef, {
          role: 'model',
          text: `Fout bij Vorm-Check analyse: ${err.message}`,
          createdAt: serverTimestamp()
        });
        showToast(`Video-analyse mislukt: ${err.message}`, 'error');
      }
    });
  });
}

  // Send Message Logic
  const sendBtn = document.getElementById('coach-send');
  const input = document.getElementById('coach-input');

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    try {
      await addDoc(chatRef, {
        role: 'user',
        text: text,
        createdAt: serverTimestamp()
      });

      const qContext = query(chatRef, orderBy('createdAt', 'desc'), limit(5));
      const contextSnap = await getDocs(qContext);
      const history = [];
      contextSnap.forEach(doc => {
        const d = doc.data();
        history.unshift({
          role: d.role === 'user' ? 'user' : 'model',
          parts: [{ text: d.text }]
        });
      });

      const chatContainer = document.getElementById('coach-chat-container');
      if (chatContainer) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'coach__typing';
        typingDiv.id = 'coach-typing-indicator';
        typingDiv.innerText = getAIProvider() === 'local' ? 'Lokale AI denkt na...' : 'Kiné Coach is typing...';
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      const profile = getProfile();
      const completed = getTotalCompleted();
      const userContext = `De gebruiker heet ${profile.name || 'deze sporter'} en heeft als doel ${profile.goals ? profile.goals.join(' en ') : 'fit worden'}. Ze hebben tot nu toe ${completed} workouts voltooid.`;
      const systemInstruction = `Je bent Kiné Coach, een high-end AI fitness en Pilates coach in een exclusieve app. Geef korte, professionele en aanmoedigende antwoorden in het Nederlands. Maximaal 2-3 zinnen. Context: ${userContext}`;

      const downloadCard = document.getElementById('coach-download-card');
      const downloadTitle = document.getElementById('download-status-title');
      const downloadPct = document.getElementById('download-status-pct');
      const downloadFill = document.getElementById('download-progress-fill');
      const downloadDetail = document.getElementById('download-status-detail');

      const replyText = await generateAIResponse({
        prompt: text,
        history: history,
        systemInstruction: systemInstruction,
        onProgress: (progressText, pct) => {
          if (downloadCard) {
            downloadCard.style.display = 'block';
            downloadTitle.innerText = 'Lokale LLM Laden / Downloaden...';
            downloadPct.innerText = `${pct}%`;
            downloadFill.style.width = `${pct}%`;
            downloadDetail.innerText = progressText;
          }
        }
      });

      if (downloadCard) downloadCard.style.display = 'none';
      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();

      await addDoc(chatRef, {
        role: 'model',
        text: replyText,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      const downloadCard = document.getElementById('coach-download-card');
      if (downloadCard) downloadCard.style.display = 'none';

      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();

      console.error(e);
      await addDoc(chatRef, {
        role: 'model',
        text: `Fout (${getAIProvider() === 'local' ? 'Lokaal Model' : 'Gemini Cloud'}): ${e.message}`,
        createdAt: serverTimestamp()
      });
    }
  };

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function getModelName(id) {
  const found = AVAILABLE_LOCAL_MODELS.find(m => m.id === id);
  return found ? found.name : id;
}

```

## Bestand: src/ui/screens/communityScreen.js
```js
import { state } from '../../state.js';
import { app, render, showPrompt, showDialog, showToast, escapeHTML } from '../core.js';
import { loginWithGoogle, loginWithEmail, registerWithEmail, logout } from '../../utils/auth.js';
import { getLeaderboard, createCommunity, getUserCommunities, pushUserProgress } from '../../utils/social.js';
import { getProfile, getTotalCompleted, getCurrentWeek, getMissedWorkouts } from '../../utils/storage.js';
import { t } from '../../utils/i18n.js';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';

export function renderCommunityWrapper() {
  if (state.authLoading) {
    app.innerHTML = `<div class="screen community"><div class="community__loading">${t('comm.loading')}</div></div>`;
    return;
  }

  if (!state.currentUser) {
    renderLoginScreen();
  } else {
    renderCommunity();
  }
}

function renderLoginScreen() {
  const inviteCode = localStorage.getItem('pilates_pending_invite');
  app.innerHTML = `
    <div class="screen auth-screen">
      <div class="settings__header">
        <button class="settings__back-btn" id="auth-back">${t('btn.back')}</button>
      </div>
      <div class="auth__container">
        <div class="auth__icon">🏆</div>
        <h2 class="auth__title">${t('auth.title')}</h2>
        <p class="auth__subtitle">
          ${inviteCode ? t('auth.sub2', escapeHTML(inviteCode)) : t('auth.sub1')}
        </p>
        
        <button class="auth__btn auth__btn--google" id="login-google">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          ${t('auth.google')}
        </button>

        <div class="auth__divider">${t('auth.or')}</div>

        <form class="auth__form" id="email-form">
          <input type="email" class="settings__input" id="auth-email" placeholder="${t('auth.email')}" required />
          <input type="password" class="settings__input" id="auth-password" placeholder="${t('auth.pass')}" required minlength="6" />
          <div class="auth__buttons">
            <button type="submit" class="auth__btn auth__btn--email">${t('auth.loginBtn')}</button>
            <button type="button" class="auth__btn auth__btn--secondary" id="register-btn">${t('auth.regBtn')}</button>
          </div>
          <p class="auth__error" id="auth-error"></p>
        </form>
      </div>
    </div>
  `;

  document.getElementById('auth-back').addEventListener('click', () => { state.screen = 'home'; render(); });
  
  document.getElementById('login-google').addEventListener('click', async () => {
    const res = await loginWithGoogle();
    if (res.error) document.getElementById('auth-error').textContent = res.error;
  });

  document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    const res = await loginWithEmail(email, pass);
    if (res.error) document.getElementById('auth-error').textContent = res.error;
  });

  document.getElementById('register-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    if (!email || !pass) return document.getElementById('auth-error').textContent = t('auth.fieldsRequired');
    const res = await registerWithEmail(email, pass);
    if (res.error) document.getElementById('auth-error').textContent = res.error;
  });
}

export async function loadCommunitiesAndLeaderboard() {
  state.loadingLeaderboard = true;
  render();

  // Fallback: always push latest progress before fetching leaderboard
  // This ensures data is synced even if the post-workout push failed
  const profile = getProfile();
  if (profile) {
    await pushUserProgress({
      name: profile.name,
      totalWorkouts: getTotalCompleted(),
      missedWorkouts: getMissedWorkouts(),
      currentWeek: getCurrentWeek()
    });
  }

  state.myCommunities = await getUserCommunities();
  state.leaderboard = await getLeaderboard(state.activeCommunity);
  state.loadingLeaderboard = false;
  render();
}

function renderCommunity() {
  app.innerHTML = `
    <div class="screen community">
      <div class="settings__header">
        <h2 class="settings__title">${t('comm.title')}</h2>
        <button class="settings__back-btn" id="logout-btn" style="color:var(--rose-dark)">${t('comm.logout')}</button>
      </div>

      <div class="community__tabs">
        ${state.myCommunities.map(c => `
          <button class="community__tab ${state.activeCommunity === c.id ? 'community__tab--active' : ''}" data-cid="${c.id}">
            ${escapeHTML(c.name)}
          </button>
        `).join('')}
      </div>
      
      <div class="community__actions">
        ${state.activeCommunity !== 'global' ? `
          <button class="community__action-btn" id="invite-btn">${t('comm.inviteCopy')}</button>
        ` : ''}
        <button class="community__action-btn" id="create-group-btn">${t('comm.newGroup')}</button>
      </div>

      <div class="community__leaderboard">
        ${state.loadingLeaderboard ? `<div class="community__loading">${t('comm.loading')}</div>` : `
          ${state.leaderboard.length === 0 ? `<div class="community__empty">${t('comm.empty')}</div>` : `
            ${state.leaderboard.map((user, index) => {
              const rankColor = index===0 ? 'var(--gold)' : index===1 ? 'var(--silver)' : index===2 ? 'var(--bronze)' : 'var(--sage)';
              return `
              <div class="community__user">
                <div class="community__rank" style="color: ${rankColor}">${index + 1}</div>
                <div class="community__user-info">
                  <div class="community__user-name">${escapeHTML(user.name)} ${user.id === state.currentUser.uid ? t('comm.you') : ''}</div>
                  <div class="community__user-meta">${t('comm.week')} ${user.currentWeek} · ${t('comm.lastActive')} ${user.lastActive}</div>
                  ${user.missedWorkouts > 0 ? `<div class="community__user-meta" style="color: var(--rose-dark);">😴 ${user.missedWorkouts} ${t('comm.missed')}</div>` : ''}
                </div>
                <div class="community__user-score">
                  <span class="community__score-value">${user.totalWorkouts}</span>
                  <span class="community__score-label">${t('home.workouts')}</span>
                </div>
              </div>
              `;
            }).join('')}
          `}
        `}
      </div>
      
      </div>
      ${getBottomNavHTML('community')}
    `;

  attachBottomNavListeners();
  document.getElementById('logout-btn').addEventListener('click', async () => { await logout(); });

  document.querySelectorAll('.community__tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      state.activeCommunity = tab.dataset.cid;
      await loadCommunitiesAndLeaderboard();
    });
  });

  const inviteBtn = document.getElementById('invite-btn');
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => {
      const baseUrl = import.meta.env.VITE_APP_URL || 'https://pilates-22dcd.web.app';
      const link = `${baseUrl}/?invite=${state.activeCommunity}`;
      navigator.clipboard.writeText(link);
      inviteBtn.textContent = t('comm.inviteCopied');
      setTimeout(() => inviteBtn.textContent = t('comm.inviteCopy'), 2000);
    });
  }

  document.getElementById('create-group-btn').addEventListener('click', () => {
    showPrompt(
      t('comm.newGroup'),
      t('comm.createPrompt'),
      t('btn.confirm'),
      t('btn.cancel'),
      (name) => {
        if (name && name.trim()) {
          createCommunity(name.trim()).then(async (code) => {
            state.activeCommunity = code;
            await loadCommunitiesAndLeaderboard();
            showDialog(t('comm.createSuccess.title'), t('comm.createSuccess.msg'), t('btn.confirm'), null, () => {});
          }).catch(err => showToast(err.message || t('comm.createError'), 'error'));
        }
      }
    );
  });
}

```

## Bestand: src/ui/screens/completeScreen.js
```js
import { state } from '../../state.js';
import { app, render } from '../core.js';
import { getUserName, getTotalCompleted, getCurrentWeek, getProfile, getMissedWorkouts } from '../../utils/storage.js';
import { pushUserProgress } from '../../utils/social.js';
import { loadCommunitiesAndLeaderboard } from './communityScreen.js';
import { t } from '../../utils/i18n.js';

export function renderComplete() {
  const name = getUserName();
  const n = name ? name : '';
  const totalCompleted = getTotalCompleted();
  const currentWeek = getCurrentWeek();


  const messages = [
    t('comp.msg1', n),
    t('comp.msg2', n),
    t('comp.msg3', n),
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  app.innerHTML = `
    <div class="screen complete" id="complete-screen">
      <div class="complete__celebration">🎉</div>
      <h2 class="complete__title">${t('comp.title')}</h2>
      <p class="complete__message">${randomMessage}</p>

      <div class="complete__stats">
        <div class="complete__stat">
          <div class="complete__stat-value">${totalCompleted}</div>
          <div class="complete__stat-label">${t('comp.workoutsTotal')}</div>
        </div>
        <div class="complete__stat">
          <div class="complete__stat-value">${t('comm.week')} ${currentWeek}</div>
          <div class="complete__stat-label">${t('comp.currentWeek')}</div>
        </div>
      </div>

      <button class="complete__home-btn" id="home-btn">${t('comp.btn.home')}</button>
      <button class="complete__community-btn" id="goto-community-btn">${t('comp.btn.leaderboard')}</button>
    </div>
  `;

  document.getElementById('home-btn').addEventListener('click', () => {
    state.justFinishedWorkout = true;
    state.screen = 'home';
    render();
  });
  document.getElementById('goto-community-btn').addEventListener('click', () => {
    state.screen = 'community';
    render();
    if (state.currentUser) {
      loadCommunitiesAndLeaderboard();
    }
  });
}

```

## Bestand: src/ui/screens/onboardingScreen.js
```js
import { state } from '../../state.js';
import { app, render, escapeHTML } from '../core.js';
import { saveProfile, formatDate } from '../../utils/storage.js';
import { t, getLanguage } from '../../utils/i18n.js';

export function renderOnboarding() {
  const step = state.onboardingStep || 0;
  const data = state.onboardingData || { name: '', gender: 'female', goals: [], dailyMinutes: 15, daysPerWeek: 6, startDate: formatDate(new Date()), baseLevels: { core: 0, 'benen-billen': 0, 'rug-houding': 0 } };
  state.onboardingData = data;

  const steps = [
    renderStep0,
    renderStep1,
    renderStep2, // previously 3 (levels)
    renderStep3, // previously 4 (time)
    renderStep4, // previously 5 (start date)
  ];

  app.innerHTML = `
    <div class="screen onboarding" id="onboarding-screen">
      <div class="onboarding__progress">
        <div class="onboarding__progress-bar" style="width: ${((step + 1) / steps.length) * 100}%"></div>
      </div>
      <div class="onboarding__step-indicator">${t('ob.step.of', step + 1, steps.length)}</div>
      
      ${steps[step]()}

      <div class="onboarding__nav">
        ${step > 0 ? `<button class="onboarding__btn onboarding__btn--secondary" id="ob-prev">${t('btn.back')}</button>` : '<div></div>'}
        <button class="onboarding__btn" id="ob-next" ${!canProceed(step, data) ? 'disabled' : ''}>
          ${step === steps.length - 1 ? t('ob.btn.start') : t('btn.next')}
        </button>
      </div>
    </div>
  `;

  attachOnboardingListeners(step);
}

function renderStep0() {
  return `
    <h2 class="onboarding__title">${t('ob.welcome.title')}</h2>
    <p class="onboarding__subtitle">${t('ob.welcome.sub')}</p>
    <div class="onboarding__group">
      <label class="onboarding__label">${t('ob.name.label')}</label>
      <input type="text" class="onboarding__input" id="ob-name" placeholder="${t('ob.name.placeholder')}" value="${escapeHTML(state.onboardingData.name)}" autofocus>
    </div>
  `;
}

function renderStep1() {
  return `
    <h2 class="onboarding__title">${t('ob.gender.title')}</h2>
    <p class="onboarding__subtitle">${t('ob.gender.sub')}</p>
    <div class="onboarding__options" id="ob-gender-options">
      ${renderOption('gender', 'female', '👩', t('ob.gender.f'), state.onboardingData.gender === 'female')}
      ${renderOption('gender', 'male', '👨', t('ob.gender.m'), state.onboardingData.gender === 'male')}
      ${renderOption('gender', 'neutral', '🧑', t('ob.gender.n'), state.onboardingData.gender === 'neutral')}
    </div>
  `;
}

function renderStep2() {
  const data = state.onboardingData;
  return `
    <h2 class="onboarding__title">${t('ob.level.title')}</h2>
    <p class="onboarding__subtitle">${t('ob.level.sub')}</p>
    
    <div class="onboarding__group">
      <label class="onboarding__label">${t('set.lvl.core')}</label>
      <select class="settings__input" id="ob-level-core">
        <option value="0" ${data.baseLevels.core === 0 ? 'selected' : ''}>${t('set.lvl.0')}</option>
        <option value="1" ${data.baseLevels.core === 1 ? 'selected' : ''}>${t('ob.level.beg.title')} - ${t('ob.level.beg.desc')}</option>
        <option value="4" ${data.baseLevels.core === 4 ? 'selected' : ''}>${t('ob.level.int.title')} - ${t('ob.level.int.desc')}</option>
        <option value="6" ${data.baseLevels.core === 6 ? 'selected' : ''}>${t('ob.level.adv.title')} - ${t('ob.level.adv.desc')}</option>
      </select>
    </div>

    <div class="onboarding__group">
      <label class="onboarding__label">${t('set.lvl.legs')}</label>
      <select class="settings__input" id="ob-level-benen">
        <option value="0" ${data.baseLevels['benen-billen'] === 0 ? 'selected' : ''}>${t('set.lvl.0')}</option>
        <option value="1" ${data.baseLevels['benen-billen'] === 1 ? 'selected' : ''}>${t('ob.level.beg.title')} - ${t('ob.level.beg.desc')}</option>
        <option value="4" ${data.baseLevels['benen-billen'] === 4 ? 'selected' : ''}>${t('ob.level.int.title')} - ${t('ob.level.int.desc')}</option>
        <option value="6" ${data.baseLevels['benen-billen'] === 6 ? 'selected' : ''}>${t('ob.level.adv.title')} - ${t('ob.level.adv.desc')}</option>
      </select>
    </div>

    <div class="onboarding__group">
      <label class="onboarding__label">${t('set.lvl.back')}</label>
      <select class="settings__input" id="ob-level-rug">
        <option value="0" ${data.baseLevels['rug-houding'] === 0 ? 'selected' : ''}>${t('set.lvl.0')}</option>
        <option value="1" ${data.baseLevels['rug-houding'] === 1 ? 'selected' : ''}>${t('ob.level.beg.title')} - ${t('ob.level.beg.desc')}</option>
        <option value="4" ${data.baseLevels['rug-houding'] === 4 ? 'selected' : ''}>${t('ob.level.int.title')} - ${t('ob.level.int.desc')}</option>
        <option value="6" ${data.baseLevels['rug-houding'] === 6 ? 'selected' : ''}>${t('ob.level.adv.title')} - ${t('ob.level.adv.desc')}</option>
      </select>
    </div>
  `;
}

function renderStep3() {
  const min = state.onboardingData.dailyMinutes;
  const days = state.onboardingData.daysPerWeek;
  const stretch = state.onboardingData.includeStretch !== false;
  const lang = getLanguage();
  
  return `
    <h2 class="onboarding__title">${t('ob.time.title')}</h2>
    <p class="onboarding__subtitle">${t('ob.time.sub')}</p>
    <div class="onboarding__group">
      <label class="onboarding__label">${t('ob.time.minLabel')}</label>
      <div class="onboarding__options" id="ob-min-options">
        ${renderOption('min', 10, '⏱', '10 min', min === 10)}
        ${renderOption('min', 15, '⏱', '15 min', min === 15)}
        ${renderOption('min', 20, '⏱', '20 min', min === 20)}
      </div>
    </div>
    <div class="onboarding__group">
      <label class="onboarding__label">${t('ob.time.daysLabel')}</label>
      <div class="onboarding__options" id="ob-days-options">
        ${renderOption('days', 3, '📅', '3 dgn', days === 3)}
        ${renderOption('days', 4, '📅', '4 dgn', days === 4)}
        ${renderOption('days', 5, '📅', '5 dgn', days === 5)}
        ${renderOption('days', 6, '📅', '6 dgn', days === 6)}
      </div>
    </div>
    <div class="onboarding__group">
      <label class="onboarding__label">${t('set.stretch')}</label>
      <div class="onboarding__options" id="ob-stretch-options">
        ${renderOption('stretch', 'true', '✅', lang === 'nl' ? 'Ja' : 'Yes', stretch === true)}
        ${renderOption('stretch', 'false', '❌', lang === 'nl' ? 'Nee' : 'No', stretch === false)}
      </div>
    </div>
  `;
}

function renderStep4() {
  const minDate = formatDate(new Date());
  return `
    <h2 class="onboarding__title">${t('ob.start.title')}</h2>
    <p class="onboarding__subtitle">${t('ob.start.sub')}</p>
    <div class="onboarding__group">
      <input type="date" class="onboarding__input" id="ob-start-date" value="${state.onboardingData.startDate || minDate}" min="${minDate}" />
    </div>
  `;
}

function renderOption(type, value, emoji, label, isSelected) {
  return `
    <button class="onboarding__option ${isSelected ? 'onboarding__option--selected' : ''}" data-${type}="${value}">
      <span class="onboarding__option-emoji">${emoji}</span>
      <span class="onboarding__option-label">${label}</span>
    </button>
  `;
}

function canProceed(step, data) {
  if (step === 0 && !data.name.trim()) return false;
  if (step === 1 && !data.gender) return false;
  return true;
}

function attachOnboardingListeners(step) {
  const prevBtn = document.getElementById('ob-prev');
  const nextBtn = document.getElementById('ob-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      saveStepData(step);
      state.onboardingStep--;
      render();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      saveStepData(step);
      if (step === steps.length - 1) {
        completeOnboarding();
      } else {
        state.onboardingStep++;
        render();
      }
    });
  }

  if (step === 0) {
    const input = document.getElementById('ob-name');
    input.addEventListener('input', () => {
      state.onboardingData.name = input.value;
      nextBtn.disabled = !canProceed(0, state.onboardingData);
    });
  } else if (step === 1) {
    document.querySelectorAll('#ob-gender-options .onboarding__option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.onboardingData.gender = btn.dataset.gender;
        render();
      });
    });
  } else if (step === 3) {
    document.querySelectorAll('#ob-min-options .onboarding__option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.onboardingData.dailyMinutes = parseInt(btn.dataset.min);
        render();
      });
    });
    document.querySelectorAll('#ob-days-options .onboarding__option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.onboardingData.daysPerWeek = parseInt(btn.dataset.days);
        render();
      });
    });
    document.querySelectorAll('#ob-stretch-options .onboarding__option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.onboardingData.includeStretch = btn.dataset.stretch === 'true';
        render();
      });
    });
  }
}

function saveStepData(step) {
  if (step === 0) {
    state.onboardingData.name = document.getElementById('ob-name').value.trim();
  } else if (step === 2) {
    state.onboardingData.baseLevels = {
      core: parseInt(document.getElementById('ob-level-core').value),
      'benen-billen': parseInt(document.getElementById('ob-level-benen').value),
      'rug-houding': parseInt(document.getElementById('ob-level-rug').value),
    };
  } else if (step === 4) {
    state.onboardingData.startDate = document.getElementById('ob-start-date').value;
  }
}

function completeOnboarding() {
  const finalProfile = { ...state.onboardingData, onboardingComplete: true };
  saveProfile(finalProfile);
  state.screen = 'home';
  render();
}

```

## Bestand: src/ui/screens/settingsScreen.js
```js
import { state } from '../../state.js';
import { app, render, showDialog, escapeHTML } from '../core.js';
import { getProfile, saveProfile, resetAll, formatDate } from '../../utils/storage.js';
import { t, getLanguage } from '../../utils/i18n.js';
import { applyTheme } from '../../main.js';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';

export function renderSettings() {
  const profile = getProfile() || {};
  const lang = getLanguage();
  const theme = profile.theme || 'auto';
  
  const genders = [
    { id: 'female', emoji: '👩', label: t('ob.gender.f') },
    { id: 'male', emoji: '👨', label: t('ob.gender.m') },
    { id: 'neutral', emoji: '🧑', label: t('ob.gender.n') },
  ];

  app.innerHTML = `
    <div class="screen settings">
      <div class="settings__header">
        <h2 class="settings__title">${t('set.title')}</h2>
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.name')}</label>
        <input class="settings__input" type="text" id="set-name" value="${escapeHTML(profile.name || '')}" />
      </div>

      <div class="settings__row">
        <div class="settings__group settings__group--half">
          <label class="settings__label">${t('set.language')}</label>
          <select class="settings__select" id="set-language">
            <option value="nl" ${lang === 'nl' ? 'selected' : ''}>🇳🇱 Nederlands</option>
            <option value="en" ${lang === 'en' ? 'selected' : ''}>🇬🇧 English</option>
          </select>
        </div>
        <div class="settings__group settings__group--half">
          <label class="settings__label">${t('set.theme')}</label>
          <select class="settings__select" id="set-theme">
            <option value="auto" ${theme === 'auto' ? 'selected' : ''}>🌓 ${t('set.theme.auto')}</option>
            <option value="light" ${theme === 'light' ? 'selected' : ''}>☀️ ${t('set.theme.light')}</option>
            <option value="dark" ${theme === 'dark' ? 'selected' : ''}>🌙 ${t('set.theme.dark')}</option>
          </select>
        </div>
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.startDate')}</label>
        <input type="date" class="settings__input" id="set-date" value="${profile.startDate || formatDate(new Date())}" />
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.lvl.core')}</label>
        <select class="settings__input" id="set-level-core">
          <option value="0" ${profile.baseLevels?.core === 0 ? 'selected' : ''}>${t('set.lvl.0')}</option>
          <option value="1" ${profile.baseLevels?.core === 1 ? 'selected' : ''}>${t('set.lvl.1')}</option>
          <option value="2" ${profile.baseLevels?.core === 2 ? 'selected' : ''}>${t('set.lvl.2')}</option>
          <option value="3" ${profile.baseLevels?.core === 3 ? 'selected' : ''}>${t('set.lvl.3')}</option>
          <option value="4" ${profile.baseLevels?.core === 4 ? 'selected' : ''}>${t('set.lvl.4')}</option>
          <option value="5" ${profile.baseLevels?.core === 5 ? 'selected' : ''}>${t('set.lvl.5')}</option>
          <option value="6" ${profile.baseLevels?.core === 6 ? 'selected' : ''}>${t('set.lvl.6')}</option>
          <option value="7" ${profile.baseLevels?.core === 7 ? 'selected' : ''}>${t('set.lvl.7')}</option>
          <option value="8" ${profile.baseLevels?.core === 8 ? 'selected' : ''}>${t('set.lvl.8')}</option>
        </select>
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.lvl.legs')}</label>
        <select class="settings__input" id="set-level-benen">
          <option value="0" ${profile.baseLevels?.['benen-billen'] === 0 ? 'selected' : ''}>${t('set.lvl.0')}</option>
          <option value="1" ${profile.baseLevels?.['benen-billen'] === 1 ? 'selected' : ''}>${t('set.lvl.1')}</option>
          <option value="2" ${profile.baseLevels?.['benen-billen'] === 2 ? 'selected' : ''}>${t('set.lvl.2')}</option>
          <option value="3" ${profile.baseLevels?.['benen-billen'] === 3 ? 'selected' : ''}>${t('set.lvl.3')}</option>
          <option value="4" ${profile.baseLevels?.['benen-billen'] === 4 ? 'selected' : ''}>${t('set.lvl.4')}</option>
          <option value="5" ${profile.baseLevels?.['benen-billen'] === 5 ? 'selected' : ''}>${t('set.lvl.5')}</option>
          <option value="6" ${profile.baseLevels?.['benen-billen'] === 6 ? 'selected' : ''}>${t('set.lvl.6')}</option>
          <option value="7" ${profile.baseLevels?.['benen-billen'] === 7 ? 'selected' : ''}>${t('set.lvl.7')}</option>
          <option value="8" ${profile.baseLevels?.['benen-billen'] === 8 ? 'selected' : ''}>${t('set.lvl.8')}</option>
        </select>
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.lvl.back')}</label>
        <select class="settings__input" id="set-level-rug">
          <option value="0" ${profile.baseLevels?.['rug-houding'] === 0 ? 'selected' : ''}>${t('set.lvl.0')}</option>
          <option value="1" ${profile.baseLevels?.['rug-houding'] === 1 ? 'selected' : ''}>${t('set.lvl.1')}</option>
          <option value="2" ${profile.baseLevels?.['rug-houding'] === 2 ? 'selected' : ''}>${t('set.lvl.2')}</option>
          <option value="3" ${profile.baseLevels?.['rug-houding'] === 3 ? 'selected' : ''}>${t('set.lvl.3')}</option>
          <option value="4" ${profile.baseLevels?.['rug-houding'] === 4 ? 'selected' : ''}>${t('set.lvl.4')}</option>
          <option value="5" ${profile.baseLevels?.['rug-houding'] === 5 ? 'selected' : ''}>${t('set.lvl.5')}</option>
          <option value="6" ${profile.baseLevels?.['rug-houding'] === 6 ? 'selected' : ''}>${t('set.lvl.6')}</option>
          <option value="7" ${profile.baseLevels?.['rug-houding'] === 7 ? 'selected' : ''}>${t('set.lvl.7')}</option>
          <option value="8" ${profile.baseLevels?.['rug-houding'] === 8 ? 'selected' : ''}>${t('set.lvl.8')}</option>
        </select>
      </div>


      <div class="settings__row">
        <div class="settings__group settings__group--half">
          <label class="settings__label">${t('set.gender')}</label>
          <select class="settings__select" id="set-gender">
            ${genders.map(g => `<option value="${g.id}" ${profile.gender === g.id ? 'selected' : ''}>${g.emoji} ${g.label}</option>`).join('')}
          </select>
        </div>
        <div class="settings__group settings__group--half">
          <label class="settings__label">${t('set.stretch')}</label>
          <select class="settings__select" id="set-stretch">
            <option value="true" ${profile.includeStretch !== false ? 'selected' : ''}>✅ ${lang === 'nl' ? 'Ja' : 'Yes'}</option>
            <option value="false" ${profile.includeStretch === false ? 'selected' : ''}>❌ ${lang === 'nl' ? 'Nee' : 'No'}</option>
          </select>
        </div>
      </div>

      <div class="settings__row">
        <div class="settings__group settings__group--half">
          <label class="settings__label">${t('ob.time.minLabel')}</label>
          <select class="settings__select" id="set-minutes">
            <option value="10" ${profile.dailyMinutes === 10 ? 'selected' : ''}>10 min</option>
            <option value="15" ${profile.dailyMinutes === 15 ? 'selected' : ''}>15 min</option>
            <option value="20" ${profile.dailyMinutes === 20 ? 'selected' : ''}>20 min</option>
          </select>
        </div>
        <div class="settings__group settings__group--half">
          <label class="settings__label">${t('ob.time.daysLabel')}</label>
          <select class="settings__select" id="set-days">
            <option value="3" ${profile.daysPerWeek === 3 ? 'selected' : ''}>3 dgn</option>
            <option value="4" ${profile.daysPerWeek === 4 ? 'selected' : ''}>4 dgn</option>
            <option value="5" ${profile.daysPerWeek === 5 ? 'selected' : ''}>5 dgn</option>
            <option value="6" ${profile.daysPerWeek === 6 ? 'selected' : ''}>6 dgn</option>
          </select>
        </div>
      </div>

      <button class="settings__save-btn" id="settings-save">${t('btn.save')}</button>

      <div class="settings__danger">
        <button class="settings__reset-all-btn" id="settings-reset-all">${t('set.resetAll')}</button>
      </div>

      </div>
      ${getBottomNavHTML('settings')}
    `;

  attachBottomNavListeners();

  const langSelect = document.getElementById('set-language');
  langSelect.addEventListener('change', () => {
    profile.language = langSelect.value;
    saveProfile(profile);
    render();
  });

  const themeSelect = document.getElementById('set-theme');
  themeSelect.addEventListener('change', () => {
    profile.theme = themeSelect.value;
    saveProfile(profile);
    if (typeof applyTheme === 'function') applyTheme();
  });

  document.getElementById('settings-save').addEventListener('click', () => {
    const dInput = document.getElementById('set-date');
    let newDate = dInput.value;
    const todayStr = formatDate(new Date());
    if (newDate < todayStr) newDate = todayStr;


    const updatedProfile = {
      ...profile,
      name: document.getElementById('set-name').value.trim() || 'Pilates Fan',
      gender: document.getElementById('set-gender').value,
      language: document.getElementById('set-language').value,
      theme: document.getElementById('set-theme').value,
      dailyMinutes: parseInt(document.getElementById('set-minutes').value),
      daysPerWeek: parseInt(document.getElementById('set-days').value),
      startDate: newDate,
      baseLevels: {
        'core': parseInt(document.getElementById('set-level-core').value),
        'benen-billen': parseInt(document.getElementById('set-level-benen').value),
        'rug-houding': parseInt(document.getElementById('set-level-rug').value)
      },
      includeStretch: document.getElementById('set-stretch').value === 'true',
      onboardingComplete: true,
    };
    saveProfile(updatedProfile);
    if (typeof applyTheme === 'function') applyTheme();
    state.screen = 'home';
    render();
  });

  document.getElementById('settings-reset-all').addEventListener('click', () => {
    showDialog(
      t('dlg.resetAll.title'),
      t('dlg.resetAll.msg'),
      t('btn.confirm'),
      t('btn.cancel'),
      () => {
        resetAll();
        state.screen = 'onboarding';
        state.onboardingStep = 0;
        state.onboardingData = { name: '', gender: 'female', dailyMinutes: 15, daysPerWeek: 6, startDate: '', baseLevels: { core: 0, 'benen-billen': 0, 'rug-houding': 0 } };
        render();
      }
    );
  });
}

```


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

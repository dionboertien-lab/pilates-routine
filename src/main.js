import './style.css';
import { state } from './state.js';
import { render } from './ui/core.js';
import { isOnboardingComplete } from './utils/storage.js';
import { subscribeToAuth } from './utils/auth.js';
import { getLeaderboard, getUserCommunities } from './utils/social.js';

// Setup auth listener
subscribeToAuth(async (user) => {
  state.currentUser = user;
  state.authLoading = false;
  if (user && state.screen === 'community') {
    state.loadingLeaderboard = true;
    render();
    state.myCommunities = await getUserCommunities();
    state.leaderboard = await getLeaderboard(state.activeCommunity);
    state.loadingLeaderboard = false;
    render();
  } else if (state.screen === 'community' || state.screen === 'auth-screen') {
    render();
  }
});

// Initial boot
import { getProfile } from './utils/storage.js';
import { StatusBar, Style } from '@capacitor/status-bar';

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
    state.screen = 'home';
    render();
  }
});

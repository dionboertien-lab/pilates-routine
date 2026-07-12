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
              const rankColor = index===0 ? '#FFD700' : index===1 ? '#C0C0C0' : index===2 ? '#CD7F32' : 'var(--sage)';
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

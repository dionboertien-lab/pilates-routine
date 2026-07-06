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

  // Push score to Firebase immediately when reaching completion screen
  const profile = getProfile();
  if (profile) {
    const progressData = {
      name: profile.name,
      totalWorkouts: totalCompleted,
      missedWorkouts: getMissedWorkouts(),
      currentWeek: currentWeek
    };
    console.log('[Complete] Pushing progress to Firebase:', progressData);
    pushUserProgress(progressData);
  }

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

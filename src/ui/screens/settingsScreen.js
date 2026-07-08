import { state } from '../../state.js';
import { app, render, showDialog } from '../core.js';
import { getProfile, saveProfile, resetAll, formatDate } from '../../utils/storage.js';
import { t, getLanguage } from '../../utils/i18n.js';
import { applyTheme } from '../../main.js';

export function renderSettings() {
  const profile = getProfile() || {};
  const lang = getLanguage();
  const theme = profile.theme || 'auto';
  
  const genders = [
    { id: 'female', emoji: '👩', label: t('ob.gender.f') },
    { id: 'male', emoji: '👨', label: t('ob.gender.m') },
    { id: 'neutral', emoji: '🧑', label: t('ob.gender.n') },
  ];
  const goals = [
    { id: 'billen-benen', emoji: '🦵', label: t('ob.goals.legs') },
    { id: 'core', emoji: '🧱', label: t('ob.goals.core') },
    { id: 'rug', emoji: '🧘', label: t('ob.goals.back') },
    { id: 'alles', emoji: '⭐', label: t('ob.goals.all') },
  ];
  const selectedGoals = profile.goals || ['alles'];

  app.innerHTML = `
    <div class="screen settings">
      <div class="settings__header">
        <button class="settings__back-btn" id="settings-back">${t('btn.back')}</button>
        <h2 class="settings__title">${t('set.title')}</h2>
        <div></div>
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.name')}</label>
        <input class="settings__input" type="text" id="set-name" value="${profile.name || ''}" />
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

      <div class="settings__field">
        <label class="settings__label">${t('set.gender')}</label>
        <select class="settings__select" id="set-gender">
          ${genders.map(g => `<option value="${g.id}" ${profile.gender === g.id ? 'selected' : ''}>${g.emoji} ${g.label}</option>`).join('')}
        </select>
      </div>

      <div class="settings__group">
        <label class="settings__label">${t('set.goals')}</label>
        <div class="settings__goals" id="settings-goals">
          ${goals.map(g => `
            <button
              class="onboarding__option ${selectedGoals.includes(g.id) ? 'onboarding__option--selected' : ''}"
              data-goal="${g.id}"
            >
              <span class="onboarding__option-emoji">${g.emoji}</span>
              <span class="onboarding__option-label">${g.label}</span>
            </button>
          `).join('')}
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
  `;

  let currentGoals = [...selectedGoals];

  document.getElementById('settings-back').addEventListener('click', () => {
    state.screen = 'home';
    render();
  });

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

  document.querySelectorAll('#settings-goals [data-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.goal;
      if (goalId === 'alles') {
        currentGoals = ['alles'];
      } else {
        currentGoals = currentGoals.filter(g => g !== 'alles');
        if (currentGoals.includes(goalId)) {
          currentGoals = currentGoals.filter(g => g !== goalId);
        } else {
          currentGoals.push(goalId);
        }
      }
      if (currentGoals.length === 0) currentGoals = ['alles'];
      document.querySelectorAll('#settings-goals [data-goal]').forEach(b => {
        b.classList.toggle('onboarding__option--selected', currentGoals.includes(b.dataset.goal));
      });
    });
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
      goals: currentGoals.length > 0 ? currentGoals : ['alles'],
      dailyMinutes: parseInt(document.getElementById('set-minutes').value),
      daysPerWeek: parseInt(document.getElementById('set-days').value),
      startDate: newDate,
      baseLevels: {
        'core': parseInt(document.getElementById('set-level-core').value),
        'benen-billen': parseInt(document.getElementById('set-level-benen').value),
        'rug-houding': parseInt(document.getElementById('set-level-rug').value)
      },
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
        state.onboardingData = { name: '', gender: 'female', goals: [], dailyMinutes: 15, daysPerWeek: 6, startDate: '' };
        render();
      }
    );
  });
}

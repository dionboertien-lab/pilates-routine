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

import { state } from '../../state.js';
import { app, render, escapeHTML } from '../core.js';
import { saveProfile, formatDate } from '../../utils/storage.js';
import { t, getLanguage } from '../../utils/i18n.js';

export function renderOnboarding() {
  const step = state.onboardingStep || 0;
  const data = state.onboardingData || { name: '', goals: [], dailyMinutes: 15, daysPerWeek: 6, startDate: formatDate(new Date()), baseLevels: { core: 0, 'benen-billen': 0, 'rug-houding': 0 } };
  state.onboardingData = data;

  const steps = [
    renderStep0, // name
    renderStep2, // level
    renderStep3, // time & days
    renderStep4, // start date
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

  attachOnboardingListeners(step, steps.length);
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
  return true;
}

function attachOnboardingListeners(step, totalSteps = 4) {
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
      if (step === totalSteps - 1) {
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
  } else if (step === 2) {
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
    const el = document.getElementById('ob-name');
    if (el) state.onboardingData.name = el.value.trim();
  } else if (step === 1) {
    const coreEl = document.getElementById('ob-level-core');
    const benenEl = document.getElementById('ob-level-benen');
    const rugEl = document.getElementById('ob-level-rug');
    if (coreEl && benenEl && rugEl) {
      state.onboardingData.baseLevels = {
        core: parseInt(coreEl.value),
        'benen-billen': parseInt(benenEl.value),
        'rug-houding': parseInt(rugEl.value),
      };
    }
  } else if (step === 3) {
    const el = document.getElementById('ob-start-date');
    if (el) state.onboardingData.startDate = el.value;
  }
}

function completeOnboarding() {
  const finalProfile = { ...state.onboardingData, onboardingComplete: true };
  saveProfile(finalProfile);
  state.screen = 'home';
  render();
}

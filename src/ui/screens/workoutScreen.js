import { state } from '../../state.js';
import { app, render, showDialog, showToast, playBeep } from '../core.js';
import { getUserName, getProfile, markTodayComplete } from '../../utils/storage.js';
import { getSection, getWeekProgression, buildWorkoutSteps } from '../../data/exercises.js';
import { getCurrentWeek } from '../../utils/storage.js';
import { getTodaysFocus } from '../../utils/scheduler.js';
import { t, getLanguage } from '../../utils/i18n.js';

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

      <div class="exercise" id="exercise-container">
        <div class="exercise__badges">
          <div class="exercise__section-badge" style="background: ${section.color}22; color: ${section.color}">
            ${section.emoji} ${section.name[lang] || section.name}
          </div>
          <div class="exercise__week-badge">W${currentWeek} · ${weekProg.label}</div>
        </div>

        <div class="exercise__header">
          <h2 class="exercise__name">
            ${step.name}
            ${step.sideName ? `<span class="exercise__side-badge">${step.sideName} ${step.sideLabel ? (step.sideLabel[lang] || step.sideLabel) : ''}</span>` : ''}
          </h2>
          <p class="exercise__instruction">${step.instruction[lang] || step.instruction}</p>
        </div>

        <div class="exercise__image-container">
          ${renderExerciseImage(step)}
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
  attachInteractionListeners(step);
}

function renderExerciseImage(step) {
  const imgSrc = `/images/${step.image}.webp`;
  return `
    <img
      class="exercise__image"
      src="${imgSrc}"
      alt="${step.name}"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
    />
    <div class="exercise__image-placeholder" style="display:none;">
      ${getExerciseEmoji(step.id)}
    </div>
  `;
}

function getExerciseEmoji(exerciseId) {
  const emojiMap = {
    'cat-cow': '🐱', 'bekken-kantelen': '🌊', 'glute-bridge': '🌉',
    'donkey-kicks': '🦵', 'fire-hydrants': '🔥', 'side-lying-leg-lift': '🦿',
    'inner-thigh-lift': '🦵', 'dead-bug': '🪲', 'toe-taps': '🦶',
    'forearm-plank': '🧱', 'side-plank': '💪', 'the-hundred': '💯',
    'bird-dog': '🐕', 'swimming': '🏊', 'childs-pose': '🧒',
    'hip-flexor-stretch': '🦵', 'hamstring-stretch': '🦿',
    'figure-4-stretch': '4️⃣', 'chest-opener': '🫁',
    'lunges': '🚶', 'squats': '🏋️', 'calf-raises': '🦵', 'push-ups': '💪', 'commando-planks': '🧱', 'superman-hold': '🦸'
  };
  return emojiMap[exerciseId] || '🧘';
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
  state.repsRemaining--;

  if (navigator.vibrate) navigator.vibrate(15);

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
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
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

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
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
  if (state.skippedCount === Math.floor(steps.length / 2)) {
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
    if (state.skippedCount > steps.length / 2) {
      showDialog(
        t('wk.notCompleted.title'),
        t('wk.notCompleted.msg'),
        t('btn.confirm'),
        null,
        () => { state.screen = 'home'; render(); }
      );
      return;
    }

    const focus = state.todayFocus;
    markTodayComplete(focus ? focus.focusEmoji : '✓');
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
    () => { clearTimerInterval(); state.screen = 'home'; render(); }
  );
}

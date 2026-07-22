import { state } from '../../state.js';
import { app, render, escapeHTML, showDialog } from '../core.js';
import { getProfile, getUserName, isTodayComplete, getTotalCompleted, getCurrentWeek, getProgramStartDate, buildCalendarData, resetProgress } from '../../utils/storage.js';
import { getTodaysFocus, getGoalSubtitle } from '../../utils/scheduler.js';
import { getWeekProgression } from '../../data/exercises.js';
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

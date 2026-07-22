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

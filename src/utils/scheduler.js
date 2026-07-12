/**
 * Scheduler — determines which sections to train today
 * based on user goals and day rotation.
 */

import { SECTIONS } from '../data/exercises.js';
import { getProfile, getProgramStartDate, formatDate } from './storage.js';

/**
 * Goal ID to section mapping.
 */
const GOAL_SECTIONS = {
  'billen-benen': ['benen-billen'],
  'core': ['core'],
  'rug': ['rug-houding'],
  'alles': ['benen-billen', 'core', 'rug-houding'],
};

/**
 * Goal ID to display info.
 */
export const GOAL_INFO = {
  'billen-benen': { emoji: '🦵', label: 'Billen & Benen', color: '#D4A0A0' },
  'core': { emoji: '🧱', label: 'Core, Buik & Armen', color: '#C4A882' },
  'rug': { emoji: '🧘', label: 'Rug & Houding', color: '#B8A9C9' },
  'alles': { emoji: '⭐', label: 'Alles', color: '#A8C09A' },
};

function getActiveGoals(profile) {
  if (!profile || !profile.baseLevels) return ['alles'];
  const { core = 1, 'benen-billen': legs = 1, 'rug-houding': back = 1 } = profile.baseLevels;
  let goals = [];
  if (legs > 0) goals.push('billen-benen');
  if (core > 0) goals.push('core');
  if (back > 0) goals.push('rug');
  
  if (goals.length === 3 || goals.length === 0) return ['alles'];
  return goals;
}

/**
 * Get the sections to train today based on user profile.
 */
export function getTodaysFocus() {
  const profile = getProfile();
  if (!profile) {
    return {
      sectionIds: ['warmup', 'benen-billen', 'core', 'rug-houding', 'stretch'],
      focusLabel: 'Volledige Routine',
      focusEmoji: '⭐',
    };
  }

  const goals = getActiveGoals(profile);

  if (goals.includes('alles')) {
    const sectionIds = ['warmup', 'benen-billen', 'core', 'rug-houding'];
    if (profile.includeStretch !== false) sectionIds.push('stretch');
    return {
      sectionIds,
      focusLabel: 'Volledige Routine',
      focusEmoji: '⭐',
    };
  }

  if (goals.length === 1) {
    const goal = goals[0];
    const info = GOAL_INFO[goal];
    const mainSections = GOAL_SECTIONS[goal] || [];
    const sectionIds = ['warmup', ...mainSections];
    if (profile.includeStretch !== false) sectionIds.push('stretch');
    return {
      sectionIds,
      focusLabel: info.label,
      focusEmoji: info.emoji,
    };
  }

  const dayIndex = getWorkoutDayIndex();
  const goalIndex = dayIndex % goals.length;
  const todayGoal = goals[goalIndex];
  const info = GOAL_INFO[todayGoal];
  const mainSections = GOAL_SECTIONS[todayGoal] || [];
  const sectionIds = ['warmup', ...mainSections];
  if (profile.includeStretch !== false) sectionIds.push('stretch');

  return {
    sectionIds,
    focusLabel: info.label,
    focusEmoji: info.emoji,
  };
}

export function getFocusForDate(dateStr) {
  const profile = getProfile();
  if (!profile) return GOAL_INFO['alles'];

  const goals = getActiveGoals(profile);

  if (goals.includes('alles') || goals.length === 1) {
    const goal = goals.includes('alles') ? 'alles' : goals[0];
    return GOAL_INFO[goal];
  }

  const startDate = getProgramStartDate();
  if (!startDate) return GOAL_INFO['alles'];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  const goalIndex = ((diffDays % goals.length) + goals.length) % goals.length;

  return GOAL_INFO[goals[goalIndex]];
}

export function getGoalSubtitle() {
  const profile = getProfile();
  if (!profile) return 'Strakke benen & strakke buik';

  const goals = getActiveGoals(profile);

  if (goals.includes('alles')) {
    return 'Strakke benen, sterke core & gezonde rug';
  }

  const parts = goals.map(g => {
    switch (g) {
      case 'billen-benen': return 'strakke billen & benen';
      case 'core': return 'sterke core & buik';
      case 'rug': return 'gezonde rug & houding';
      default: return '';
    }
  }).filter(Boolean);

  return parts.join(' & ').replace(/^./, c => c.toUpperCase());
}

function getWorkoutDayIndex() {
  const startDate = getProgramStartDate();
  if (!startDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
}

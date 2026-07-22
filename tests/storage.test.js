import { describe, it, expect, beforeEach } from 'vitest';
import { getWeekProgression, applyProgression } from '../src/data/exercises.js';

describe('Exercise Progression Logic', () => {
  it('should scale beginner level 1 correctly', () => {
    const prog = getWeekProgression(1, 1);
    expect(prog.id).toBe('l1');
    expect(prog.mult).toBe(0.7);
  });

  it('should scale expert level 8 correctly and cap at 2.5', () => {
    const prog = getWeekProgression(8, 1);
    expect(prog.id).toBe('l8');
    expect(prog.mult).toBe(2.5);
  });

  it('should cap hold duration at 30 seconds max', () => {
    const mockExercise = {
      id: 'test_hold',
      type: 'combo',
      baseReps: 10,
      baseHoldDuration: 20,
      sectionId: 'core'
    };

    const scaled = applyProgression(mockExercise, 8, 1); // Level 8 (mult 2.5 -> 20 * 2.5 = 50s hold)
    expect(scaled.holdDuration).toBe(30); // Must be capped at 30 seconds
  });
});

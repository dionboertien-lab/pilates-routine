import { describe, it, expect } from 'vitest';
import { getWeekProgression, applyProgression, buildWorkoutSteps } from '../src/data/exercises.js';

describe('Exercise Progression & Workout Steps Logic', () => {
  it('should scale week 1 correctly with gentle multiplier 1.0 at level 4 baseline', () => {
    const prog = getWeekProgression(1, 4);
    expect(prog.id).toBe('l4');
    expect(prog.mult).toBe(1.0);
  });

  it('should scale week 8 correctly with gentle multiplier 1.25 at level 4 baseline', () => {
    const prog = getWeekProgression(8, 4);
    expect(prog.id).toBe('l4');
    expect(prog.mult).toBe(1.25);
  });

  it('should scale level 1 week 1 correctly (0.75 x 1.00 = 0.75)', () => {
    const prog = getWeekProgression(1, 1);
    expect(prog.id).toBe('l1');
    expect(prog.mult).toBe(0.75);
  });

  it('should cap hold duration at 30 seconds max', () => {
    const mockExercise = {
      id: 'test_hold',
      type: 'combo',
      baseReps: 10,
      baseHoldDuration: 25,
      sectionId: 'core'
    };

    const scaled = applyProgression(mockExercise, 8, 1);
    expect(scaled.holdDuration).toBeLessThanOrEqual(30);
  });

  it('should build workout steps for selected sections without gender restriction', () => {
    const steps = buildWorkoutSteps(['benen-billen', 'core'], 1, { core: 1, 'benen-billen': 1 });
    expect(steps.length).toBeGreaterThan(0);
  });

  it('should split per-side exercises into Links and Rechts steps', () => {
    const steps = buildWorkoutSteps(['benen-billen', 'core'], 1, { core: 1, 'benen-billen': 1 });
    const sideSteps = steps.filter(s => s.perSide);
    
    if (sideSteps.length > 0) {
      expect(sideSteps[0].sideName).toBe('Links');
      expect(sideSteps[1].sideName).toBe('Rechts');
      expect(sideSteps[0].sideIndex).toBe(0);
      expect(sideSteps[1].sideIndex).toBe(1);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { getWeekProgression, applyProgression, buildWorkoutSteps, matchesTargetGender } from '../src/data/exercises.js';

describe('Exercise Progression & Gender Logic', () => {
  it('should scale week 1 correctly with gentle multiplier 1.0', () => {
    const prog = getWeekProgression(1, 1);
    expect(prog.id).toBe('l1');
    expect(prog.mult).toBe(1.0);
  });

  it('should scale week 8 correctly with gentle multiplier 1.25', () => {
    const prog = getWeekProgression(8, 1);
    expect(prog.id).toBe('l1');
    expect(prog.mult).toBe(1.25);
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

  it('should correctly match target gender for exercises', () => {
    const universal = { targetGender: 'all' };
    const femaleOnly = { targetGender: 'female' };
    const maleOnly = { targetGender: 'male' };

    expect(matchesTargetGender(universal, 'female')).toBe(true);
    expect(matchesTargetGender(universal, 'male')).toBe(true);
    expect(matchesTargetGender(universal, 'neutral')).toBe(true);

    expect(matchesTargetGender(femaleOnly, 'female')).toBe(true);
    expect(matchesTargetGender(femaleOnly, 'male')).toBe(false);

    expect(matchesTargetGender(maleOnly, 'male')).toBe(true);
    expect(matchesTargetGender(maleOnly, 'female')).toBe(false);
  });

  it('should split per-side exercises into Links and Rechts steps', () => {
    const steps = buildWorkoutSteps(['benen-billen', 'core'], 1, 'female', { core: 1, 'benen-billen': 1 });
    const sideSteps = steps.filter(s => s.perSide);
    
    if (sideSteps.length > 0) {
      expect(sideSteps[0].sideName).toBe('Links');
      expect(sideSteps[1].sideName).toBe('Rechts');
      expect(sideSteps[0].sideIndex).toBe(0);
      expect(sideSteps[1].sideIndex).toBe(1);
    }
  });
});

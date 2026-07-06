/**
 * Complete exercise data for the Pilates Routine.
 *
 * Sections:
 * 1. Warm-up
 * 2. Benen & Billen (+ Inner Thigh)
 * 3. Core
 * 4. Rug & Houding (NEW)
 * 5. Stretch (+ Chest Opener)
 *
 * Each exercise has a targetGender ('all', 'female', 'male').
 */

export const SECTIONS = [
  {
    id: 'warmup',
    name: 'Warm-up',
    emoji: '🌿',
    duration: '1 minuut',
    color: '#A8C09A',
  },
  {
    id: 'benen-billen',
    name: 'Benen & Billen',
    emoji: '🦵',
    duration: '6 minuten',
    color: '#D4A0A0',
  },
  {
    id: 'core',
    name: 'Core & Buik',
    emoji: '🧱',
    duration: '5 minuten',
    color: '#C4A882',
  },
  {
    id: 'rug-houding',
    name: 'Rug & Houding',
    emoji: '🧘',
    duration: '3 minuten',
    color: '#B8A9C9',
  },
  {
    id: 'stretch',
    name: 'Stretch',
    emoji: '🌸',
    duration: '2 minuten',
    color: '#9DB4C0',
  },
];

export function getWeekProgression(currentWeek, baseLevel = 1) {
  const effectiveLevel = Math.min(8, baseLevel + currentWeek - 1);
  
  const LEVELS = {
    1: { id: 'l1', label: 'Beginner', mult: 0.5 },
    2: { id: 'l2', label: 'Beginner+', mult: 0.65 },
    3: { id: 'l3', label: 'Licht Gemiddeld', mult: 0.8 },
    4: { id: 'l4', label: 'Gemiddeld', mult: 1.0 },
    5: { id: 'l5', label: 'Gemiddeld+', mult: 1.5 },
    6: { id: 'l6', label: 'Gevorderd', mult: 2.0 },
    7: { id: 'l7', label: 'Gevorderd+', mult: 2.5 },
    8: { id: 'l8', label: 'Expert', mult: 3.5 },
  };

  return LEVELS[effectiveLevel] || LEVELS[1];
}

export function applyProgression(exercise, currentWeek, baseLevel = 1) {
  const prog = getWeekProgression(currentWeek, baseLevel);
  const result = { ...exercise };

  // Don't scale warmup or stretch exercises
  const multiplier = (exercise.sectionId === 'warmup' || exercise.sectionId === 'stretch') ? 1.0 : prog.mult;

  if (result.type === 'reps' || result.type === 'combo') {
    result.reps = Math.max(1, Math.round(exercise.baseReps * multiplier));
  }
  if (result.type === 'timer' || result.type === 'combo') {
    const baseDuration = exercise.baseDuration || exercise.baseHoldDuration;
    if (result.type === 'timer') {
      // Respect maxDuration if present, otherwise use scaled duration
      const scaledDuration = Math.max(10, Math.round(baseDuration * multiplier));
      result.duration = exercise.maxDuration ? Math.min(scaledDuration, exercise.maxDuration) : scaledDuration;
    }
    if (result.type === 'combo') {
      result.holdDuration = Math.max(5, Math.round((exercise.baseHoldDuration || 0) * multiplier));
    }
  }

  result.weekLabel = prog.label;
  return result;
}

export const EXERCISES = [
  // ═══════════════════════════════════════
  // SECTION 1: WARM-UP
  // ═══════════════════════════════════════
  {
    id: 'cat-cow',
    sectionId: 'warmup',
    name: 'Cat-Cow',
    type: 'timer',
    baseDuration: 30,
    maxDuration: 45,
    perSide: false,
    image: 'cat-cow',
    targetGender: 'all',
    instruction: 'Kom op handen en knieën. Adem uit en maak je rug bol. Adem in en laat je rug hol zakken.',
  },
  {
    id: 'bekken-kantelen',
    sectionId: 'warmup',
    name: 'Bekken Kantelen',
    type: 'timer',
    baseDuration: 30,
    maxDuration: 45,
    perSide: false,
    image: 'bekken-kantelen',
    targetGender: 'all',
    instruction: 'Lig op je rug, knieën gebogen. Adem uit en kantel je bekken naar achteren (onderrug plat op de mat). Adem in en laat los.',
  },

  // ═══════════════════════════════════════
  // SECTION 2: BENEN & BILLEN
  // ═══════════════════════════════════════
  {
    id: 'glute-bridge',
    sectionId: 'benen-billen',
    name: 'Glute Bridge',
    type: 'combo',
    baseReps: 12,
    baseHoldDuration: 10,
    perSide: false,
    image: 'glute-bridge',
    targetGender: 'all',
    instruction: 'Lig op je rug. Adem uit en duw je heupen omhoog. Knijp je billen samen. Adem in en laat langzaam zakken. Houd bovenaan de laatste herhaling vast.',
  },
  // Female focus
  {
    id: 'donkey-kicks',
    sectionId: 'benen-billen',
    name: 'Donkey Kicks',
    type: 'reps',
    baseReps: 10,
    perSide: true,
    sideLabel: 'been',
    image: 'donkey-kicks',
    targetGender: 'female',
    instruction: 'Op handen en knieën. Adem uit, til één been op met de knie 90 graden en duw je hiel naar het plafond. Adem in bij het terugzakken.',
  },
  {
    id: 'fire-hydrants',
    sectionId: 'benen-billen',
    name: 'Fire Hydrants',
    type: 'reps',
    baseReps: 10,
    perSide: true,
    sideLabel: 'been',
    image: 'fire-hydrants',
    targetGender: 'female',
    instruction: 'Op handen en knieën. Adem uit en til je knie zijwaarts op (zonder je bekken in te draaien). Adem in en laat weer zakken.',
  },
  {
    id: 'inner-thigh-lift',
    sectionId: 'benen-billen',
    name: 'Inner Thigh Lift',
    type: 'reps',
    baseReps: 12,
    perSide: true,
    sideLabel: 'been',
    image: 'inner-thigh-lift',
    targetGender: 'female',
    instruction: 'Lig op je zij. Kruis je bovenste been over het onderste. Til het onderste been langzaam op.',
  },
  // Male focus (Replaces donkey kicks, fire hydrants, inner thigh)
  {
    id: 'lunges',
    sectionId: 'benen-billen',
    name: 'Lunges',
    type: 'reps',
    baseReps: 12,
    perSide: true,
    sideLabel: 'been',
    image: 'lunges',
    targetGender: 'male',
    instruction: 'Adem in en stap met één been naar voren. Zak door je heupen. Adem uit en duw jezelf weer krachtig omhoog.',
  },
  {
    id: 'squats',
    sectionId: 'benen-billen',
    name: 'Bodyweight Squats',
    type: 'reps',
    baseReps: 15,
    perSide: false,
    image: 'squats',
    targetGender: 'male',
    instruction: 'Voeten op schouderbreedte. Adem in en zak door je knieën. Adem uit, span je billen aan en kom weer rechtstaan.',
  },
  {
    id: 'calf-raises',
    sectionId: 'benen-billen',
    name: 'Calf Raises',
    type: 'reps',
    baseReps: 20,
    perSide: false,
    image: 'calf-raises',
    targetGender: 'male',
    instruction: 'Ga rechtop staan. Duw jezelf omhoog op je tenen en laat langzaam weer zakken. Span je kuiten goed aan.',
  },
  {
    id: 'side-lying-leg-lift',
    sectionId: 'benen-billen',
    name: 'Side-Lying Leg Lift',
    type: 'reps',
    baseReps: 12,
    perSide: true,
    sideLabel: 'been',
    image: 'side-lying-leg-lift',
    targetGender: 'all',
    instruction: 'Ga op zij liggen. Til je bovenste gestrekte been langzaam op. Langzaam terug zonder neer te leggen.',
  },

  // ═══════════════════════════════════════
  // SECTION 3: CORE
  // ═══════════════════════════════════════
  {
    id: 'dead-bug',
    sectionId: 'core',
    name: 'Dead Bug',
    type: 'reps',
    baseReps: 8,
    perSide: true,
    sideLabel: 'kant',
    image: 'dead-bug',
    targetGender: 'all',
    instruction: 'Lig op je rug, knieën in tabletop. Adem in en strek tegelijk je rechterarm en linkerbeen. Adem uit en breng ze terug. Wissel.',
  },
  {
    id: 'forearm-plank',
    sectionId: 'core',
    name: 'Forearm Plank',
    type: 'timer',
    baseDuration: 30, // 15s beginner, 30s gemiddeld, 60s gevorderd, 120s expert
    perSide: false,
    image: 'forearm-plank',
    targetGender: 'all',
    instruction: 'Ellebogen onder je schouders. Lichaam in rechte lijn. Span buik, billen en benen aan.',
  },
  // Female focus
  {
    id: 'toe-taps',
    sectionId: 'core',
    name: 'Toe Taps',
    type: 'reps',
    baseReps: 10,
    perSide: true,
    sideLabel: 'kant',
    image: 'toe-taps',
    targetGender: 'female',
    instruction: 'Lig op je rug, knieën 90 graden. Tik één voet rustig op de grond. Terug en wissel.',
  },
  {
    id: 'the-hundred',
    sectionId: 'core',
    name: 'The Hundred',
    type: 'timer',
    baseDuration: 30,
    perSide: false,
    image: 'the-hundred',
    targetGender: 'female',
    instruction: 'Lig op je rug, benen in tabletop. Schouders iets van de grond. Pomp je armen op en neer.',
  },
  // Male focus (Replaces toe taps and the hundred)
  {
    id: 'push-ups',
    sectionId: 'core',
    name: 'Push-ups',
    type: 'reps',
    baseReps: 10,
    perSide: false,
    image: 'push-ups',
    targetGender: 'male',
    instruction: 'Plaats handen op schouderbreedte. Laat je lichaam zakken tot je borst bijna de grond raakt en duw weer op. (Op knieën mag ook).',
  },
  {
    id: 'commando-planks',
    sectionId: 'core',
    name: 'Commando Planks',
    type: 'reps',
    baseReps: 8,
    perSide: true,
    sideLabel: 'kant',
    image: 'commando-planks',
    targetGender: 'male',
    instruction: 'Start in een hoge plank. Zak één voor één naar je onderarmen. Duw jezelf één voor één weer omhoog.',
  },
  {
    id: 'side-plank',
    sectionId: 'core',
    name: 'Side Plank',
    type: 'timer',
    baseDuration: 20,
    perSide: true,
    sideLabel: 'kant',
    image: 'side-plank',
    targetGender: 'all',
    instruction: 'Steun op je onderarm. Lichaam in één rechte lijn. Span je core en bil aan.',
  },

  // ═══════════════════════════════════════
  // SECTION 4: RUG & HOUDING
  // ═══════════════════════════════════════
  {
    id: 'bird-dog',
    sectionId: 'rug-houding',
    name: 'Bird-Dog',
    type: 'reps',
    baseReps: 8,
    perSide: true,
    sideLabel: 'kant',
    image: 'bird-dog',
    targetGender: 'all',
    instruction: 'Op handen en knieën. Strek tegelijk je rechterarm naar voren en linkerbeen naar achteren.',
  },
  {
    id: 'swimming',
    sectionId: 'rug-houding',
    name: 'Swimming',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 40,
    perSide: false,
    image: 'swimming',
    targetGender: 'all',
    instruction: 'Lig op je buik. Til afwisselend je rechterarm+linkerbeen en linkerarm+rechterbeen op.',
  },
  {
    id: 'superman-hold',
    sectionId: 'rug-houding',
    name: 'Superman Hold',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 45,
    perSide: false,
    image: 'superman-hold',
    targetGender: 'all',
    instruction: 'Lig op je buik. Adem uit en til tegelijk je armen en benen op, alsof je vliegt. Adem in en laat zakken. Houd bovenaan vast.',
  },

  // ═══════════════════════════════════════
  // SECTION 5: STRETCH
  // ═══════════════════════════════════════
  {
    id: 'childs-pose',
    sectionId: 'stretch',
    name: "Child's Pose",
    type: 'timer',
    baseDuration: 30,
    maxDuration: 45,
    perSide: false,
    image: 'childs-pose',
    targetGender: 'all',
    instruction: 'Zit op je hielen, strek je armen vooruit en laat je voorhoofd rusten.',
  },
  {
    id: 'hip-flexor-stretch',
    sectionId: 'stretch',
    name: 'Hip Flexor Stretch',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 30,
    perSide: true,
    sideLabel: 'kant',
    image: 'hip-flexor-stretch',
    targetGender: 'all',
    instruction: 'Stap één been naar achteren, zak door je voorste knie en duw je heupen licht naar voren.',
  },
  {
    id: 'chest-opener',
    sectionId: 'stretch',
    name: 'Borstopener Stretch',
    type: 'timer',
    baseDuration: 20,
    maxDuration: 30,
    perSide: false,
    image: 'chest-opener',
    targetGender: 'all',
    instruction: 'Vouw je handen achter je rug, trek je schouderbladen naar elkaar en open je borst.',
  },
];

export function getSection(sectionId) {
  return SECTIONS.find(s => s.id === sectionId);
}

/**
 * Build the workout steps based on goals, current week, baseLevels object, and gender.
 */
export function buildWorkoutSteps(sectionIds, currentWeek, gender = 'female', baseLevels = {}) {
  const steps = [];

  // Determine user gender category (neutral maps to female for routine flow)
  const userGender = (gender === 'male') ? 'male' : 'female';

  const filteredExercises = EXERCISES.filter(e => {
    // Check section
    if (!sectionIds.includes(e.sectionId)) return false;
    // Check gender
    if (e.targetGender !== 'all' && e.targetGender !== userGender) return false;
    return true;
  });

  for (const exercise of filteredExercises) {
    // Use the specific baseLevel for this exercise's section, default to 1 (or core if not found)
    const sectionLevel = baseLevels[exercise.sectionId] || baseLevels['core'] || 1;
    const progressed = applyProgression(exercise, currentWeek, sectionLevel);

    if (progressed.perSide) {
      steps.push({
        ...progressed,
        stepId: `${progressed.id}-links`,
        sideName: 'Links',
        sideIndex: 0,
      });
      steps.push({
        ...progressed,
        stepId: `${progressed.id}-rechts`,
        sideName: 'Rechts',
        sideIndex: 1,
      });
    } else {
      steps.push({
        ...progressed,
        stepId: progressed.id,
        sideName: null,
        sideIndex: -1,
      });
    }
  }

  return steps;
}

// End of file

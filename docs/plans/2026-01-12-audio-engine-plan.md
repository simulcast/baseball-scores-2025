# Audio Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generative ambient audio engine that transforms baseball game state into evolving music using Elementary Audio.

**Architecture:** Six synthesis layers (Drone, Pad, Bell, Air, Shimmer, Ghost Melody) respond to game state through an interpreter. Euclidean density curves create probability-based ambient events. Effects chain provides studio-quality output.

**Tech Stack:** Elementary Audio (@elemaudio/core, @elemaudio/web-renderer), Zustand (store subscription)

**Prerequisite:** State management refactor must be complete (Zustand store with game state).

---

## Phase 1: Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add Elementary Audio packages**

Run:
```bash
npm install @elemaudio/core @elemaudio/web-renderer
```

**Step 2: Verify installation**

Run:
```bash
npm ls @elemaudio/core @elemaudio/web-renderer
```

Expected: Both packages listed at ^4.0.x

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Elementary Audio dependencies"
```

---

### Task 2: Create Directory Structure

**Files:**
- Create: `src/audio/` directory tree

**Step 1: Create directories**

Run:
```bash
mkdir -p src/audio/layers src/audio/effects
```

**Step 2: Create placeholder files**

Run:
```bash
touch src/audio/index.js
touch src/audio/engine.js
touch src/audio/interpreter.js
touch src/audio/euclidean.js
touch src/audio/events.js
touch src/audio/harmony.js
touch src/audio/voices.js
touch src/audio/constants.js
touch src/audio/layers/index.js
touch src/audio/layers/drone.js
touch src/audio/layers/pad.js
touch src/audio/layers/bells.js
touch src/audio/layers/air.js
touch src/audio/layers/shimmer.js
touch src/audio/layers/ghostMelody.js
touch src/audio/effects/index.js
touch src/audio/effects/reverb.js
touch src/audio/effects/filter.js
touch src/audio/effects/eq.js
touch src/audio/effects/dynamics.js
```

**Step 3: Commit**

```bash
git add src/audio/
git commit -m "chore: scaffold audio engine directory structure"
```

---

### Task 3: Constants and Frequency Tables

**Files:**
- Create: `src/audio/constants.js`

**Step 1: Write constants file**

```javascript
// src/audio/constants.js

// Note frequencies (A4 = 440Hz)
export const NOTE_FREQUENCIES = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  // Sharps/flats
  'Db2': 69.30, 'Eb2': 77.78, 'Gb2': 92.50, 'Ab2': 103.83, 'Bb2': 116.54,
  'Db3': 138.59, 'Eb3': 155.56, 'Gb3': 185.00, 'Ab3': 207.65, 'Bb3': 233.08,
  'Db4': 277.18, 'Eb4': 311.13, 'Gb4': 369.99, 'Ab4': 415.30, 'Bb4': 466.16,
  'Db5': 554.37, 'Eb5': 622.25, 'Gb5': 739.99, 'Ab5': 830.61, 'Bb5': 932.33,
};

// Scale intervals from root (semitones)
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

// Chord intervals from root (semitones)
export const CHORDS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
};

// Euclidean pattern configurations
export const EUCLIDEAN_PATTERNS = [
  { pulses: 3, steps: 8, cycleDuration: 45 },
  { pulses: 5, steps: 13, cycleDuration: 73 },
  { pulses: 2, steps: 5, cycleDuration: 31 },
];

// Layer configurations
export const LAYERS = {
  drone: {
    voices: 2,
    frequencyRange: [80, 200],
    attack: 4.0,
    release: 6.0,
    pan: 0, // mono center
  },
  pad: {
    voices: 4,
    frequencyRange: [150, 800],
    attack: 2.0,
    release: 4.0,
    panWidth: 0.9,
  },
  bells: {
    voices: 3,
    frequencyRange: [400, 4000],
    attack: 0.01,
    release: 3.0,
    panPositions: [-0.7, -0.25, 0.25, 0.7],
  },
  air: {
    voices: 1,
    frequencyRange: [2000, 12000],
    attack: 1.0,
    release: 2.0,
    panWidth: 1.0,
  },
  shimmer: {
    voices: 2,
    frequencyRange: [1000, 8000],
    attack: 3.0,
    release: 8.0,
    panWidth: 0.95,
  },
  ghostMelody: {
    voices: 1,
    frequencyRange: [300, 1200],
    attack: 0.5,
    release: 2.0,
    pan: 0.2, // slightly off-center
  },
};

// Reverb settings
export const REVERB = {
  preDelay: 0.03,
  decay: 4.5,
  damping: 0.4,
  diffusion: 0.9,
  modulation: 0.2,
  mix: 0.35,
};

// EQ settings per layer (low cut Hz, high cut Hz)
export const EQ = {
  drone: { lowCut: 0, highCut: 800, midFreq: 400, midGain: -2 },
  pad: { lowCut: 100, highCut: 10000, midFreq: 3000, midGain: 2 },
  bells: { lowCut: 300, highCut: 12000, midFreq: 5000, midGain: 3 },
  air: { lowCut: 1500, highCut: 20000, midFreq: 8000, midGain: 2 },
  shimmer: { lowCut: 800, highCut: 20000, midFreq: 400, midGain: -6 },
  ghostMelody: { lowCut: 200, highCut: 6000, midFreq: 800, midGain: 1 },
};

// Timing
export const TIMING = {
  renderInterval: 50, // ms between ambient event checks
  silenceMaxSeconds: 30, // time for silence factor to reach 1.0
  breathingFactor: 0.3, // activity multiplier during Mid/End innings
};

// Voice stealing priority (lower = steal first)
export const VOICE_PRIORITY = {
  air: 1,
  shimmer: 2,
  bells: 3,
  ghostMelody: 4,
  pad: 5,
  drone: 6, // never steal
};
```

**Step 2: Commit**

```bash
git add src/audio/constants.js
git commit -m "feat(audio): add constants and frequency tables"
```

---

## Phase 2: Euclidean Density Engine

### Task 4: Bjorklund's Algorithm

**Files:**
- Create: `src/audio/euclidean.js`

**Step 1: Write Euclidean algorithm**

```javascript
// src/audio/euclidean.js

import { EUCLIDEAN_PATTERNS } from './constants.js';

/**
 * Bjorklund's algorithm for Euclidean rhythm generation
 * Returns array of booleans: true = pulse, false = rest
 */
export function bjorklund(pulses, steps) {
  if (pulses >= steps) {
    return new Array(steps).fill(true);
  }
  if (pulses === 0) {
    return new Array(steps).fill(false);
  }

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  let level = 0;

  remainders[0] = pulses;

  while (remainders[level] > 1) {
    counts[level] = Math.floor(divisor / remainders[level]);
    remainders[level + 1] = divisor % remainders[level];
    divisor = remainders[level];
    level++;
  }

  counts[level] = divisor;

  function build(level) {
    if (level === -1) {
      pattern.push(false);
    } else if (level === -2) {
      pattern.push(true);
    } else {
      for (let i = 0; i < counts[level]; i++) {
        build(level - 1);
      }
      if (remainders[level] !== 0) {
        build(level - 2);
      }
    }
  }

  build(level);
  return pattern;
}

/**
 * Convert Euclidean pattern to density curve
 * Returns function that gives density (0-1) at any point in cycle
 */
export function patternToDensityCurve(pulses, steps, cycleDuration) {
  const pattern = bjorklund(pulses, steps);
  const stepDuration = cycleDuration / steps;

  return function getDensity(timeInCycle) {
    // Normalize time to cycle
    const normalizedTime = timeInCycle % cycleDuration;
    const stepIndex = Math.floor(normalizedTime / stepDuration);
    const positionInStep = (normalizedTime % stepDuration) / stepDuration;

    // Current step has a pulse?
    const currentPulse = pattern[stepIndex] ? 1 : 0;
    const nextPulse = pattern[(stepIndex + 1) % steps] ? 1 : 0;

    // Smooth interpolation between steps (creates "hills" around pulses)
    // Use cosine interpolation for smooth curves
    const t = positionInStep;
    const smoothT = (1 - Math.cos(t * Math.PI)) / 2;

    return currentPulse * (1 - smoothT) + nextPulse * smoothT;
  };
}

/**
 * Combine multiple density curves into one
 * Returns average density across all patterns
 */
export function combineDensityCurves(patterns = EUCLIDEAN_PATTERNS) {
  const curves = patterns.map(p =>
    patternToDensityCurve(p.pulses, p.steps, p.cycleDuration)
  );

  return function getCombinedDensity(absoluteTime) {
    const densities = curves.map((curve, i) => {
      const cycleDuration = patterns[i].cycleDuration;
      const timeInCycle = absoluteTime % cycleDuration;
      return curve(timeInCycle);
    });

    // Average all densities
    return densities.reduce((a, b) => a + b, 0) / densities.length;
  };
}

/**
 * Check if an ambient event should fire based on probability
 */
export function shouldFireAmbientEvent(
  baseProbability,
  euclideanDensity,
  timeSinceLastChange,
  inningState,
  silenceMaxSeconds = 30,
  breathingFactor = 0.3
) {
  // Silence factor: longer since last game event = more ambient activity
  const silenceFactor = Math.min(timeSinceLastChange / silenceMaxSeconds, 1);

  // Breathing: Mid/End innings = lower probability (exhale)
  const breathing = (inningState === 'Mid' || inningState === 'End')
    ? breathingFactor
    : 1.0;

  // Final probability
  const probability = baseProbability * euclideanDensity * silenceFactor * breathing;

  return Math.random() < probability;
}
```

**Step 2: Commit**

```bash
git add src/audio/euclidean.js
git commit -m "feat(audio): implement Euclidean density engine"
```

---

## Phase 3: Harmony System

### Task 5: Harmony and Scale Functions

**Files:**
- Create: `src/audio/harmony.js`

**Step 1: Write harmony module**

```javascript
// src/audio/harmony.js

import { NOTE_FREQUENCIES, SCALES, CHORDS } from './constants.js';

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Get frequency for a note name (e.g., 'C4', 'Eb3')
 */
export function noteToFrequency(note) {
  return NOTE_FREQUENCIES[note] || 440;
}

/**
 * Get note name from semitone offset and root
 */
export function semitoneToNote(root, semitones, octave) {
  const rootIndex = NOTE_NAMES.indexOf(root);
  const noteIndex = (rootIndex + semitones) % 12;
  const octaveOffset = Math.floor((rootIndex + semitones) / 12);
  return NOTE_NAMES[noteIndex] + (octave + octaveOffset);
}

/**
 * Build scale notes from root, mode, and octave range
 */
export function buildScale(root, mode, startOctave = 3, endOctave = 5) {
  const intervals = SCALES[mode] || SCALES.major;
  const notes = [];

  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (const interval of intervals) {
      const note = semitoneToNote(root, interval, octave);
      if (NOTE_FREQUENCIES[note]) {
        notes.push(note);
      }
    }
  }

  return notes;
}

/**
 * Build chord voicing from root, chord type, and octave
 */
export function buildChord(root, chordType, octave = 3) {
  const intervals = CHORDS[chordType] || CHORDS.major;
  return intervals.map(interval => semitoneToNote(root, interval, octave));
}

/**
 * Determine mode based on score differential
 * Home leading = brighter (major/lydian)
 * Away leading = darker (minor/dorian)
 * Tied = neutral (mixolydian)
 */
export function getModeFromScore(homeScore, awayScore) {
  const diff = homeScore - awayScore;
  if (diff > 0) return 'major';
  if (diff < 0) return 'minor';
  return 'mixolydian';
}

/**
 * Get tonal center - shifts based on inning for variety
 */
export function getTonalCenter(inning) {
  // Cycle through tonal centers as innings progress
  const centers = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'];
  return centers[(inning - 1) % centers.length];
}

/**
 * Get chord voicing for pad layer
 * Returns array of note names
 */
export function getPadVoicing(root, mode, tension) {
  // Higher tension = more color tones
  if (tension > 0.7) {
    return buildChord(root, mode === 'major' ? 'major7' : 'minor7', 3);
  } else if (tension > 0.4) {
    return buildChord(root, mode === 'major' ? 'add9' : 'minor7', 3);
  } else {
    return buildChord(root, mode === 'major' ? 'major' : 'minor', 3);
  }
}

/**
 * Pick a melody note from scale based on position (0-7)
 */
export function getMelodyNote(scale, position, octaveOffset = 0) {
  const index = position % scale.length;
  const note = scale[index];
  if (octaveOffset === 0) return note;

  // Adjust octave
  const noteName = note.slice(0, -1);
  const octave = parseInt(note.slice(-1)) + octaveOffset;
  return noteName + octave;
}

/**
 * Calculate harmonic shift for lead change
 * Returns new root that's a dramatic but musical shift
 */
export function getLeadChangeRoot(currentRoot, newLeader) {
  const rootIndex = NOTE_NAMES.indexOf(currentRoot);
  // Move up a fourth (5 semitones) for home lead, down a fourth for away
  const shift = newLeader === 'home' ? 5 : -5;
  const newIndex = (rootIndex + shift + 12) % 12;
  return NOTE_NAMES[newIndex];
}
```

**Step 2: Commit**

```bash
git add src/audio/harmony.js
git commit -m "feat(audio): implement harmony and scale system"
```

---

## Phase 4: Game State Interpreter

### Task 6: Event Detection

**Files:**
- Create: `src/audio/events.js`

**Step 1: Write event detection module**

```javascript
// src/audio/events.js

/**
 * Detect game events by comparing previous and current state
 * Returns array of event objects
 */
export function detectEvents(prevState, currentState) {
  if (!prevState || !currentState) return [];

  const events = [];

  // Score changes
  if (currentState.homeScore > prevState.homeScore) {
    const runsScored = currentState.homeScore - prevState.homeScore;
    if (runsScored >= 4) {
      events.push({ type: 'HOME_RUN', team: 'home', runs: runsScored });
    } else {
      for (let i = 0; i < runsScored; i++) {
        events.push({ type: 'RUN_SCORED', team: 'home' });
      }
    }
  }

  if (currentState.awayScore > prevState.awayScore) {
    const runsScored = currentState.awayScore - prevState.awayScore;
    if (runsScored >= 4) {
      events.push({ type: 'HOME_RUN', team: 'away', runs: runsScored });
    } else {
      for (let i = 0; i < runsScored; i++) {
        events.push({ type: 'RUN_SCORED', team: 'away' });
      }
    }
  }

  // Lead change detection
  const prevLead = Math.sign(prevState.homeScore - prevState.awayScore);
  const currentLead = Math.sign(currentState.homeScore - currentState.awayScore);
  if (prevLead !== currentLead && currentLead !== 0) {
    events.push({
      type: 'LEAD_CHANGE',
      newLeader: currentLead > 0 ? 'home' : 'away'
    });
  }

  // Strikeout: strikes were 2, now 0, outs increased
  if (prevState.strikes === 2 && currentState.strikes === 0 &&
      currentState.outs > prevState.outs) {
    events.push({ type: 'STRIKEOUT' });
  }

  // Walk: balls were 3, now 0, outs same
  if (prevState.balls === 3 && currentState.balls === 0 &&
      currentState.outs === prevState.outs) {
    events.push({ type: 'WALK' });
  }

  // Out recorded (not strikeout)
  if (currentState.outs > prevState.outs && !events.some(e => e.type === 'STRIKEOUT')) {
    events.push({ type: 'OUT' });
  }

  // Hit detection (count reset, runner configuration changed, no out)
  if (prevState.strikes > 0 && currentState.strikes === 0 &&
      prevState.balls > 0 && currentState.balls === 0 &&
      currentState.outs === prevState.outs &&
      !events.some(e => e.type === 'WALK')) {
    // Check if runners changed (indicating hit)
    const prevRunners = prevState.runners.filter(Boolean).length;
    const currentRunners = currentState.runners.filter(Boolean).length;
    if (currentRunners !== prevRunners || currentState.runners[0]) {
      events.push({ type: 'HIT' });
    }
  }

  // Strike (count increased)
  if (currentState.strikes > prevState.strikes) {
    events.push({ type: 'STRIKE' });
  }

  // Ball (count increased)
  if (currentState.balls > prevState.balls) {
    events.push({ type: 'BALL' });
  }

  // Inning changes
  if (currentState.inning !== prevState.inning ||
      currentState.inningState !== prevState.inningState) {
    if (currentState.inningState === 'Mid' || currentState.inningState === 'End') {
      events.push({ type: 'INNING_END' });
    } else if (prevState.inningState === 'Mid' || prevState.inningState === 'End') {
      events.push({ type: 'INNING_START' });
    }
  }

  return events;
}

/**
 * Get musical response parameters for an event
 */
export function getEventResponse(event) {
  switch (event.type) {
    case 'STRIKE':
      return {
        bells: { trigger: true, register: 'high' },
        pad: { filterSweep: { target: 1.2, duration: 2 } }
      };

    case 'BALL':
      return {
        pad: { filterSweep: { target: 1.1, duration: 1.5 } },
        ghostMelody: { nudge: true }
      };

    case 'OUT':
      return {
        pad: { chordShift: true },
        density: { spike: 0.3, duration: 3 }
      };

    case 'STRIKEOUT':
      return {
        pad: { filterSweep: { target: 0.7, duration: 3 } },
        reverb: { decayMultiplier: 1.3, duration: 4 }
      };

    case 'WALK':
      return {
        bells: { arpeggio: 'ascending', notes: 3, duration: 3 }
      };

    case 'HIT':
      return {
        shimmer: { swell: 0.7, duration: 3 },
        bells: { cascade: true, notes: 3 }
      };

    case 'RUN_SCORED':
      return {
        harmony: { lift: 2 }, // semitones
        shimmer: { peak: 0.9, duration: 4 }
      };

    case 'HOME_RUN':
      return {
        harmony: { lift: 4 },
        all: { brighten: 0.3, duration: 5 }
      };

    case 'LEAD_CHANGE':
      return {
        harmony: { modulate: true, immediate: true },
        shimmer: { intensity: 0.8, duration: 5 }
      };

    case 'INNING_END':
      return {
        all: { fade: 0.3, duration: 4 },
        reverb: { decayMultiplier: 1.5 },
        air: { amount: 0.6 }
      };

    case 'INNING_START':
      return {
        density: { increase: 0.2, duration: 4 },
        harmony: { establish: true }
      };

    default:
      return {};
  }
}
```

**Step 2: Commit**

```bash
git add src/audio/events.js
git commit -m "feat(audio): implement game event detection and responses"
```

---

### Task 7: Main Interpreter

**Files:**
- Create: `src/audio/interpreter.js`

**Step 1: Write interpreter module**

```javascript
// src/audio/interpreter.js

import {
  getModeFromScore,
  getTonalCenter,
  buildScale,
  getPadVoicing,
  noteToFrequency,
  getLeadChangeRoot
} from './harmony.js';
import { detectEvents, getEventResponse } from './events.js';
import { LAYERS } from './constants.js';

/**
 * Calculate tension level (0-1) from game state
 */
export function calculateTension(gameState) {
  let tension = 0;

  // Outs contribution: 0=0, 1=0.3, 2=0.7
  const outsWeights = [0, 0.3, 0.7];
  tension += outsWeights[gameState.outs] || 0;

  // Runners in scoring position (2nd or 3rd base)
  if (gameState.runners[1]) tension += 0.2; // runner on 2nd
  if (gameState.runners[2]) tension += 0.2; // runner on 3rd

  // Count pressure (strikes weighted more than balls)
  tension += gameState.strikes * 0.1;
  tension += gameState.balls * 0.05;

  // Late innings (7+)
  if (gameState.inning >= 7) tension += 0.15;

  // Close game (within 2 runs)
  const scoreDiff = Math.abs(gameState.homeScore - gameState.awayScore);
  if (scoreDiff <= 2) tension += 0.2;

  // Clamp to 0-1
  return Math.min(Math.max(tension, 0), 1);
}

/**
 * Interpret game state into musical parameters
 */
export function interpret(gameState, prevState, currentParams) {
  if (!gameState) return currentParams || getDefaultParams();

  // Detect events
  const events = detectEvents(prevState, gameState);
  const eventResponses = events.map(getEventResponse);

  // Calculate core parameters
  const tension = calculateTension(gameState);
  const mode = getModeFromScore(gameState.homeScore, gameState.awayScore);

  // Handle lead change modulation
  let tonalCenter = currentParams?.tonalCenter || getTonalCenter(gameState.inning);
  const leadChangeEvent = events.find(e => e.type === 'LEAD_CHANGE');
  if (leadChangeEvent) {
    tonalCenter = getLeadChangeRoot(tonalCenter, leadChangeEvent.newLeader);
  }

  // Build scale and chord
  const scale = buildScale(tonalCenter, mode, 3, 5);
  const padVoicing = getPadVoicing(tonalCenter, mode, tension);

  // Breathing state
  const isBreathing = gameState.inningState === 'Mid' || gameState.inningState === 'End';

  // Time since last change (for ambient activity)
  const timeSinceLastChange = gameState.timeSinceLastChange || 0;
  const ambientActivity = Math.min(timeSinceLastChange / 30, 1);

  // Calculate layer-specific parameters
  const droneFreq = noteToFrequency(tonalCenter + '2');
  const filterCutoff = 400 + (tension * 2000); // 400-2400 Hz based on tension

  return {
    // Global
    tonalCenter,
    mode,
    scale,
    tension,
    isBreathing,
    ambientActivity,
    timeSinceLastChange,

    // Events
    events,
    eventResponses,

    // Drone layer
    drone: {
      frequency: droneFreq,
      amplitude: isBreathing ? 0.6 : 0.8,
      filterCutoff: 200 + (tension * 300),
    },

    // Pad layer
    pad: {
      voicing: padVoicing,
      frequencies: padVoicing.map(noteToFrequency),
      filterCutoff,
      amplitude: isBreathing ? 0.4 : 0.7,
    },

    // Bells layer
    bells: {
      scale,
      densityProbability: 0.1 + (tension * 0.3),
      register: tension > 0.6 ? 'high' : 'mid',
      amplitude: 0.5,
    },

    // Air layer
    air: {
      amount: isBreathing ? 0.6 : 0.3,
      filterCenter: 4000 + (tension * 4000),
      amplitude: 0.3,
    },

    // Shimmer layer
    shimmer: {
      intensity: tension > 0.5 ? 0.5 + (tension * 0.3) : 0.3,
      amplitude: isBreathing ? 0.3 : 0.5,
    },

    // Ghost melody layer
    ghostMelody: {
      scale,
      noteProbability: 0.05 + (ambientActivity * 0.15),
      scalePosition: gameState.inning % 7,
      amplitude: 0.4,
    },

    // Master effects
    master: {
      reverbDecay: isBreathing ? 6.0 : 4.5 - (tension * 1.5),
      stereoWidth: tension > 0.7 ? 0.8 : 1.0,
      saturation: 0.1 + (tension * 0.1),
    },
  };
}

/**
 * Get default parameters when no game state
 */
function getDefaultParams() {
  return {
    tonalCenter: 'C',
    mode: 'mixolydian',
    scale: buildScale('C', 'mixolydian', 3, 5),
    tension: 0.3,
    isBreathing: true,
    ambientActivity: 0.5,
    timeSinceLastChange: 15,
    events: [],
    eventResponses: [],
    drone: { frequency: 130.81, amplitude: 0.6, filterCutoff: 300 },
    pad: { voicing: ['C3', 'E3', 'G3', 'B3'], frequencies: [130.81, 164.81, 196, 246.94], filterCutoff: 800, amplitude: 0.5 },
    bells: { scale: [], densityProbability: 0.2, register: 'mid', amplitude: 0.5 },
    air: { amount: 0.4, filterCenter: 5000, amplitude: 0.3 },
    shimmer: { intensity: 0.3, amplitude: 0.4 },
    ghostMelody: { scale: [], noteProbability: 0.1, scalePosition: 0, amplitude: 0.4 },
    master: { reverbDecay: 4.5, stereoWidth: 1.0, saturation: 0.1 },
  };
}
```

**Step 2: Commit**

```bash
git add src/audio/interpreter.js
git commit -m "feat(audio): implement game state interpreter"
```

---

## Phase 5: Effects

### Task 8: Filter Module

**Files:**
- Create: `src/audio/effects/filter.js`

**Step 1: Write filter module**

```javascript
// src/audio/effects/filter.js

import { el } from '@elemaudio/core';

/**
 * Low-pass filter with resonance
 */
export function lowpass(cutoffHz, q, signal, key) {
  return el.lowpass(
    el.const({ key: `${key}-cutoff`, value: cutoffHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );
}

/**
 * High-pass filter
 */
export function highpass(cutoffHz, q, signal, key) {
  return el.highpass(
    el.const({ key: `${key}-cutoff`, value: cutoffHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );
}

/**
 * Band-pass filter
 */
export function bandpass(centerHz, q, signal, key) {
  return el.bandpass(
    el.const({ key: `${key}-center`, value: centerHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );
}

/**
 * Combined low-cut and high-cut filter
 */
export function bandlimit(lowCutHz, highCutHz, signal, key) {
  let filtered = signal;
  if (lowCutHz > 0) {
    filtered = highpass(lowCutHz, 0.707, filtered, `${key}-lc`);
  }
  if (highCutHz < 20000) {
    filtered = lowpass(highCutHz, 0.707, filtered, `${key}-hc`);
  }
  return filtered;
}
```

**Step 2: Commit**

```bash
git add src/audio/effects/filter.js
git commit -m "feat(audio): add filter effects module"
```

---

### Task 9: EQ Module

**Files:**
- Create: `src/audio/effects/eq.js`

**Step 1: Write EQ module**

```javascript
// src/audio/effects/eq.js

import { el } from '@elemaudio/core';
import { bandlimit } from './filter.js';

/**
 * Simple parametric EQ band (peaking filter approximation)
 * Uses parallel low-shelf and high-shelf for mid adjustment
 */
export function peakEQ(freqHz, gainDb, q, signal, key) {
  if (Math.abs(gainDb) < 0.5) return signal; // Skip if negligible

  // Convert dB to linear gain
  const gain = Math.pow(10, gainDb / 20);

  // Create a bandpass-filtered version and mix it
  const bandSignal = el.bandpass(
    el.const({ key: `${key}-freq`, value: freqHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );

  // Mix original with boosted/cut band
  const mixAmount = gain - 1; // How much to add/subtract
  return el.add(
    signal,
    el.mul(el.const({ key: `${key}-mix`, value: mixAmount }), bandSignal)
  );
}

/**
 * Apply per-layer EQ based on constants
 */
export function applyLayerEQ(signal, layerName, eqSettings, key) {
  const settings = eqSettings[layerName];
  if (!settings) return signal;

  // Apply bandlimiting
  let processed = bandlimit(settings.lowCut, settings.highCut, signal, `${key}-band`);

  // Apply mid EQ if present
  if (settings.midFreq && settings.midGain) {
    processed = peakEQ(settings.midFreq, settings.midGain, 1.5, processed, `${key}-mid`);
  }

  return processed;
}
```

**Step 2: Commit**

```bash
git add src/audio/effects/eq.js
git commit -m "feat(audio): add EQ effects module"
```

---

### Task 10: Dynamics Module

**Files:**
- Create: `src/audio/effects/dynamics.js`

**Step 1: Write dynamics module**

```javascript
// src/audio/effects/dynamics.js

import { el } from '@elemaudio/core';

/**
 * Soft clipper for gentle saturation
 */
export function softClip(amount, signal, key) {
  // Tanh-based soft clipping
  const drive = 1 + (amount * 3); // 1-4x drive
  return el.tanh(
    el.mul(
      el.const({ key: `${key}-drive`, value: drive }),
      signal
    )
  );
}

/**
 * Simple limiter using tanh at threshold
 */
export function limiter(thresholdDb, signal, key) {
  const threshold = Math.pow(10, thresholdDb / 20);
  // Normalize to threshold, clip, restore
  return el.mul(
    el.const({ key: `${key}-thresh`, value: threshold }),
    el.tanh(
      el.mul(
        el.const({ key: `${key}-inv-thresh`, value: 1 / threshold }),
        signal
      )
    )
  );
}

/**
 * Simple compression approximation using smooth envelope following
 * Not a true compressor but provides gentle dynamic control
 */
export function compress(ratio, signal, key) {
  // For true compression we'd need envelope detection
  // This is a simplified version using soft clipping
  const softness = 1 / ratio;
  return softClip(softness, signal, key);
}
```

**Step 2: Commit**

```bash
git add src/audio/effects/dynamics.js
git commit -m "feat(audio): add dynamics processing module"
```

---

### Task 11: Reverb Module

**Files:**
- Create: `src/audio/effects/reverb.js`

**Step 1: Write reverb module**

```javascript
// src/audio/effects/reverb.js

import { el } from '@elemaudio/core';

/**
 * Schroeder-style reverb using allpass and comb filters
 * Simplified for Elementary Audio
 */
export function reverb(decay, mix, damping, signal, key) {
  // Pre-delay
  const preDelayed = el.delay(
    { size: 4410 }, // 100ms max at 44.1k
    el.ms2samps(30), // 30ms pre-delay
    0,
    signal
  );

  // Parallel comb filters at different prime-number delays
  const combDelays = [1557, 1617, 1491, 1422, 1277, 1356]; // samples (~35-40ms at 44.1k)
  const combOutputs = combDelays.map((delaySamples, i) => {
    const feedback = decay * (1 - damping * 0.3);
    return el.delay(
      { size: delaySamples + 100 },
      el.const({ key: `${key}-comb-${i}-time`, value: delaySamples }),
      el.const({ key: `${key}-comb-${i}-fb`, value: feedback * 0.7 }),
      preDelayed
    );
  });

  // Sum comb outputs
  let reverbSignal = combOutputs[0];
  for (let i = 1; i < combOutputs.length; i++) {
    reverbSignal = el.add(reverbSignal, combOutputs[i]);
  }

  // Scale down
  reverbSignal = el.mul(
    el.const({ key: `${key}-scale`, value: 0.15 }),
    reverbSignal
  );

  // Series allpass filters for diffusion
  const allpassDelays = [225, 556, 441, 341];
  for (let i = 0; i < allpassDelays.length; i++) {
    const g = 0.5; // allpass coefficient
    reverbSignal = el.delay(
      { size: allpassDelays[i] + 100 },
      el.const({ key: `${key}-ap-${i}-time`, value: allpassDelays[i] }),
      el.const({ key: `${key}-ap-${i}-fb`, value: g }),
      reverbSignal
    );
  }

  // Damping (lowpass on wet signal)
  const dampFreq = 2000 + (1 - damping) * 8000; // 2k-10k Hz
  reverbSignal = el.lowpass(
    el.const({ key: `${key}-damp-freq`, value: dampFreq }),
    0.707,
    reverbSignal
  );

  // Wet/dry mix
  return el.add(
    el.mul(el.const({ key: `${key}-dry`, value: 1 - mix }), signal),
    el.mul(el.const({ key: `${key}-wet`, value: mix }), reverbSignal)
  );
}

/**
 * Simple stereo reverb (different delays for L/R)
 */
export function stereoReverb(decay, mix, damping, signalL, signalR, key) {
  return {
    left: reverb(decay, mix, damping, signalL, `${key}-L`),
    right: reverb(decay * 1.02, mix, damping * 0.95, signalR, `${key}-R`), // Slight variation
  };
}
```

**Step 2: Commit**

```bash
git add src/audio/effects/reverb.js
git commit -m "feat(audio): add reverb effects module"
```

---

### Task 12: Effects Index

**Files:**
- Create: `src/audio/effects/index.js`

**Step 1: Write effects index**

```javascript
// src/audio/effects/index.js

export { lowpass, highpass, bandpass, bandlimit } from './filter.js';
export { peakEQ, applyLayerEQ } from './eq.js';
export { softClip, limiter, compress } from './dynamics.js';
export { reverb, stereoReverb } from './reverb.js';
```

**Step 2: Commit**

```bash
git add src/audio/effects/index.js
git commit -m "feat(audio): add effects index"
```

---

## Phase 6: Layer Renderers

### Task 13: Drone Layer

**Files:**
- Create: `src/audio/layers/drone.js`

**Step 1: Write drone layer**

```javascript
// src/audio/layers/drone.js

import { el } from '@elemaudio/core';
import { lowpass } from '../effects/filter.js';
import { softClip } from '../effects/dynamics.js';
import { LAYERS } from '../constants.js';

/**
 * Render drone layer
 * Layered sines (fundamental + sub-octave) + gentle saturation
 */
export function renderDrone(params, key = 'drone') {
  const { frequency, amplitude, filterCutoff } = params;
  const config = LAYERS.drone;

  // Fundamental sine
  const fundamental = el.cycle({
    key: `${key}-fund`,
    freq: el.const({ key: `${key}-fund-freq`, value: frequency })
  });

  // Sub-octave (one octave below)
  const subOctave = el.cycle({
    key: `${key}-sub`,
    freq: el.const({ key: `${key}-sub-freq`, value: frequency / 2 })
  });

  // Fifth above (subtle)
  const fifth = el.cycle({
    key: `${key}-fifth`,
    freq: el.const({ key: `${key}-fifth-freq`, value: frequency * 1.5 })
  });

  // Mix layers
  const mixed = el.add(
    el.mul(el.const({ key: `${key}-fund-amp`, value: 0.5 }), fundamental),
    el.mul(el.const({ key: `${key}-sub-amp`, value: 0.35 }), subOctave),
    el.mul(el.const({ key: `${key}-fifth-amp`, value: 0.15 }), fifth)
  );

  // Filter
  const filtered = lowpass(filterCutoff, 1.0, mixed, `${key}-filt`);

  // Gentle saturation
  const saturated = softClip(0.2, filtered, `${key}-sat`);

  // Output amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude }),
    saturated
  );
}
```

**Step 2: Commit**

```bash
git add src/audio/layers/drone.js
git commit -m "feat(audio): implement drone layer"
```

---

### Task 14: Pad Layer

**Files:**
- Create: `src/audio/layers/pad.js`

**Step 1: Write pad layer**

```javascript
// src/audio/layers/pad.js

import { el } from '@elemaudio/core';
import { lowpass } from '../effects/filter.js';
import { LAYERS } from '../constants.js';

/**
 * Render pad layer
 * Filtered saw → low-pass filter → stereo spread
 */
export function renderPad(params, key = 'pad') {
  const { frequencies, filterCutoff, amplitude } = params;
  const config = LAYERS.pad;

  // Generate voices for each frequency in voicing
  const voices = frequencies.slice(0, config.voices).map((freq, i) => {
    // Slightly detuned saw waves for richness
    const saw1 = el.blepsaw({
      key: `${key}-v${i}-saw1`,
      freq: el.const({ key: `${key}-v${i}-freq1`, value: freq })
    });

    const saw2 = el.blepsaw({
      key: `${key}-v${i}-saw2`,
      freq: el.const({ key: `${key}-v${i}-freq2`, value: freq * 1.003 }) // Slight detune
    });

    const saw3 = el.blepsaw({
      key: `${key}-v${i}-saw3`,
      freq: el.const({ key: `${key}-v${i}-freq3`, value: freq * 0.997 }) // Slight detune other direction
    });

    // Mix the detuned saws
    return el.mul(
      el.const({ key: `${key}-v${i}-mix`, value: 0.33 }),
      el.add(saw1, saw2, saw3)
    );
  });

  // Sum all voices
  let summed = voices[0] || el.const({ value: 0 });
  for (let i = 1; i < voices.length; i++) {
    summed = el.add(summed, voices[i]);
  }

  // Scale by number of voices
  summed = el.mul(
    el.const({ key: `${key}-voice-scale`, value: 1 / Math.max(voices.length, 1) }),
    summed
  );

  // Low-pass filter modulated by tension
  const filtered = lowpass(filterCutoff, 2.0, summed, `${key}-filt`);

  // Output amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude }),
    filtered
  );
}

/**
 * Render stereo pad (returns L and R channels)
 */
export function renderStereoPad(params, key = 'pad') {
  const mono = renderPad(params, key);
  const config = LAYERS.pad;

  // Create stereo spread using slight delay and filtering differences
  const left = el.mul(
    el.const({ key: `${key}-L-amp`, value: 1.0 }),
    mono
  );

  const right = el.delay(
    { size: 441 }, // ~10ms max
    el.const({ key: `${key}-R-delay`, value: 88 }), // ~2ms delay
    0,
    mono
  );

  return { left, right };
}
```

**Step 2: Commit**

```bash
git add src/audio/layers/pad.js
git commit -m "feat(audio): implement pad layer"
```

---

### Task 15: Bells Layer

**Files:**
- Create: `src/audio/layers/bells.js`

**Step 1: Write bells layer**

```javascript
// src/audio/layers/bells.js

import { el } from '@elemaudio/core';
import { LAYERS } from '../constants.js';

/**
 * FM bell voice
 * 2-operator FM with 1:2.4 ratio (bell-like timbre)
 */
function fmBell(frequency, amplitude, key) {
  const carrierFreq = frequency;
  const modulatorFreq = frequency * 2.4; // Bell-like ratio
  const modulationIndex = 3; // Controls brightness

  // Modulator
  const modulator = el.mul(
    el.const({ key: `${key}-mod-depth`, value: modulationIndex * modulatorFreq }),
    el.cycle({
      key: `${key}-mod`,
      freq: el.const({ key: `${key}-mod-freq`, value: modulatorFreq })
    })
  );

  // Carrier with FM
  const carrier = el.cycle({
    key: `${key}-car`,
    freq: el.add(
      el.const({ key: `${key}-car-freq`, value: carrierFreq }),
      modulator
    )
  });

  // Amplitude envelope (fast attack, long decay)
  // Using a simple decay for now
  const env = el.const({ key: `${key}-env`, value: amplitude });

  return el.mul(env, carrier);
}

/**
 * Render bells layer
 * Returns mono signal (panning handled in master)
 */
export function renderBells(params, activeNotes = [], key = 'bells') {
  const { amplitude } = params;
  const config = LAYERS.bells;

  if (activeNotes.length === 0) {
    return el.const({ key: `${key}-silence`, value: 0 });
  }

  // Render each active bell voice
  const voices = activeNotes.slice(0, config.voices).map((note, i) => {
    return fmBell(note.frequency, note.amplitude || 0.5, `${key}-v${i}`);
  });

  // Sum voices
  let summed = voices[0];
  for (let i = 1; i < voices.length; i++) {
    summed = el.add(summed, voices[i]);
  }

  // Scale and output
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude / Math.max(voices.length, 1) }),
    summed
  );
}

/**
 * Render stereo bells with panning
 */
export function renderStereoBells(params, activeNotes = [], key = 'bells') {
  const config = LAYERS.bells;

  if (activeNotes.length === 0) {
    return {
      left: el.const({ key: `${key}-L-silence`, value: 0 }),
      right: el.const({ key: `${key}-R-silence`, value: 0 })
    };
  }

  // Render each voice with its pan position
  let leftSum = el.const({ key: `${key}-L-init`, value: 0 });
  let rightSum = el.const({ key: `${key}-R-init`, value: 0 });

  activeNotes.slice(0, config.voices).forEach((note, i) => {
    const voice = fmBell(note.frequency, note.amplitude || 0.5, `${key}-v${i}`);
    const pan = config.panPositions[i % config.panPositions.length];

    // Equal power panning
    const leftGain = Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = Math.sin((pan + 1) * Math.PI / 4);

    leftSum = el.add(leftSum, el.mul(el.const({ key: `${key}-v${i}-L`, value: leftGain }), voice));
    rightSum = el.add(rightSum, el.mul(el.const({ key: `${key}-v${i}-R`, value: rightGain }), voice));
  });

  const scale = params.amplitude / Math.max(activeNotes.length, 1);
  return {
    left: el.mul(el.const({ key: `${key}-L-amp`, value: scale }), leftSum),
    right: el.mul(el.const({ key: `${key}-R-amp`, value: scale }), rightSum)
  };
}
```

**Step 2: Commit**

```bash
git add src/audio/layers/bells.js
git commit -m "feat(audio): implement bells layer with FM synthesis"
```

---

### Task 16: Air Layer

**Files:**
- Create: `src/audio/layers/air.js`

**Step 1: Write air layer**

```javascript
// src/audio/layers/air.js

import { el } from '@elemaudio/core';
import { bandpass } from '../effects/filter.js';
import { LAYERS } from '../constants.js';

/**
 * Render air/texture layer
 * Filtered pink noise → band-pass sweep
 */
export function renderAir(params, key = 'air') {
  const { amount, filterCenter, amplitude } = params;
  const config = LAYERS.air;

  // Pink noise source
  const noise = el.pinknoise({ key: `${key}-noise` });

  // Band-pass filter with wide Q for texture
  const filtered = bandpass(filterCenter, 0.5, noise, `${key}-bp`);

  // Scale by amount and amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude * amount }),
    filtered
  );
}

/**
 * Render stereo air (full width)
 */
export function renderStereoAir(params, key = 'air') {
  const config = LAYERS.air;

  // Two independent noise sources for true stereo
  const left = renderAir(params, `${key}-L`);
  const right = renderAir(
    { ...params, filterCenter: params.filterCenter * 1.05 }, // Slight variation
    `${key}-R`
  );

  return { left, right };
}
```

**Step 2: Commit**

```bash
git add src/audio/layers/air.js
git commit -m "feat(audio): implement air/texture layer"
```

---

### Task 17: Shimmer Layer

**Files:**
- Create: `src/audio/layers/shimmer.js`

**Step 1: Write shimmer layer**

```javascript
// src/audio/layers/shimmer.js

import { el } from '@elemaudio/core';
import { highpass } from '../effects/filter.js';
import { LAYERS } from '../constants.js';

/**
 * Render shimmer layer
 * Octave-up pitch shift simulation → long diffuse reverb → high-pass
 *
 * Note: True pitch shifting is complex in Elementary.
 * This approximates shimmer using ring modulation and filtering.
 */
export function renderShimmer(params, padSignal, key = 'shimmer') {
  const { intensity, amplitude } = params;
  const config = LAYERS.shimmer;

  // Ring modulation to create upper harmonics
  // Modulating with a high frequency adds octave-like content
  const modFreq = 880; // A5 - creates shimmery overtones
  const modulator = el.cycle({
    key: `${key}-mod`,
    freq: el.const({ key: `${key}-mod-freq`, value: modFreq })
  });

  // Ring mod the pad signal
  const ringMod = el.mul(padSignal, modulator);

  // High-pass to remove low frequencies, keep only shimmer
  const filtered = highpass(800, 0.707, ringMod, `${key}-hp`);

  // Scale by intensity and amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude * intensity }),
    filtered
  );
}

/**
 * Render stereo shimmer with auto-pan
 */
export function renderStereoShimmer(params, padSignalL, padSignalR, time, key = 'shimmer') {
  const config = LAYERS.shimmer;

  // Process each channel
  const shimmerL = renderShimmer(params, padSignalL, `${key}-L`);
  const shimmerR = renderShimmer(
    { ...params, intensity: params.intensity * 0.95 }, // Slight variation
    padSignalR,
    `${key}-R`
  );

  // Auto-pan using slow LFO (simulated via time-based modulation)
  // In a real implementation, we'd use el.cycle for LFO
  // For now, return as-is (auto-pan can be added later)

  return { left: shimmerL, right: shimmerR };
}
```

**Step 2: Commit**

```bash
git add src/audio/layers/shimmer.js
git commit -m "feat(audio): implement shimmer layer"
```

---

### Task 18: Ghost Melody Layer

**Files:**
- Create: `src/audio/layers/ghostMelody.js`

**Step 1: Write ghost melody layer**

```javascript
// src/audio/layers/ghostMelody.js

import { el } from '@elemaudio/core';
import { lowpass } from '../effects/filter.js';
import { LAYERS } from '../constants.js';

/**
 * Ghost melody voice
 * Sine + slight FM → subtle vibrato
 */
function ghostVoice(frequency, amplitude, key) {
  // Vibrato LFO
  const vibratoRate = 4; // Hz
  const vibratoDepth = 3; // Hz deviation

  const vibrato = el.mul(
    el.const({ key: `${key}-vib-depth`, value: vibratoDepth }),
    el.cycle({
      key: `${key}-vib-lfo`,
      freq: el.const({ key: `${key}-vib-rate`, value: vibratoRate })
    })
  );

  // Main oscillator with vibrato
  const carrier = el.cycle({
    key: `${key}-osc`,
    freq: el.add(
      el.const({ key: `${key}-freq`, value: frequency }),
      vibrato
    )
  });

  // Slight FM for warmth
  const fmMod = el.mul(
    el.const({ key: `${key}-fm-depth`, value: frequency * 0.5 }),
    el.cycle({
      key: `${key}-fm-osc`,
      freq: el.const({ key: `${key}-fm-freq`, value: frequency * 2 })
    })
  );

  const withFM = el.cycle({
    key: `${key}-main`,
    freq: el.add(
      el.const({ key: `${key}-base-freq`, value: frequency }),
      vibrato,
      el.mul(el.const({ key: `${key}-fm-amt`, value: 0.1 }), fmMod)
    )
  });

  // Mix pure sine with FM version
  const mixed = el.add(
    el.mul(el.const({ key: `${key}-pure-amt`, value: 0.7 }), carrier),
    el.mul(el.const({ key: `${key}-fm-mix`, value: 0.3 }), withFM)
  );

  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude }),
    mixed
  );
}

/**
 * Render ghost melody layer
 */
export function renderGhostMelody(params, activeNote = null, key = 'ghost') {
  const { amplitude } = params;
  const config = LAYERS.ghostMelody;

  if (!activeNote) {
    return el.const({ key: `${key}-silence`, value: 0 });
  }

  const voice = ghostVoice(activeNote.frequency, amplitude, key);

  // Gentle low-pass for warmth
  return lowpass(4000, 0.707, voice, `${key}-lp`);
}

/**
 * Render stereo ghost melody (slightly off-center)
 */
export function renderStereoGhostMelody(params, activeNote = null, key = 'ghost') {
  const config = LAYERS.ghostMelody;
  const mono = renderGhostMelody(params, activeNote, key);

  // Pan slightly off-center (config.pan = 0.2)
  const pan = config.pan;
  const leftGain = Math.cos((pan + 1) * Math.PI / 4);
  const rightGain = Math.sin((pan + 1) * Math.PI / 4);

  return {
    left: el.mul(el.const({ key: `${key}-L-pan`, value: leftGain }), mono),
    right: el.mul(el.const({ key: `${key}-R-pan`, value: rightGain }), mono)
  };
}
```

**Step 2: Commit**

```bash
git add src/audio/layers/ghostMelody.js
git commit -m "feat(audio): implement ghost melody layer"
```

---

### Task 19: Layers Index

**Files:**
- Create: `src/audio/layers/index.js`

**Step 1: Write layers index**

```javascript
// src/audio/layers/index.js

export { renderDrone } from './drone.js';
export { renderPad, renderStereoPad } from './pad.js';
export { renderBells, renderStereoBells } from './bells.js';
export { renderAir, renderStereoAir } from './air.js';
export { renderShimmer, renderStereoShimmer } from './shimmer.js';
export { renderGhostMelody, renderStereoGhostMelody } from './ghostMelody.js';
```

**Step 2: Commit**

```bash
git add src/audio/layers/index.js
git commit -m "feat(audio): add layers index"
```

---

## Phase 7: Voice Management

### Task 20: Voice Allocator

**Files:**
- Create: `src/audio/voices.js`

**Step 1: Write voice allocator**

```javascript
// src/audio/voices.js

import { VOICE_PRIORITY, LAYERS } from './constants.js';
import { noteToFrequency } from './harmony.js';

/**
 * Voice state for a single layer
 */
class LayerVoices {
  constructor(layerName, maxVoices) {
    this.layerName = layerName;
    this.maxVoices = maxVoices;
    this.voices = []; // { id, frequency, amplitude, startTime, note }
    this.nextId = 0;
  }

  /**
   * Allocate a new voice, stealing if necessary
   */
  allocate(note, frequency, amplitude = 1.0) {
    const voice = {
      id: this.nextId++,
      note,
      frequency,
      amplitude,
      startTime: Date.now()
    };

    if (this.voices.length < this.maxVoices) {
      this.voices.push(voice);
    } else {
      // Steal oldest voice
      this.voices.sort((a, b) => a.startTime - b.startTime);
      this.voices[0] = voice;
    }

    return voice;
  }

  /**
   * Release a voice by note
   */
  release(note) {
    this.voices = this.voices.filter(v => v.note !== note);
  }

  /**
   * Release all voices
   */
  releaseAll() {
    this.voices = [];
  }

  /**
   * Get active voices
   */
  getActive() {
    return [...this.voices];
  }
}

/**
 * Global voice manager across all layers
 */
export class VoiceManager {
  constructor() {
    this.layers = {};

    // Initialize layer voice pools
    for (const [name, config] of Object.entries(LAYERS)) {
      this.layers[name] = new LayerVoices(name, config.voices);
    }

    // Track active bell notes for Euclidean triggering
    this.pendingBells = [];

    // Ghost melody state
    this.ghostMelodyNote = null;
  }

  /**
   * Trigger a bell note
   */
  triggerBell(note, amplitude = 0.5) {
    const frequency = typeof note === 'string' ? noteToFrequency(note) : note;
    return this.layers.bells.allocate(note, frequency, amplitude);
  }

  /**
   * Trigger ghost melody note
   */
  triggerGhostMelody(note, amplitude = 0.4) {
    const frequency = typeof note === 'string' ? noteToFrequency(note) : note;
    this.ghostMelodyNote = { note, frequency, amplitude };
    return this.ghostMelodyNote;
  }

  /**
   * Release ghost melody
   */
  releaseGhostMelody() {
    this.ghostMelodyNote = null;
  }

  /**
   * Update pad voicing
   */
  setPadVoicing(notes) {
    this.layers.pad.releaseAll();
    notes.forEach((note, i) => {
      const frequency = typeof note === 'string' ? noteToFrequency(note) : note;
      this.layers.pad.allocate(note, frequency, 1.0);
    });
  }

  /**
   * Update drone frequency
   */
  setDroneFrequency(frequency) {
    this.layers.drone.releaseAll();
    this.layers.drone.allocate('drone', frequency, 1.0);
  }

  /**
   * Get current voice state for rendering
   */
  getVoiceState() {
    return {
      drone: this.layers.drone.getActive(),
      pad: this.layers.pad.getActive(),
      bells: this.layers.bells.getActive(),
      air: this.layers.air.getActive(),
      shimmer: this.layers.shimmer.getActive(),
      ghostMelody: this.ghostMelodyNote
    };
  }

  /**
   * Clear voices that have been playing too long (bell decay)
   */
  cleanupDecayedVoices(bellDecayMs = 5000) {
    const now = Date.now();
    this.layers.bells.voices = this.layers.bells.voices.filter(
      v => (now - v.startTime) < bellDecayMs
    );
  }
}

// Singleton instance
let voiceManager = null;

export function getVoiceManager() {
  if (!voiceManager) {
    voiceManager = new VoiceManager();
  }
  return voiceManager;
}

export function resetVoiceManager() {
  voiceManager = new VoiceManager();
  return voiceManager;
}
```

**Step 2: Commit**

```bash
git add src/audio/voices.js
git commit -m "feat(audio): implement voice manager with allocation and stealing"
```

---

## Phase 8: Main Engine

### Task 21: Audio Engine Core

**Files:**
- Create: `src/audio/engine.js`

**Step 1: Write engine core**

```javascript
// src/audio/engine.js

import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';
import { interpret } from './interpreter.js';
import { combineDensityCurves, shouldFireAmbientEvent } from './euclidean.js';
import { getVoiceManager, resetVoiceManager } from './voices.js';
import { noteToFrequency } from './harmony.js';
import {
  renderDrone,
  renderStereoPad,
  renderStereoBells,
  renderStereoAir,
  renderStereoShimmer,
  renderStereoGhostMelody
} from './layers/index.js';
import { stereoReverb, softClip, limiter } from './effects/index.js';
import { TIMING, REVERB } from './constants.js';

/**
 * Main Audio Engine
 */
export class AudioEngine {
  constructor() {
    this.renderer = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.isPlaying = false;

    this.currentParams = null;
    this.prevGameState = null;
    this.voiceManager = null;

    this.unsubscribe = null;
    this.renderLoopId = null;
    this.startTime = 0;

    this.euclideanDensity = combineDensityCurves();
    this.masterVolume = 0.7;
  }

  /**
   * Initialize audio context and renderer
   */
  async initialize() {
    if (this.isInitialized) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.renderer = new WebRenderer();

    const node = await this.renderer.initialize(this.audioContext, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });

    node.connect(this.audioContext.destination);

    this.voiceManager = resetVoiceManager();
    this.startTime = Date.now();
    this.isInitialized = true;

    console.log('[AudioEngine] Initialized');
  }

  /**
   * Subscribe to game store
   */
  subscribeToStore(store) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = store.subscribe(
      (state) => state.games.get(state.activeGameId),
      (gameState, prevGameState) => this.onGameStateChange(gameState, prevGameState)
    );
  }

  /**
   * Handle game state changes
   */
  onGameStateChange(gameState, prevGameState) {
    this.prevGameState = prevGameState;
    this.currentParams = interpret(gameState, prevGameState, this.currentParams);

    // Update voice manager with new params
    if (this.currentParams) {
      this.voiceManager.setDroneFrequency(this.currentParams.drone.frequency);
      this.voiceManager.setPadVoicing(this.currentParams.pad.frequencies);
    }
  }

  /**
   * Start audio playback
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.startRenderLoop();

    console.log('[AudioEngine] Started');
  }

  /**
   * Stop audio playback
   */
  stop() {
    this.isPlaying = false;
    this.stopRenderLoop();

    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }

    console.log('[AudioEngine] Stopped');
  }

  /**
   * Start the render loop for ambient events
   */
  startRenderLoop() {
    if (this.renderLoopId) return;

    const loop = () => {
      if (!this.isPlaying) return;

      this.checkAmbientEvents();
      this.render();

      this.renderLoopId = setTimeout(loop, TIMING.renderInterval);
    };

    loop();
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop() {
    if (this.renderLoopId) {
      clearTimeout(this.renderLoopId);
      this.renderLoopId = null;
    }
  }

  /**
   * Check and trigger ambient events based on Euclidean probability
   */
  checkAmbientEvents() {
    if (!this.currentParams) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const density = this.euclideanDensity(elapsed);

    // Check bells
    if (shouldFireAmbientEvent(
      this.currentParams.bells.densityProbability,
      density,
      this.currentParams.timeSinceLastChange,
      this.currentParams.isBreathing ? 'Mid' : 'Top'
    )) {
      this.triggerRandomBell();
    }

    // Check ghost melody
    if (shouldFireAmbientEvent(
      this.currentParams.ghostMelody.noteProbability,
      density,
      this.currentParams.timeSinceLastChange,
      this.currentParams.isBreathing ? 'Mid' : 'Top'
    )) {
      this.triggerGhostMelodyNote();
    }

    // Cleanup decayed voices
    this.voiceManager.cleanupDecayedVoices();
  }

  /**
   * Trigger a random bell from the current scale
   */
  triggerRandomBell() {
    const scale = this.currentParams?.bells.scale || [];
    if (scale.length === 0) return;

    const register = this.currentParams.bells.register;
    let filteredScale = scale;

    if (register === 'high') {
      filteredScale = scale.filter(n => parseInt(n.slice(-1)) >= 4);
    } else if (register === 'low') {
      filteredScale = scale.filter(n => parseInt(n.slice(-1)) <= 3);
    }

    if (filteredScale.length === 0) filteredScale = scale;

    const note = filteredScale[Math.floor(Math.random() * filteredScale.length)];
    this.voiceManager.triggerBell(note, 0.3 + Math.random() * 0.3);
  }

  /**
   * Trigger a ghost melody note
   */
  triggerGhostMelodyNote() {
    const scale = this.currentParams?.ghostMelody.scale || [];
    if (scale.length === 0) return;

    const position = this.currentParams.ghostMelody.scalePosition;
    const note = scale[position % scale.length];

    this.voiceManager.triggerGhostMelody(note, 0.4);

    // Auto-release after a few seconds
    setTimeout(() => this.voiceManager.releaseGhostMelody(), 2000);
  }

  /**
   * Render the audio graph
   */
  render() {
    if (!this.isInitialized || !this.renderer || !this.currentParams) return;

    const params = this.currentParams;
    const voiceState = this.voiceManager.getVoiceState();

    // Render layers
    const drone = renderDrone(params.drone, 'drone');
    const { left: padL, right: padR } = renderStereoPad(params.pad, 'pad');
    const { left: bellsL, right: bellsR } = renderStereoBells(params.bells, voiceState.bells, 'bells');
    const { left: airL, right: airR } = renderStereoAir(params.air, 'air');
    const { left: shimmerL, right: shimmerR } = renderStereoShimmer(params.shimmer, padL, padR, 0, 'shimmer');
    const { left: ghostL, right: ghostR } = renderStereoGhostMelody(params.ghostMelody, voiceState.ghostMelody, 'ghost');

    // Sum all layers
    const sumL = el.add(drone, padL, bellsL, airL, shimmerL, ghostL);
    const sumR = el.add(drone, padR, bellsR, airR, shimmerR, ghostR);

    // Master effects
    const reverbDecay = params.master.reverbDecay;
    const { left: reverbL, right: reverbR } = stereoReverb(
      reverbDecay / 10, // normalize to 0-1 range
      REVERB.mix,
      REVERB.damping,
      sumL,
      sumR,
      'master-reverb'
    );

    // Soft saturation
    const satL = softClip(params.master.saturation, reverbL, 'master-sat-L');
    const satR = softClip(params.master.saturation, reverbR, 'master-sat-R');

    // Final limiter
    const limitedL = limiter(-1, satL, 'master-lim-L');
    const limitedR = limiter(-1, satR, 'master-lim-R');

    // Master volume
    const outL = el.mul(el.const({ key: 'master-vol-L', value: this.masterVolume }), limitedL);
    const outR = el.mul(el.const({ key: 'master-vol-R', value: this.masterVolume }), limitedR);

    // Render to Elementary
    this.renderer.render(outL, outR);
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Cleanup
   */
  disconnect() {
    this.stop();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.renderer = null;
    this.isInitialized = false;

    console.log('[AudioEngine] Disconnected');
  }
}

// Singleton
let engineInstance = null;

export function getEngine() {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}
```

**Step 2: Commit**

```bash
git add src/audio/engine.js
git commit -m "feat(audio): implement main audio engine"
```

---

### Task 22: Public API

**Files:**
- Create: `src/audio/index.js`

**Step 1: Write public API**

```javascript
// src/audio/index.js

import { getEngine } from './engine.js';

let storeRef = null;

/**
 * Connect audio engine to game store and start playback
 * @param {Object} store - Zustand store instance
 * @returns {Function} Cleanup function
 */
export async function connect(store) {
  storeRef = store;
  const engine = getEngine();

  await engine.initialize();
  engine.subscribeToStore(store);
  await engine.start();

  return () => disconnect();
}

/**
 * Disconnect audio engine
 */
export function disconnect() {
  const engine = getEngine();
  engine.disconnect();
  storeRef = null;
}

/**
 * Set master volume
 * @param {number} volume - Volume level (0-1)
 */
export function setMasterVolume(volume) {
  const engine = getEngine();
  engine.setVolume(volume);
}

/**
 * Check if audio is connected and playing
 * @returns {boolean}
 */
export function isConnected() {
  const engine = getEngine();
  return engine.isInitialized && engine.isPlaying;
}

/**
 * Check if audio is initialized (but maybe not playing)
 * @returns {boolean}
 */
export function isInitialized() {
  const engine = getEngine();
  return engine.isInitialized;
}

/**
 * Pause audio without disconnecting
 */
export function pause() {
  const engine = getEngine();
  engine.stop();
}

/**
 * Resume audio after pause
 */
export async function resume() {
  const engine = getEngine();
  if (engine.isInitialized) {
    await engine.start();
  }
}
```

**Step 2: Commit**

```bash
git add src/audio/index.js
git commit -m "feat(audio): implement public API"
```

---

## Phase 9: Integration

### Task 23: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update documentation**

Add to the Architecture section:

```markdown
### Audio Engine

**Location:** `src/audio/`

**Architecture:**
- `index.js` - Public API: `connect()`, `disconnect()`, `setMasterVolume()`
- `engine.js` - Main AudioEngine class, Elementary Audio renderer
- `interpreter.js` - Game state → musical parameters
- `euclidean.js` - Probability-based Euclidean density curves
- `harmony.js` - Scales, chords, modulation
- `events.js` - Game event detection and responses
- `voices.js` - Voice allocation across 6 layers
- `layers/` - Individual layer synthesis (drone, pad, bells, air, shimmer, ghostMelody)
- `effects/` - Filter, EQ, reverb, dynamics

**Usage:**
```javascript
import { connect, disconnect, setMasterVolume } from './audio';

// Connect to Zustand store and start audio
const cleanup = await connect(useGameStore);

// Adjust volume
setMasterVolume(0.8);

// Cleanup
cleanup(); // or disconnect();
```

**Key concepts:**
- Declarative rendering with Elementary Audio (React-like diffing)
- Euclidean density curves create probability-based ambient events (no perceivable pulse)
- 6 synthesis layers: Drone, Pad, Bell/Glass, Air, Shimmer, Ghost Melody
- Game state drives harmony, tension, density; events are subtle texture shifts
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add audio engine architecture to CLAUDE.md"
```

---

## Checklist

### Phase 1: Foundation
- [ ] Install Elementary Audio dependencies
- [ ] Create directory structure
- [ ] Write constants.js

### Phase 2: Euclidean Density
- [ ] Implement Bjorklund's algorithm
- [ ] Implement density curves and probability

### Phase 3: Harmony
- [ ] Implement scales and chords
- [ ] Implement mode/tonality from game state

### Phase 4: Interpreter
- [ ] Implement event detection
- [ ] Implement main interpreter

### Phase 5: Effects
- [ ] Implement filter module
- [ ] Implement EQ module
- [ ] Implement dynamics module
- [ ] Implement reverb module
- [ ] Create effects index

### Phase 6: Layers
- [ ] Implement drone layer
- [ ] Implement pad layer
- [ ] Implement bells layer
- [ ] Implement air layer
- [ ] Implement shimmer layer
- [ ] Implement ghost melody layer
- [ ] Create layers index

### Phase 7: Voice Management
- [ ] Implement voice allocator

### Phase 8: Main Engine
- [ ] Implement AudioEngine class
- [ ] Implement public API

### Phase 9: Integration
- [ ] Update CLAUDE.md
- [ ] Manual testing with playground
- [ ] Verify build passes

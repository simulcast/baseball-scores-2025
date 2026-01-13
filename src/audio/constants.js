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

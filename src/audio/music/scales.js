/**
 * Music theory utilities: scales, chords, note/MIDI conversion.
 * Pure functions — zero Tone.js dependency.
 */

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Intervals from root for each mode (semitones)
const MODE_INTERVALS = {
  lydian:     [0, 2, 4, 6, 7, 9, 11],
  ionian:     [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  aeolian:    [0, 2, 3, 5, 7, 8, 10],
};

// Chord tones as scale degree indices (0-indexed): root, 3rd, 5th, 7th
const CHORD_DEGREES = [0, 2, 4, 6];

/**
 * Parse a note string like 'C4' into { name, octave }.
 * Supports flats (Db, Eb, etc.) and naturals (C, D, etc.).
 */
export function parseNote(noteStr) {
  const match = noteStr.match(/^([A-G]b?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note: ${noteStr}`);
  return { name: match[1], octave: parseInt(match[2], 10) };
}

/** Convert a note string like 'C4' to MIDI number (C4 = 60). */
export function noteToMidi(noteStr) {
  const { name, octave } = parseNote(noteStr);
  const semitone = NOTE_NAMES.indexOf(name);
  if (semitone === -1) throw new Error(`Unknown note name: ${name}`);
  return (octave + 1) * 12 + semitone;
}

/** Convert a MIDI number to note string (60 = 'C4'). */
export function midiToNote(midi) {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[semitone]}${octave}`;
}

/** Convert MIDI number to frequency in Hz. */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Transpose a note string by semitones. */
export function transpose(noteStr, semitones) {
  return midiToNote(noteToMidi(noteStr) + semitones);
}

/** Get the chromatic index (0-11) for a note name like 'C', 'Db', etc. */
export function nameToIndex(name) {
  const idx = NOTE_NAMES.indexOf(name);
  if (idx === -1) throw new Error(`Unknown note name: ${name}`);
  return idx;
}

/** Get note name from chromatic index (0-11). */
export function indexToName(idx) {
  return NOTE_NAMES[((idx % 12) + 12) % 12];
}

/**
 * Get scale tone MIDI numbers for a given root and mode, in a specific octave range.
 * Returns all scale tones from lowOctave to highOctave inclusive.
 */
export function getScaleTones(rootName, mode, lowOctave = 3, highOctave = 5) {
  const intervals = MODE_INTERVALS[mode];
  if (!intervals) throw new Error(`Unknown mode: ${mode}`);
  const rootIdx = nameToIndex(rootName);

  const tones = [];
  for (let octave = lowOctave; octave <= highOctave; octave++) {
    for (const interval of intervals) {
      const midi = (octave + 1) * 12 + ((rootIdx + interval) % 12);
      if (midi >= (lowOctave + 1) * 12 && midi <= (highOctave + 1) * 12 + 11) {
        tones.push(midi);
      }
    }
  }
  return [...new Set(tones)].sort((a, b) => a - b);
}

/**
 * Get chord tone MIDI numbers (root, 3rd, 5th, 7th) for a given root and mode.
 * Returns tones in the specified octave range.
 */
export function getChordTones(rootName, mode, lowOctave = 3, highOctave = 5) {
  const intervals = MODE_INTERVALS[mode];
  if (!intervals) throw new Error(`Unknown mode: ${mode}`);
  const rootIdx = nameToIndex(rootName);

  const chordIntervals = CHORD_DEGREES.map(deg => intervals[deg]);
  const tones = [];
  for (let octave = lowOctave; octave <= highOctave; octave++) {
    for (const interval of chordIntervals) {
      const midi = (octave + 1) * 12 + ((rootIdx + interval) % 12);
      if (midi >= (lowOctave + 1) * 12 && midi <= (highOctave + 1) * 12 + 11) {
        tones.push(midi);
      }
    }
  }
  return [...new Set(tones)].sort((a, b) => a - b);
}

/** Get the available mode names. */
export function getModes() {
  return Object.keys(MODE_INTERVALS);
}

/** Cycle of fourths: C → F → Bb → Eb → Ab → Db → Gb → B → E → A → D → G */
export const CYCLE_OF_FOURTHS = [
  'C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G',
];

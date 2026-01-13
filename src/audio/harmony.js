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

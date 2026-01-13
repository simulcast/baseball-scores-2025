// src/audio/voices.js

import { LAYERS } from './constants.js';
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
    notes.forEach((note) => {
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

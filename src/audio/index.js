// src/audio/index.js

import { getEngine } from './engine.js';

/**
 * Connect the audio engine to the game store and start playback
 * @param {Object} store - Zustand store instance
 * @returns {Promise<void>}
 */
export async function connect(store) {
  const engine = getEngine();

  if (!engine.isInitialized) {
    await engine.initialize();
  }

  engine.subscribeToStore(store);
  await engine.start();

  console.log('[Audio] Connected to game store');
}

/**
 * Disconnect the audio engine and cleanup
 */
export function disconnect() {
  const engine = getEngine();
  engine.disconnect();

  console.log('[Audio] Disconnected');
}

/**
 * Check if audio is currently connected and playing
 * @returns {boolean}
 */
export function isConnected() {
  const engine = getEngine();
  return engine.isInitialized && engine.isPlaying;
}

/**
 * Pause audio playback (keeps connection)
 */
export function pause() {
  const engine = getEngine();
  engine.stop();
}

/**
 * Resume audio playback
 * @returns {Promise<void>}
 */
export async function resume() {
  const engine = getEngine();
  await engine.start();
}

/**
 * Set master volume
 * @param {number} volume - Volume level 0-1
 */
export function setMasterVolume(volume) {
  const engine = getEngine();
  engine.setVolume(volume);
}

/**
 * Get current master volume
 * @returns {number}
 */
export function getMasterVolume() {
  const engine = getEngine();
  return engine.masterVolume;
}

// Re-export engine for advanced usage
export { getEngine } from './engine.js';

// Re-export interpreter for testing/debugging
export { interpret } from './interpreter.js';

// Re-export harmony utilities
export {
  noteToFrequency,
  getModeFromScore,
  getTonalCenter,
  getPadVoicing
} from './harmony.js';

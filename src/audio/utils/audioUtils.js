import * as Tone from 'tone';

// Check if browser supports Web Audio API
export const isAudioSupported = () => {
  return 'AudioContext' in window || 'webkitAudioContext' in window;
};

// Convert linear volume (0-1) to decibels
export const linearToDb = (volume) => {
  return Tone.gainToDb(volume);
};
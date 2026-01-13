import { el } from '@elemaudio/core';

/**
 * Elementary Audio voices and effects for the baseball audio engine
 * This module contains all signal definitions for synthesizers and effects
 */

// Parameter key constants
export const PARAMS = {
  // Master controls
  MASTER_VOLUME: 'master:volume',
  MASTER_REVERB_MIX: 'master:reverb:mix',
  
  // Base synth parameters
  BASE_FREQ: 'base:freq',
  BASE_FILTER_CUTOFF: 'base:filter:cutoff',
  BASE_FILTER_Q: 'base:filter:q',
  
  // Event synth parameters
  EVENT_FREQ: 'event:freq',
  EVENT_DELAY_TIME: 'event:delay:time',
  EVENT_DELAY_FEEDBACK: 'event:delay:feedback',
  EVENT_DISTORTION: 'event:distortion:amount',
  
  // Sequence parameters
  BALL_SEQ_FREQ: 'ball:seq:freq',
  STRIKE_SEQ_FREQ: 'strike:seq:freq',
  OUT_SEQ_FREQ: 'out:seq:freq',
  RUNNER_SEQ_FREQ: 'runner:seq:freq',
  
  // Ambience parameters
  AMBIENCE_VOLUME: 'ambience:volume',
  AMBIENCE_FILTER_CUTOFF: 'ambience:filter:cutoff'
};

/**
 * Create a basic synthesizer voice with ADSR envelope
 * @param {Object} params - Voice parameters
 * @param {Signal} params.gate - Gate signal for triggering notes
 * @param {string} params.freqKey - Parameter key for frequency control
 * @param {string} params.oscType - Oscillator type ('sine', 'saw', 'square', 'triangle')
 * @returns {Signal} Mono audio signal
 */
export function createSynthVoice({ gate, freqKey, oscType = 'sine' }) {
  // Frequency with smooth parameter control
  const freq = el.sm(el.const({ key: freqKey, value: 440 }));
  
  // Select oscillator based on type
  let osc;
  switch (oscType) {
    case 'saw':
      osc = el.blepsaw(freq);
      break;
    case 'square':
      osc = el.blepsquare(freq);
      break;
    case 'triangle':
      osc = el.bleptriangle(freq);
      break;
    case 'sine':
    default:
      osc = el.cycle(freq);
      break;
  }
  
  // ADSR envelope for natural note articulation
  const env = el.adsr(
    0.01,  // Attack: 10ms
    0.1,   // Decay: 100ms
    0.7,   // Sustain: 70%
    0.3,   // Release: 300ms
    gate
  );
  
  // Apply envelope to oscillator
  return el.mul(osc, env);
}

/**
 * Create the base pad synthesizer for game atmosphere
 * @param {Signal} gate - Gate signal
 * @returns {Signal} Stereo signal [left, right]
 */
export function createBasePad(gate) {
  // Create multiple detuned oscillators for richness
  const voice1 = createSynthVoice({ 
    gate, 
    freqKey: PARAMS.BASE_FREQ, 
    oscType: 'saw' 
  });
  
  // Detuned voices for chorus effect
  const detune2 = el.add(
    el.sm(el.const({ key: PARAMS.BASE_FREQ, value: 440 })),
    el.const({ value: 1.5 }) // Slight detune
  );
  const voice2 = el.mul(
    el.blepsaw(detune2),
    el.adsr(0.01, 0.1, 0.7, 0.3, gate)
  );
  
  const detune3 = el.sub(
    el.sm(el.const({ key: PARAMS.BASE_FREQ, value: 440 })),
    el.const({ value: 1.2 })
  );
  const voice3 = el.mul(
    el.blepsaw(detune3),
    el.adsr(0.01, 0.1, 0.7, 0.3, gate)
  );
  
  // Mix voices
  const mixed = el.add(
    el.mul(0.4, voice1),
    el.mul(0.3, voice2),
    el.mul(0.3, voice3)
  );
  
  // Apply resonant filter
  const filtered = el.svf({
    mode: 'lp',
    cutoff: el.sm(el.const({ key: PARAMS.BASE_FILTER_CUTOFF, value: 800 })),
    Q: el.sm(el.const({ key: PARAMS.BASE_FILTER_Q, value: 2 }))
  }, mixed);
  
  // Create stereo spread
  const left = filtered;
  const right = el.delay(
    { size: 4096, times: el.ms2samps(20) },
    filtered
  );
  
  return [left, right];
}

/**
 * Create event synthesizer for game events (hits, runs, etc.)
 * @param {Signal} gate - Gate signal
 * @returns {Signal} Mono signal
 */
export function createEventSynth(gate) {
  const freq = el.sm(el.const({ key: PARAMS.EVENT_FREQ, value: 880 }));
  
  // Use triangle wave for softer event sounds
  const osc = el.bleptriangle(freq);
  
  // Percussive envelope
  const env = el.perc(0.001, 0.5, gate);
  
  // Apply envelope
  const signal = el.mul(osc, env);
  
  // Add some harmonic richness with subtle distortion
  const distAmount = el.sm(el.const({ key: PARAMS.EVENT_DISTORTION, value: 0.1 }));
  const distorted = el.tanh(el.mul(signal, el.add(1, distAmount)));
  
  // Delay effect for spatial depth
  const delayTime = el.sm(el.const({ key: PARAMS.EVENT_DELAY_TIME, value: el.ms2samps(200) }));
  const delayFeedback = el.sm(el.const({ key: PARAMS.EVENT_DELAY_FEEDBACK, value: 0.3 }));
  
  const delayed = el.delay({
    size: 44100,
    times: delayTime
  }, el.mul(delayFeedback, distorted));
  
  // Mix dry and wet
  return el.add(
    el.mul(0.7, distorted),
    el.mul(0.3, delayed)
  );
}

/**
 * Create sequence voice for balls/strikes/outs
 * @param {Signal} gate - Gate signal
 * @param {string} freqKey - Parameter key for frequency
 * @returns {Signal} Mono signal
 */
export function createSequenceVoice(gate, freqKey) {
  const freq = el.sm(el.const({ key: freqKey, value: 440 }));
  
  // Use sine wave for pure sequence tones
  const osc = el.cycle(freq);
  
  // Short percussive envelope
  const env = el.perc(0.005, 0.15, gate);
  
  // Apply envelope with some filtering for warmth
  const signal = el.mul(osc, env);
  const filtered = el.svf({
    mode: 'lp',
    cutoff: el.mul(freq, 4), // Cutoff tracks frequency
    Q: 1
  }, signal);
  
  return filtered;
}

/**
 * Create ambient pink noise generator
 * @returns {Signal} Stereo signal [left, right]
 */
export function createAmbience() {
  // Pink noise source
  const noise = el.pinknoise();
  
  // Volume control
  const volume = el.sm(el.const({ key: PARAMS.AMBIENCE_VOLUME, value: 0.1 }));
  
  // Low-pass filter for ocean-like sound
  const cutoff = el.sm(el.const({ key: PARAMS.AMBIENCE_FILTER_CUTOFF, value: 300 }));
  const filtered = el.svf({
    mode: 'lp',
    cutoff: cutoff,
    Q: 0.7
  }, noise);
  
  // Apply volume
  const signal = el.mul(filtered, volume);
  
  // Slight stereo difference for width
  const left = signal;
  const right = el.svf({
    mode: 'lp',
    cutoff: el.mul(cutoff, 1.1), // Slightly different cutoff
    Q: 0.7
  }, noise);
  
  return [el.mul(right, volume), left];
}

/**
 * Create master reverb effect using delay network
 * @param {Signal} inputLeft - Left input signal
 * @param {Signal} inputRight - Right input signal
 * @returns {Array<Signal>} Stereo reverb signal [left, right]
 */
export function createReverb(inputLeft, inputRight) {
  const mix = el.sm(el.const({ key: PARAMS.MASTER_REVERB_MIX, value: 0.2 }));
  
  // Simple reverb using multiple delays
  const delays = [
    { time: el.ms2samps(23), gain: 0.7 },
    { time: el.ms2samps(31), gain: 0.6 },
    { time: el.ms2samps(37), gain: 0.5 },
    { time: el.ms2samps(43), gain: 0.4 }
  ];
  
  // Create delay taps for each channel
  const leftDelays = delays.map(({ time, gain }) => 
    el.mul(gain, el.delay({ size: 4096, times: time }, inputLeft))
  );
  
  const rightDelays = delays.map(({ time, gain }) => 
    el.mul(gain, el.delay({ size: 4096, times: time }, inputRight))
  );
  
  // Sum all delays
  const leftReverb = leftDelays.reduce((acc, delay) => el.add(acc, delay));
  const rightReverb = rightDelays.reduce((acc, delay) => el.add(acc, delay));
  
  // High-frequency damping
  const leftDamped = el.svf({
    mode: 'lp',
    cutoff: 4000,
    Q: 0.7
  }, leftReverb);
  
  const rightDamped = el.svf({
    mode: 'lp',
    cutoff: 4000,
    Q: 0.7
  }, rightReverb);
  
  // Mix dry and wet signals
  const leftOut = el.add(
    el.mul(el.sub(1, mix), inputLeft),
    el.mul(mix, leftDamped)
  );
  
  const rightOut = el.add(
    el.mul(el.sub(1, mix), inputRight),
    el.mul(mix, rightDamped)
  );
  
  return [leftOut, rightOut];
}

/**
 * Create master output chain with volume control and limiting
 * @param {Signal} leftInput - Left channel input
 * @param {Signal} rightInput - Right channel input
 * @returns {Array<Signal>} Processed stereo output [left, right]
 */
export function createMasterOutput(leftInput, rightInput) {
  const masterVolume = el.sm(el.const({ key: PARAMS.MASTER_VOLUME, value: 0.7 }));
  
  // Apply master volume
  const leftScaled = el.mul(leftInput, masterVolume);
  const rightScaled = el.mul(rightInput, masterVolume);
  
  // Soft limiting to prevent clipping
  const leftLimited = el.tanh(el.mul(leftScaled, 0.9));
  const rightLimited = el.tanh(el.mul(rightScaled, 0.9));
  
  return [leftLimited, rightLimited];
}
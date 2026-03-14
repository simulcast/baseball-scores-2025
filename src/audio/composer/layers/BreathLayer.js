/**
 * BreathLayer: ambient texture — breath, tape hiss, and vinyl crackle.
 *
 * Four sub-voices:
 * 1. Breath: filtered pink noise with slow LFO (the "breathing" pad)
 * 2. Tape hiss: high-passed pink noise (constant, very quiet)
 * 3. Vinyl surface: continuous quiet white noise through bandpass (the "room tone" of a record)
 * 4. Vinyl crackle: dense micro-impulses via fast Tone.Loop — mostly tiny
 *    surface ticks with occasional louder pops. ~10-15 events/sec.
 *
 * Together these create the "analog playback" texture that tells the
 * listener's brain this isn't a digital source.
 *
 * Implements Layer contract: update, suspend, resume, dispose.
 */
import * as Tone from 'tone';

const BREATH_VOLUME = 0.055;
const HISS_VOLUME = 0.02;
const SURFACE_VOLUME = 0.012;
const CRACKLE_VOLUME = 0.04;
const LFO_MIN_FREQ = 0.08;
const LFO_MAX_FREQ = 0.125;
const CRACKLE_TICK_INTERVAL = 0.04; // 25 ticks/sec
const CRACKLE_FIRE_PROBABILITY = 0.45; // ~11 crackles/sec average
const CRACKLE_POP_PROBABILITY = 0.1; // 10% of crackles are louder pops

export class BreathLayer {
  constructor(output) {
    this.output = output;
    this.suspended = false;
    this.disposed = false;

    // --- Voice 1: Breath (filtered pink noise with slow LFO) ---
    this.breathNoise = new Tone.Noise('pink');
    this.breathNoise.volume.value = -30;

    this.breathFilter = new Tone.AutoFilter({
      frequency: LFO_MIN_FREQ,
      depth: 0.6,
      baseFrequency: 200,
      octaves: 2.5,
      type: 'sine',
    });

    this.breathGain = new Tone.Gain(BREATH_VOLUME);

    this.breathNoise.connect(this.breathFilter);
    this.breathFilter.connect(this.breathGain);
    this.breathGain.connect(output);

    this.breathNoise.start();
    this.breathFilter.start();

    // --- Voice 2: Tape hiss (high-passed pink noise, constant) ---
    this.hissNoise = new Tone.Noise('pink');
    this.hissNoise.volume.value = -28;

    // High-pass at 3kHz — only the "sss" frequencies of tape
    this.hissFilter = new Tone.Filter({
      frequency: 3000,
      type: 'highpass',
      rolloff: -12,
    });

    this.hissGain = new Tone.Gain(HISS_VOLUME);

    this.hissNoise.connect(this.hissFilter);
    this.hissFilter.connect(this.hissGain);
    this.hissGain.connect(output);

    this.hissNoise.start();

    // --- Voice 3: Vinyl surface noise (continuous filtered white noise) ---
    // The quiet "rolling" texture between crackle events — gives the
    // impression of a needle sitting in the groove at all times.
    this.surfaceNoise = new Tone.Noise('white');
    this.surfaceNoise.volume.value = -32;

    this.surfaceFilter = new Tone.Filter({
      frequency: 1800,
      type: 'bandpass',
      Q: 0.8,
    });

    this.surfaceGain = new Tone.Gain(SURFACE_VOLUME);

    this.surfaceNoise.connect(this.surfaceFilter);
    this.surfaceFilter.connect(this.surfaceGain);
    this.surfaceGain.connect(output);

    this.surfaceNoise.start();

    // --- Voice 4: Vinyl crackle (dense micro-impulse loop) ---
    // Real vinyl crackle = many short broadband impulses per second.
    // Amplitude distribution: mostly tiny surface ticks, occasional louder pops.
    this.crackleNoise = new Tone.Noise('white');
    this.crackleNoise.volume.value = -18;

    // Wider bandpass than before (Q 1.2 vs 3) centered lower (2.5kHz vs 4kHz)
    // — real dust impulses are broadband, not narrowly resonant
    this.crackleFilter = new Tone.Filter({
      frequency: 2500,
      type: 'bandpass',
      Q: 1.2,
    });

    this.crackleGain = new Tone.Gain(0); // silent between bursts

    this.crackleNoise.connect(this.crackleFilter);
    this.crackleFilter.connect(this.crackleGain);
    this.crackleGain.connect(output);

    this.crackleNoise.start();

    // Fast loop fires micro-bursts probabilistically
    this.crackleLoop = new Tone.Loop((time) => {
      this._tickCrackle(time);
    }, CRACKLE_TICK_INTERVAL);
    this.crackleLoop.start(Tone.now());
  }

  /**
   * Update brightness — controls breath LFO behavior.
   * Low brightness (quiet periods) = more breathing.
   * High brightness (active play) = less breathing, recedes.
   */
  update(harmonyState) {
    if (this.suspended || !this.breathFilter) return;

    const brightness = harmonyState?.brightness ?? 0;

    this.breathFilter.depth.value = 0.3 + (1 - brightness) * 0.5;
    this.breathFilter.frequency.value =
      LFO_MIN_FREQ + (1 - brightness) * (LFO_MAX_FREQ - LFO_MIN_FREQ);

    const targetGain = BREATH_VOLUME * (1 - brightness * 0.6);
    this.breathGain.gain.rampTo(targetGain, 2);
  }

  suspend() {
    this.suspended = true;
    this.breathNoise?.stop();
    this.hissNoise?.stop();
    this.surfaceNoise?.stop();
    this.crackleNoise?.stop();
    this.crackleLoop?.stop();
  }

  resume() {
    this.suspended = false;
    this.breathNoise?.start();
    this.hissNoise?.start();
    this.surfaceNoise?.start();
    this.crackleNoise?.start();
    this.crackleLoop?.start(Tone.now());
  }

  dispose() {
    this.suspended = true;
    this.disposed = true;

    this.breathNoise?.stop();
    this.breathNoise?.dispose();
    this.breathFilter?.dispose();
    this.breathGain?.dispose();

    this.hissNoise?.stop();
    this.hissNoise?.dispose();
    this.hissFilter?.dispose();
    this.hissGain?.dispose();

    this.surfaceNoise?.stop();
    this.surfaceNoise?.dispose();
    this.surfaceFilter?.dispose();
    this.surfaceGain?.dispose();

    this.crackleLoop?.stop();
    this.crackleLoop?.dispose();
    this.crackleNoise?.stop();
    this.crackleNoise?.dispose();
    this.crackleFilter?.dispose();
    this.crackleGain?.dispose();

    this.breathNoise = null;
    this.breathFilter = null;
    this.breathGain = null;
    this.hissNoise = null;
    this.hissFilter = null;
    this.hissGain = null;
    this.surfaceNoise = null;
    this.surfaceFilter = null;
    this.surfaceGain = null;
    this.crackleLoop = null;
    this.crackleNoise = null;
    this.crackleFilter = null;
    this.crackleGain = null;
  }

  // --- Private: crackle engine ---

  /**
   * Called 25x/sec by Tone.Loop. Probabilistically fires a micro-burst
   * of white noise (1-4ms) to simulate vinyl dust/surface imperfections.
   *
   * Amplitude distribution models real vinyl:
   * - 90% are tiny surface ticks (0.05-0.25x volume)
   * - 10% are audible pops (0.5-1.0x volume)
   * - Occasional double-click (30% chance after a pop)
   */
  _tickCrackle(time) {
    if (this.disposed || !this.crackleGain) return;

    if (Math.random() > CRACKLE_FIRE_PROBABILITY) return;

    // Amplitude: mostly tiny, occasionally loud
    const isPop = Math.random() < CRACKLE_POP_PROBABILITY;
    const amplitude = isPop
      ? CRACKLE_VOLUME * (0.5 + Math.random() * 0.5)
      : CRACKLE_VOLUME * (0.05 + Math.random() * 0.2);

    // Burst duration: 1-4ms (real dust impulses are < 5ms)
    const duration = 0.001 + Math.random() * 0.003;

    this.crackleGain.gain.setValueAtTime(amplitude, time);
    this.crackleGain.gain.setValueAtTime(0, time + duration);

    // Pops sometimes have a trailing click 15-40ms later
    if (isPop && Math.random() < 0.3) {
      const echoAmp = amplitude * (0.2 + Math.random() * 0.3);
      const echoTime = time + 0.015 + Math.random() * 0.025;
      const echoDuration = 0.001 + Math.random() * 0.002;
      this.crackleGain.gain.setValueAtTime(echoAmp, echoTime);
      this.crackleGain.gain.setValueAtTime(0, echoTime + echoDuration);
    }
  }
}

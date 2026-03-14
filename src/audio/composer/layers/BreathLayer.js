/**
 * BreathLayer: ambient texture — breath, tape hiss, and vinyl crackle.
 *
 * Three sub-voices:
 * 1. Breath: filtered pink noise with slow LFO (the "breathing" pad)
 * 2. Tape hiss: high-passed pink noise (constant, very quiet)
 * 3. Vinyl crackle: white noise bursts through a narrow bandpass,
 *    triggered at random intervals (2-6s) with random amplitude
 *
 * Together these create the "analog playback" texture that tells the
 * listener's brain this isn't a digital source.
 *
 * Implements Layer contract: update, suspend, resume, dispose.
 */
import * as Tone from 'tone';

const BREATH_VOLUME = 0.04;
const HISS_VOLUME = 0.012;
const CRACKLE_VOLUME = 0.02;
const LFO_MIN_FREQ = 0.08;
const LFO_MAX_FREQ = 0.125;
const CRACKLE_MIN_INTERVAL = 2000; // ms
const CRACKLE_MAX_INTERVAL = 6000;

export class BreathLayer {
  constructor(output) {
    this.output = output;
    this.suspended = false;
    this.disposed = false;
    this._crackleTimer = null;

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

    // --- Voice 3: Vinyl crackle (random white noise bursts) ---
    this.crackleNoise = new Tone.Noise('white');
    this.crackleNoise.volume.value = -20;

    // Narrow bandpass centered at 4kHz — the "tick" frequency of dust
    this.crackleFilter = new Tone.Filter({
      frequency: 4000,
      type: 'bandpass',
      Q: 3,
    });

    this.crackleGain = new Tone.Gain(0); // silent by default, bursts on

    this.crackleNoise.connect(this.crackleFilter);
    this.crackleFilter.connect(this.crackleGain);
    this.crackleGain.connect(output);

    this.crackleNoise.start();
    this._scheduleCrackle();
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
    this.crackleNoise?.stop();
    this._clearCrackle();
  }

  resume() {
    this.suspended = false;
    this.breathNoise?.start();
    this.hissNoise?.start();
    this.crackleNoise?.start();
    this._scheduleCrackle();
  }

  dispose() {
    this.suspended = true;
    this.disposed = true;
    this._clearCrackle();

    this.breathNoise?.stop();
    this.breathNoise?.dispose();
    this.breathFilter?.dispose();
    this.breathGain?.dispose();

    this.hissNoise?.stop();
    this.hissNoise?.dispose();
    this.hissFilter?.dispose();
    this.hissGain?.dispose();

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
    this.crackleNoise = null;
    this.crackleFilter = null;
    this.crackleGain = null;
  }

  // --- Private: crackle scheduling ---

  /** Schedule the next random crackle burst. */
  _scheduleCrackle() {
    if (this.suspended || this.disposed) return;

    const delay = CRACKLE_MIN_INTERVAL +
      Math.random() * (CRACKLE_MAX_INTERVAL - CRACKLE_MIN_INTERVAL);

    this._crackleTimer = setTimeout(() => this._fireCrackle(), delay);
  }

  /** Fire a single crackle: quick gain burst then silence. */
  _fireCrackle() {
    if (this.suspended || this.disposed || !this.crackleGain) return;

    // Random amplitude for natural variation
    const amplitude = CRACKLE_VOLUME * (0.3 + Math.random() * 0.7);
    const now = Tone.now();

    // Very short burst: 5-15ms
    this.crackleGain.gain.setValueAtTime(amplitude, now);
    this.crackleGain.gain.setValueAtTime(0, now + 0.005 + Math.random() * 0.01);

    // Sometimes fire a second click 20-50ms later (double crackle)
    if (Math.random() < 0.3) {
      const secondAmp = amplitude * (0.3 + Math.random() * 0.4);
      const secondTime = now + 0.02 + Math.random() * 0.03;
      this.crackleGain.gain.setValueAtTime(secondAmp, secondTime);
      this.crackleGain.gain.setValueAtTime(0, secondTime + 0.005 + Math.random() * 0.008);
    }

    this._scheduleCrackle();
  }

  _clearCrackle() {
    if (this._crackleTimer) {
      clearTimeout(this._crackleTimer);
      this._crackleTimer = null;
    }
  }
}

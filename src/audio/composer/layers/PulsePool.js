/**
 * PulsePool: a single prime-length melodic loop.
 *
 * Plays a repeating pattern of scale tones on a bell/mallet FMSynth.
 * Uses Tone.Loop for sample-accurate timing (no Transport dependency).
 * Prime-length patterns (5, 7, 11 steps) create Reich-style phasing
 * when multiple pools run simultaneously.
 *
 * Implements Layer contract: suspend, resume, dispose.
 * Additional: start, stop, updateNotes.
 */
import * as Tone from 'tone';
import { midiToNote } from '../../music/scales';

export class PulsePool {
  /**
   * @param {Tone.InputNode} output - Destination node
   * @param {number} steps - Pattern length (prime number: 5, 7, or 11)
   * @param {object} timbreColor - { harmonicity, modulationIndex } from team palette
   * @param {number} panValue - Stereo position (-1 to 1)
   */
  constructor(output, steps, timbreColor = {}, panValue = 0) {
    this.output = output;
    this.steps = steps;
    this.disposed = false;
    this.running = false;
    this.pattern = []; // MIDI values, length = steps
    this.stepIndex = 0;

    // Panner for stereo placement
    this.panner = new Tone.Panner(panValue);

    // Bell/mallet synth — FMSynth for metallic timbre
    this.synth = new Tone.FMSynth({
      harmonicity: timbreColor.harmonicity ?? 5.07,
      modulationIndex: timbreColor.modulationIndex ?? 1.2,
      envelope: { attack: 0.01, decay: 0.6, sustain: 0.0, release: 1.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.3 },
    });

    // Volume control — starts at 0, fades in
    this.gain = new Tone.Gain(0);

    // Wire: synth → gain → panner → output
    this.synth.connect(this.gain);
    this.gain.connect(this.panner);
    this.panner.connect(output);

    // Tone.Loop for sample-accurate repeating
    this.loop = new Tone.Loop((time) => {
      try {
        this._tick(time);
      } catch (err) {
        console.error('PulsePool loop error:', err);
        this.loop.stop();
      }
    }, '16n');
  }

  /**
   * Start the pool with given scale tones.
   * @param {number[]} scaleTones - Available MIDI values for the pattern
   * @param {number} fadeIn - Fade-in time in seconds
   */
  start(scaleTones, fadeIn = 2) {
    if (this.disposed || this.running) return;

    this._generatePattern(scaleTones);
    this.stepIndex = 0;
    this.running = true;

    // Fade in
    this.gain.gain.rampTo(0.08, fadeIn);

    // Start the loop
    this.loop.start(Tone.now());
  }

  /**
   * Stop the pool with fade-out.
   * @param {number} fadeOut - Fade-out time in seconds
   */
  stop(fadeOut = 3) {
    if (this.disposed || !this.running) return;

    this.gain.gain.rampTo(0, fadeOut);

    // Stop loop after fade
    setTimeout(() => {
      if (this.disposed) return;
      this.loop.stop();
      this.running = false;
    }, fadeOut * 1000);
  }

  /**
   * Update the scale tones mid-loop (harmony changed).
   * Regenerates the pattern with new tones.
   */
  updateNotes(scaleTones) {
    if (this.disposed) return;
    this._generatePattern(scaleTones);
  }

  /** Set stereo pan position (-1 to 1). */
  setPan(value) {
    if (this.panner) this.panner.pan.value = value;
  }

  suspend() {
    if (this.loop) this.loop.stop();
  }

  resume() {
    if (this.running && this.loop && !this.disposed) {
      this.loop.start(Tone.now());
    }
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    this.loop?.stop();
    this.loop?.dispose();
    this.synth?.dispose();
    this.gain?.dispose();
    this.panner?.dispose();
    this.loop = null;
    this.synth = null;
    this.gain = null;
    this.panner = null;
  }

  // --- Private ---

  /** Generate a pattern of `this.steps` notes from available scale tones. */
  _generatePattern(scaleTones) {
    if (!scaleTones || scaleTones.length === 0) {
      this.pattern = [];
      return;
    }

    // Pick tones in the mid range for clarity
    const midTones = scaleTones.filter(t => t >= 60 && t <= 84);
    const pool = midTones.length >= 3 ? midTones : scaleTones;

    // Generate pattern: pick notes somewhat randomly but musically
    // Use small intervals for melodic coherence
    this.pattern = [];
    let current = pool[Math.floor(pool.length / 2)]; // start in middle

    for (let i = 0; i < this.steps; i++) {
      this.pattern.push(current);

      // Step to a nearby note in the pool
      const currentIdx = pool.indexOf(current);
      const step = Math.random() < 0.6 ? 1 : 2; // mostly stepwise
      const direction = Math.random() < 0.5 ? -1 : 1;
      const nextIdx = Math.max(0, Math.min(pool.length - 1, currentIdx + step * direction));
      current = pool[nextIdx];
    }
  }

  /** Called by Tone.Loop on each tick. */
  _tick(time) {
    if (this.pattern.length === 0 || this.disposed) return;

    const midi = this.pattern[this.stepIndex % this.pattern.length];
    if (midi != null) {
      this.synth.triggerAttackRelease(midiToNote(midi), '32n', time);
    }

    this.stepIndex = (this.stepIndex + 1) % this.steps;
  }
}

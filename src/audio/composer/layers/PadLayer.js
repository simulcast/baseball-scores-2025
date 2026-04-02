/**
 * PadLayer: continuous harmonic bed.
 *
 * 2-3 voice pad sustaining chord tones from current harmony.
 * PolySynth(Tone.Synth) with sine wave + Chorus + shared Reverb.
 * Voice-leads smoothly on harmony changes.
 * Supports crossfadeTo() for game switching.
 * Idle drift: shifts voicing within chord when no updates for 15-20s.
 *
 * Implements Layer contract: update, suspend, resume, dispose.
 */
import * as Tone from 'tone';
import { assignVoices, pickInitialVoices } from '../../music/voiceLeading';
import { midiToNote } from '../../music/scales';

const NUM_VOICES = 3;
const IDLE_DRIFT_MS = 17000; // 17 seconds before drift
const DRIFT_TRANSITION_TIME = 4; // seconds for drift voice movement
const CROSSFADE_DEFAULT = 3; // seconds

export class PadLayer {
  constructor(output, panValue = 0) {
    this.output = output;
    this.suspended = false;
    this.disposed = false;
    this.currentVoices = []; // MIDI values currently sounding
    this.currentHarmony = null;
    this._idleTimer = null;
    this._crossfading = false;

    // Panner for stereo placement
    this.panner = new Tone.Panner(panValue);

    // Vibrato: slow analog pitch drift (~1 cent wandering)
    this.vibrato = new Tone.Vibrato({
      frequency: 0.12,
      depth: 0.006,
      wet: 1,
    });

    // Chorus: slow, deep for lush detuning (Eno warmth)
    this.chorus = new Tone.Chorus({
      frequency: 0.18,
      depth: 0.7,
      delayTime: 4.5,
      wet: 0.6,
    });

    // Main pad synth — fatsine: 3 detuned sine oscillators per voice.
    // Wider spread + vibrato + chorus = warm, drifting, alive.
    this.synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: NUM_VOICES + 1,
      voice: Tone.Synth,
      options: {
        oscillator: {
          type: 'fatsine',
          spread: 30,
          count: 3,
        },
        envelope: {
          attack: 4,
          decay: 2,
          sustain: 0.7,
          release: 5,
        },
      },
    });

    // Volume control — pad sits underneath pulse pools
    this.gain = new Tone.Gain(0.18);

    // Wire: synth → vibrato → chorus → gain → panner → output
    this.synth.connect(this.vibrato);
    this.vibrato.connect(this.chorus);
    this.chorus.connect(this.gain);
    this.gain.connect(this.panner);
    this.panner.connect(output);

    this.chorus.start();
  }

  /**
   * Update the pad to reflect new harmony.
   * Voice-leads from current positions to new chord tones.
   */
  update(harmonyState) {
    if (this.suspended || this.disposed || this._crossfading) return;
    if (!harmonyState) return;

    this.currentHarmony = harmonyState;
    const { chordTones } = harmonyState;

    if (this.currentVoices.length === 0) {
      // First time: pick initial voices
      this._startVoices(chordTones);
    } else {
      // Voice-lead to new chord
      const newVoices = assignVoices(this.currentVoices, chordTones);
      this._transitionVoices(newVoices, 2);
    }

    this._resetIdleDrift();
  }

  /**
   * Crossfade to a completely new harmony (game switch).
   * Fades out current pad, fades in new voicing.
   */
  crossfadeTo(harmonyState, duration = CROSSFADE_DEFAULT) {
    if (this.disposed) return;
    this._crossfading = true;
    this._clearIdleDrift();

    // Fade out current
    this.gain.gain.rampTo(0, duration * 0.4);

    // After fade-out, swap voicing and fade in
    const fadeInDelay = duration * 0.5;
    setTimeout(() => {
      if (this.disposed) return;

      // Release old notes
      this.synth.releaseAll();
      this.currentVoices = [];

      // Start new voicing
      this.currentHarmony = harmonyState;
      this._startVoices(harmonyState.chordTones);

      // Fade in
      this.gain.gain.rampTo(0.18, duration * 0.5);

      this._crossfading = false;
      this._resetIdleDrift();
    }, fadeInDelay * 1000);
  }

  /** Set stereo pan position (-1 to 1). */
  setPan(value) {
    if (this.panner) this.panner.pan.value = value;
  }

  suspend() {
    this.suspended = true;
    this._clearIdleDrift();
    this.synth?.releaseAll();
  }

  resume() {
    this.suspended = false;
    if (this.currentHarmony) {
      this._startVoices(this.currentHarmony.chordTones);
      this._resetIdleDrift();
    }
  }

  dispose() {
    this.disposed = true;
    this.suspended = true;
    this._clearIdleDrift();
    this.synth?.releaseAll();
    this.synth?.dispose();
    this.vibrato?.dispose();
    this.chorus?.dispose();
    this.gain?.dispose();
    this.panner?.dispose();
    this.synth = null;
    this.vibrato = null;
    this.chorus = null;
    this.gain = null;
    this.panner = null;
  }

  // --- Private ---

  _startVoices(chordTones) {
    if (!chordTones || chordTones.length === 0) return;
    this.currentVoices = pickInitialVoices(chordTones, NUM_VOICES, 60);
    const notes = this.currentVoices.map(midiToNote);
    const now = Tone.now();
    notes.forEach(note => {
      this.synth.triggerAttack(note, now);
    });
  }

  _transitionVoices(newVoices, transitionTime) {
    if (!newVoices || newVoices.length === 0) return;

    // Check if voices actually changed
    const changed = newVoices.some((v, i) => v !== this.currentVoices[i]);
    if (!changed) return;

    const now = Tone.now();

    // Release old notes that are changing
    const oldNotes = this.currentVoices.map(midiToNote);
    const newNotes = newVoices.map(midiToNote);

    oldNotes.forEach((note, i) => {
      if (note !== newNotes[i]) {
        this.synth.triggerRelease(note, now);
      }
    });

    // Attack new notes (after a brief overlap for smoothness)
    newNotes.forEach((note, i) => {
      if (note !== oldNotes[i]) {
        this.synth.triggerAttack(note, now + 0.5);
      }
    });

    this.currentVoices = newVoices;
  }

  /**
   * Idle drift: when no updates for ~17s, randomly shift one voice
   * to a different chord tone. Music for Airports generative technique.
   */
  _resetIdleDrift() {
    this._clearIdleDrift();
    this._idleTimer = setTimeout(() => this._drift(), IDLE_DRIFT_MS);
  }

  _clearIdleDrift() {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }

  _drift() {
    if (this.suspended || this.disposed || !this.currentHarmony) return;

    const { chordTones } = this.currentHarmony;
    if (!chordTones || chordTones.length === 0) return;

    // Pick a random voice to move
    const voiceIdx = Math.floor(Math.random() * this.currentVoices.length);
    const currentMidi = this.currentVoices[voiceIdx];

    // Pick a random chord tone that's different from current
    const candidates = chordTones.filter(t => t !== currentMidi);
    if (candidates.length === 0) {
      this._resetIdleDrift();
      return;
    }

    const newMidi = candidates[Math.floor(Math.random() * candidates.length)];
    const newVoices = [...this.currentVoices];
    newVoices[voiceIdx] = newMidi;

    this._transitionVoices(newVoices, DRIFT_TRANSITION_TIME);
    this._resetIdleDrift(); // schedule next drift
  }
}

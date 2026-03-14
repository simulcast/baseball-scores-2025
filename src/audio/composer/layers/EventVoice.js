/**
 * EventVoice: harmony-aware one-shot gestures for game events.
 *
 * Each event type triggers a short melodic gesture using notes
 * from the current HarmonyState. Replaces the old sounds.js.
 *
 * Implements Layer contract: update (no-op), suspend, resume, dispose.
 * Additional: handleEvent(event, harmonyState)
 */
import * as Tone from 'tone';
import { midiToNote } from '../../music/scales';

export class EventVoice {
  constructor(output, delaySend) {
    this.output = output;
    this.delaySend = delaySend;
    this.suspended = false;
    this.disposed = false;

    // Panner for stereo event placement
    this.panner = new Tone.Panner(0);

    // Bell synth for strikes and inning changes — softer, more glass than metal
    this.bellSynth = new Tone.FMSynth({
      harmonicity: 3.5,
      modulationIndex: 0.6,
      envelope: { attack: 0.05, decay: 1.0, sustain: 0.0, release: 2.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.04, decay: 0.4, sustain: 0, release: 0.8 },
    });

    // Arpeggio synth for run scored — warm, not crystalline
    this.arpeggioSynth = new Tone.AMSynth({
      harmonicity: 1.5,
      envelope: { attack: 0.08, decay: 0.4, sustain: 0.15, release: 2.5 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.15, decay: 0.3, sustain: 0.2, release: 0.6 },
    });

    // Low synth for outs and balls — round, muted
    this.lowSynth = new Tone.FMSynth({
      harmonicity: 1.0,
      modulationIndex: 0.3,
      envelope: { attack: 0.08, decay: 0.5, sustain: 0, release: 0.8 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.12, decay: 0.4, sustain: 0, release: 0.5 },
    });

    // Gain for volume control — events punctuate, not dominate
    this.gain = new Tone.Gain(0.12);

    // Wire: synths → gain → panner → output
    this.bellSynth.connect(this.gain);
    this.arpeggioSynth.connect(this.gain);
    this.lowSynth.connect(this.gain);
    this.gain.connect(this.panner);
    this.panner.connect(output);

    // Also send arpeggio to delay for shimmer
    if (delaySend) {
      this.arpeggioSynth.connect(delaySend);
    }
  }

  /** No-op for continuous update — EventVoice is event-driven. */
  update() {}

  /**
   * Handle a game event with the current harmony context.
   * @param {Object} event - { type, detail }
   * @param {Object} harmony - Current HarmonyState
   */
  handleEvent(event, harmony) {
    if (this.suspended || this.disposed) return;
    if (!event || !harmony) return;

    switch (event.type) {
      case 'runScored':    this._playRunScored(event.detail, harmony); break;
      case 'outRecorded':  this._playOutRecorded(harmony); break;
      case 'inningChange': this._playInningChange(harmony); break;
      case 'strike':       this._playStrike(harmony); break;
      case 'ball':         this._playBall(harmony); break;
      case 'statusChange': this._playStatusChange(event.detail, harmony); break;
      // gameSelected, runnerAdvance: intentionally silent
      // (runnerAdvance is handled by PulsePool starting)
    }
  }

  /** Set stereo pan for events (-1 to 1). */
  setPan(value) {
    if (this.panner) this.panner.pan.value = value;
  }

  suspend() {
    this.suspended = true;
  }

  resume() {
    this.suspended = false;
  }

  dispose() {
    this.disposed = true;
    this.suspended = true;
    this.bellSynth?.dispose();
    this.arpeggioSynth?.dispose();
    this.lowSynth?.dispose();
    this.gain?.dispose();
    this.panner?.dispose();
    this.bellSynth = null;
    this.arpeggioSynth = null;
    this.lowSynth = null;
    this.gain = null;
    this.panner = null;
  }

  // --- Private ---

  /** Random velocity (0.7–1.0) for natural dynamics. */
  _vel() {
    return 0.7 + Math.random() * 0.3;
  }

  /**
   * Safe trigger for monophonic synths with humanized velocity.
   * Catches scheduling errors during rapid game switching.
   */
  _safeTrigger(synth, note, duration, time) {
    try {
      synth.triggerAttackRelease(note, duration, time, this._vel());
    } catch (_) {
      // Synth had a pending note with a later start time — skip.
    }
  }

  /** Cancel any in-flight notes on all monophonic synths. */
  _cancelPending() {
    try { this.arpeggioSynth?.triggerRelease(); } catch (_) {}
    try { this.lowSynth?.triggerRelease(); } catch (_) {}
    try { this.bellSynth?.triggerRelease(); } catch (_) {}
  }

  // --- Event handlers ---

  /** Ascending arpeggio through current chord. */
  _playRunScored(detail, harmony) {
    this._cancelPending();
    const now = Tone.now();
    const { chordTones } = harmony;
    const count = Math.min(detail?.runs || 1, 4);

    // Pick ascending chord tones starting from mid-range
    const midTones = chordTones.filter(t => t >= 60 && t <= 84);
    const tones = midTones.length >= count ? midTones.slice(0, count) : chordTones.slice(0, count);

    // Pan toward scoring team
    if (detail?.team === 'home') this.setPan(-0.3);
    else if (detail?.team === 'away') this.setPan(0.3);

    tones.forEach((midi, i) => {
      const noteStart = now + 0.05 + i * 0.18;
      this._safeTrigger(this.arpeggioSynth, midiToNote(midi), '16n', noteStart);
    });

    // Reset pan after gesture
    setTimeout(() => this.setPan(0), 1000);
  }

  /** Descending fifth-to-root on low voice. */
  _playOutRecorded(harmony) {
    this._cancelPending();
    const now = Tone.now();
    const { chordTones } = harmony;

    // Find root and fifth in low range
    const lowTones = chordTones.filter(t => t >= 48 && t <= 60);
    if (lowTones.length >= 2) {
      this._safeTrigger(this.lowSynth, midiToNote(lowTones[1]), '8n', now + 0.01);
      this._safeTrigger(this.lowSynth, midiToNote(lowTones[0]), '4n', now + 0.22);
    } else if (lowTones.length === 1) {
      this._safeTrigger(this.lowSynth, midiToNote(lowTones[0]), '4n', now + 0.01);
    }
  }

  /** Sustained perfect fifth on new root. */
  _playInningChange(harmony) {
    this._cancelPending();
    const now = Tone.now();
    const { chordTones } = harmony;

    // Root and fifth (first two chord tones in low-mid range)
    const tones = chordTones.filter(t => t >= 55 && t <= 72);
    if (tones.length >= 2) {
      this._safeTrigger(this.bellSynth, midiToNote(tones[0]), '2n', now + 0.01);
      this._safeTrigger(this.bellSynth, midiToNote(tones[1]), '2n', now + 0.06);
    } else if (tones.length === 1) {
      this._safeTrigger(this.bellSynth, midiToNote(tones[0]), '2n', now + 0.01);
    }
  }

  /** High bell tone — upper scale tone. */
  _playStrike(harmony) {
    const { scaleTones } = harmony;
    const highTones = scaleTones.filter(t => t >= 67);
    const tone = highTones.length > 0
      ? highTones[Math.floor(Math.random() * highTones.length)]
      : scaleTones[scaleTones.length - 1];

    if (tone != null) {
      this._safeTrigger(this.bellSynth, midiToNote(tone), '16n', Tone.now() + 0.01);
    }
  }

  /** Low non-chord scale tone (2nd or 6th degree). */
  _playBall(harmony) {
    const { scaleTones, chordTones } = harmony;
    const chordSet = new Set(chordTones);
    const passingTones = scaleTones.filter(t => !chordSet.has(t) && t >= 48 && t <= 65);

    const tone = passingTones.length > 0
      ? passingTones[Math.floor(Math.random() * passingTones.length)]
      : scaleTones[0];

    if (tone != null) {
      this._safeTrigger(this.lowSynth, midiToNote(tone), '16n', Tone.now() + 0.01);
    }
  }

  /** Status change: fade in for Live, resolution for Final. */
  _playStatusChange(detail, harmony) {
    this._cancelPending();
    const now = Tone.now();

    if (detail?.to === 'Final') {
      const { chordTones } = harmony;
      const tones = chordTones.filter(t => t >= 55 && t <= 72).slice(0, 3).reverse();
      tones.forEach((midi, i) => {
        const duration = i === tones.length - 1 ? '2n' : '8n';
        this._safeTrigger(this.bellSynth, midiToNote(midi), duration, now + 0.05 + i * 0.3);
      });
    }
  }
}

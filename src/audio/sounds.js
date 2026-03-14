import * as Tone from 'tone';

/**
 * SoundBank: manages Tone.js synths and provides one method per game event type.
 * Synths are lazily created on first use to avoid unnecessary AudioContext allocation.
 * All synths route through the provided master Gain node.
 *
 * Uses PolySynth for the main synth to handle overlapping notes from
 * multiple events firing in the same dispatch cycle.
 */
export class SoundBank {
  constructor(masterGain) {
    this.master = masterGain;
    this._synth = null;
    this._membrane = null;
  }

  // Lazy synth accessors
  get synth() {
    if (!this._synth) {
      this._synth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 6,
        voice: Tone.Synth,
        options: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        },
      }).connect(this.master);
    }
    return this._synth;
  }

  get membrane() {
    if (!this._membrane) {
      this._membrane = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
      }).connect(this.master);
    }
    return this._membrane;
  }

  /** Rising arpeggio — pitch count varies by runs scored */
  playRunScored(detail) {
    const now = Tone.now();
    const notes = ['C5', 'E5', 'G5', 'C6'];
    const count = Math.min(detail.runs || 1, notes.length);
    for (let i = 0; i < count; i++) {
      this.synth.triggerAttackRelease(notes[i], '16n', now + i * 0.1);
    }
  }

  /** Short percussive hit */
  playOutRecorded() {
    this.membrane.triggerAttackRelease('C2', '8n');
  }

  /** Two-tone chime: ascending for top of inning, descending for bottom */
  playInningChange(detail) {
    const now = Tone.now();
    if (detail.isTop) {
      this.synth.triggerAttackRelease('E4', '16n', now);
      this.synth.triggerAttackRelease('A4', '16n', now + 0.15);
    } else {
      this.synth.triggerAttackRelease('A4', '16n', now);
      this.synth.triggerAttackRelease('E4', '16n', now + 0.15);
    }
  }

  /** Blip pitched by base position: 1st=low, 2nd=mid, 3rd=high */
  playRunnerAdvance(detail) {
    const pitchMap = { 1: 'G3', 2: 'D4', 3: 'A4' };
    const note = pitchMap[detail.base] || 'G3';
    this.synth.triggerAttackRelease(note, '32n');
  }

  /** Status change: warm swell for Live, descending resolution for Final */
  playStatusChange(detail) {
    const now = Tone.now();
    if (detail.to === 'Live') {
      this.synth.triggerAttackRelease('C4', '2n', now);
    } else if (detail.to === 'Final') {
      this.synth.triggerAttackRelease('E4', '8n', now);
      this.synth.triggerAttackRelease('C4', '8n', now + 0.2);
      this.synth.triggerAttackRelease('A3', '4n', now + 0.4);
    }
  }

  /** Short high tick */
  playStrike() {
    this.synth.triggerAttackRelease('E5', '32n');
  }

  /** Short low tick */
  playBall() {
    this.synth.triggerAttackRelease('G3', '32n');
  }

  dispose() {
    this._synth?.dispose();
    this._membrane?.dispose();
    this._synth = null;
    this._membrane = null;
  }
}

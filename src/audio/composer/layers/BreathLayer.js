/**
 * BreathLayer: filtered pink noise with slow amplitude LFO.
 * Creates a subtle "breathing" atmosphere.
 *
 * - Breathes more during silence (LFO depth increases)
 * - Recedes during active play (LFO depth decreases)
 * - Nearly subliminal (~3% volume)
 *
 * Implements Layer contract: update, suspend, resume, dispose.
 */
import * as Tone from 'tone';

const BASE_VOLUME = 0.03;
const LFO_MIN_FREQ = 0.08;  // ~12s period
const LFO_MAX_FREQ = 0.125; // ~8s period

export class BreathLayer {
  constructor(output) {
    this.output = output;
    this.suspended = false;

    // Pink noise source
    this.noise = new Tone.Noise('pink');
    this.noise.volume.value = -30; // very quiet

    // Auto filter with slow LFO for movement
    this.filter = new Tone.AutoFilter({
      frequency: LFO_MIN_FREQ,
      depth: 0.6,
      baseFrequency: 200,
      octaves: 2.5,
      type: 'sine',
    });

    // Volume envelope
    this.gain = new Tone.Gain(BASE_VOLUME);

    // Wire: noise → autoFilter → gain → output
    this.noise.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(output);

    // Start noise and filter LFO
    this.noise.start();
    this.filter.start();
  }

  /**
   * Update brightness — controls LFO depth and filter behavior.
   * Low brightness (quiet periods) = more breathing.
   * High brightness (active play) = less breathing, recedes.
   */
  update(harmonyState) {
    if (this.suspended || !this.filter) return;

    const brightness = harmonyState?.brightness ?? 0;

    // More breathing during silence, less during activity
    this.filter.depth.value = 0.3 + (1 - brightness) * 0.5;

    // Slightly faster breathing during silence
    this.filter.frequency.value = LFO_MIN_FREQ + (1 - brightness) * (LFO_MAX_FREQ - LFO_MIN_FREQ);

    // Fade down during high activity (other layers carry the sound)
    const targetGain = BASE_VOLUME * (1 - brightness * 0.6);
    this.gain.gain.rampTo(targetGain, 2);
  }

  suspend() {
    this.suspended = true;
    this.noise?.stop();
  }

  resume() {
    this.suspended = false;
    this.noise?.start();
  }

  dispose() {
    this.suspended = true;
    this.noise?.stop();
    this.noise?.dispose();
    this.filter?.dispose();
    this.gain?.dispose();
    this.noise = null;
    this.filter = null;
    this.gain = null;
  }
}

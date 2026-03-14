/**
 * PulseManager: manages 3 PulsePool instances, one per base.
 *
 * Each occupied base spawns a melodic loop with a prime-length pattern:
 * - 1st base: 5 steps
 * - 2nd base: 7 steps
 * - 3rd base: 11 steps
 *
 * The prime lengths create Reich-style phasing when multiple bases occupied.
 *
 * Implements Layer contract: update, suspend, resume, dispose.
 */
import { PulsePool } from './PulsePool';

const POOL_STEPS = [5, 7, 11]; // Prime lengths per base (1st, 2nd, 3rd)

export class PulseManager {
  /**
   * @param {Tone.InputNode} output - Destination node
   * @param {object} timbreColor - { harmonicity, modulationIndex } from team palette
   */
  constructor(output, timbreColor = {}) {
    this.output = output;
    this.timbreColor = timbreColor;
    this.pools = [null, null, null]; // index 0=1st base, 1=2nd, 2=3rd
    this.disposed = false;
    this.currentPan = 0;
  }

  /**
   * Update pools based on runner state and current harmony.
   * @param {boolean[]} runners - [1st, 2nd, 3rd] base occupancy
   * @param {Object} harmonyState - Current HarmonyState
   */
  update(runners, harmonyState) {
    if (this.disposed) return;
    if (!runners) return;

    const { scaleTones } = harmonyState || {};

    for (let i = 0; i < 3; i++) {
      const occupied = runners[i];
      const pool = this.pools[i];

      if (occupied && !pool) {
        // Base just became occupied — create and start pool
        this.pools[i] = new PulsePool(
          this.output,
          POOL_STEPS[i],
          this.timbreColor,
          this.currentPan,
        );
        this.pools[i].start(scaleTones);
      } else if (occupied && pool) {
        // Base still occupied — update notes for new harmony
        pool.updateNotes(scaleTones);
      } else if (!occupied && pool) {
        // Base just emptied — stop and clean up pool
        pool.stop(3);
        // After fade-out, dispose
        setTimeout(() => {
          if (this.pools[i] === pool) {
            pool.dispose();
            this.pools[i] = null;
          }
        }, 4000);
      }
    }
  }

  /** Stop all pools immediately. */
  stopAll() {
    for (let i = 0; i < 3; i++) {
      if (this.pools[i]) {
        this.pools[i].stop(1);
        const pool = this.pools[i];
        setTimeout(() => pool.dispose(), 2000);
        this.pools[i] = null;
      }
    }
  }

  /** Set pan position for all pools (batting team side). */
  setPan(value) {
    this.currentPan = value;
    for (const pool of this.pools) {
      if (pool) pool.setPan(value);
    }
  }

  suspend() {
    for (const pool of this.pools) {
      pool?.suspend();
    }
  }

  resume() {
    for (const pool of this.pools) {
      pool?.resume();
    }
  }

  dispose() {
    this.disposed = true;
    for (let i = 0; i < 3; i++) {
      this.pools[i]?.dispose();
      this.pools[i] = null;
    }
  }
}

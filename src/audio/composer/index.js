/**
 * Composer: orchestrates all audio layers for the generative music engine.
 *
 * Receives game state + events from engine.js, computes harmony,
 * and routes updates to the appropriate layers.
 *
 * @typedef {Object} Layer
 * @property {function(HarmonyState): void} update - React to new harmony
 * @property {function(): void} suspend - Stop scheduling, release notes (CPU-safe pause)
 * @property {function(): void} resume - Restart from current state
 * @property {function(): void} dispose - Cleanup all Tone.js nodes
 *
 * Optional layer methods:
 * @property {function(HarmonyState, number): void} crossfadeTo - PadLayer only
 * @property {function(GameEvent, HarmonyState): void} handleEvent - EventVoice only
 */

import * as Tone from 'tone';
import { EffectsChain } from './effects';
import { PadLayer } from './layers/PadLayer';
import { BreathLayer } from './layers/BreathLayer';
import { EventVoice } from './layers/EventVoice';
import { PulseManager } from './layers/PulseManager';
import { deriveHarmony } from '../music/harmonyEngine';
import { calculateBrightness } from '../music/tension';
import { teamPalette } from '../music/teamPalette';

const BRIGHTNESS_WINDOW_MS = 30000;

export class Composer {
  constructor(masterGain) {
    this.disposed = false;
    this.suspended = false;
    this.currentHarmony = null;
    this.prevTeamKey = null; // "homeId:awayId" for detecting game switches
    this.crossfadeInProgress = false;

    // Brightness tracking: ring buffer of event timestamps
    this.eventTimestamps = [];

    // Start Transport — required for Tone.Loop in PulsePool.
    // We don't use Transport for BPM or position, just as the clock source.
    Tone.getTransport().start();

    // Effects chain
    this.effects = new EffectsChain(masterGain);

    // Layers — all route through effects bus
    this.padLayer = new PadLayer(this.effects.bus, 0);
    this.breathLayer = new BreathLayer(this.effects.bus);
    this.eventVoice = new EventVoice(this.effects.bus, this.effects.delaySend);
    this.pulseManager = new PulseManager(this.effects.bus);
  }

  /**
   * Main update: called by engine.js on every game state change.
   * @param {Object} game - Normalized game object (or null)
   * @param {GameEvent[]} events - Events from diffGameEvents
   */
  update(game, events) {
    if (this.disposed) return;

    // Track brightness
    if (events && events.length > 0) {
      const now = Date.now();
      for (let i = 0; i < events.length; i++) {
        this.eventTimestamps.push(now);
      }
      // Trim old timestamps
      const cutoff = now - BRIGHTNESS_WINDOW_MS;
      this.eventTimestamps = this.eventTimestamps.filter(t => t >= cutoff);
    }

    // Compute palette and detect game switch
    const homeId = game?.homeTeam?.id ?? null;
    const awayId = game?.awayTeam?.id ?? null;
    const teamKey = `${homeId}:${awayId}`;
    const palette = teamPalette(homeId, awayId);

    // Game switch detection
    const isGameSwitch = this.prevTeamKey !== null && this.prevTeamKey !== teamKey;
    this.prevTeamKey = teamKey;

    // Compute harmony
    const brightness = calculateBrightness(this.eventTimestamps, Date.now());
    const harmony = deriveHarmony(game, palette, brightness);
    this.currentHarmony = harmony;

    if (isGameSwitch) {
      this._handleGameSwitch(harmony, game, palette);
    } else {
      this._updateLayers(harmony, game);
    }

    // Route events to EventVoice
    if (events && events.length > 0) {
      // Set event panning based on which team is batting
      const battingPan = game?.isTopInning ? 0.3 : -0.3; // away=right, home=left
      this.eventVoice.setPan(battingPan);

      for (const event of events) {
        this.eventVoice.handleEvent(event, harmony);
      }

      // Handle statusChange→Live: fade in all layers
      const liveEvent = events.find(e => e.type === 'statusChange' && e.detail?.to === 'Live');
      if (liveEvent) {
        this._fadeInAllLayers();
      }
    }
  }

  /** Suspend all layers (CPU-safe pause). */
  suspend() {
    this.suspended = true;
    Tone.getTransport().pause();
    this.padLayer?.suspend();
    this.breathLayer?.suspend();
    this.eventVoice?.suspend();
    this.pulseManager?.suspend();
  }

  /** Resume all layers from current state. */
  resume() {
    this.suspended = false;
    Tone.getTransport().start();
    this.padLayer?.resume();
    this.breathLayer?.resume();
    this.eventVoice?.resume();
    this.pulseManager?.resume();
  }

  /** Dispose all layers and effects. */
  dispose() {
    this.disposed = true;
    Tone.getTransport().stop();
    this.padLayer?.dispose();
    this.breathLayer?.dispose();
    this.eventVoice?.dispose();
    this.pulseManager?.dispose();
    this.effects?.dispose();
    this.padLayer = null;
    this.breathLayer = null;
    this.eventVoice = null;
    this.pulseManager = null;
    this.effects = null;
  }

  // --- Private ---

  _updateLayers(harmony, game) {
    this.padLayer?.update(harmony);
    this.breathLayer?.update(harmony);
    // EventVoice.update() is a no-op — events route through handleEvent

    // Update pulse pools: pan toward batting team
    if (game) {
      const battingPan = game.isTopInning ? 0.3 : -0.3;
      this.pulseManager?.setPan(battingPan);
      this.pulseManager?.update(game.runners, harmony);
    }

    // Pad pans toward home team
    this.padLayer?.setPan(-0.15);
  }

  _handleGameSwitch(harmony, game, palette) {
    // Cancel any in-progress crossfade
    this.crossfadeInProgress = false;

    // Stop all pulse pools (they'll restart from new runner state)
    this.pulseManager?.stopAll();

    // Update pulse timbre for new away team
    // (PulseManager will create new pools with new timbre on next update with runners)
    this.pulseManager?.dispose();
    this.pulseManager = new PulseManager(this.effects.bus, palette.pulseColor);

    // Crossfade pad to new harmony
    this.crossfadeInProgress = true;
    this.padLayer?.crossfadeTo(harmony, 3);
    setTimeout(() => {
      this.crossfadeInProgress = false;
      // Update other layers with new harmony
      this.breathLayer?.update(harmony);
      if (game) {
        this.pulseManager?.update(game.runners, harmony);
      }
    }, 3500);
  }

  _fadeInAllLayers() {
    // Layers will fade in naturally through their update() calls
    // This is a placeholder for any special fade-in orchestration
  }
}

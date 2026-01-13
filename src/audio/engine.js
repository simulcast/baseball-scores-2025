// src/audio/engine.js

import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';
import { interpret } from './interpreter.js';
import { combineDensityCurves, shouldFireAmbientEvent } from './euclidean.js';
import { resetVoiceManager } from './voices.js';
import {
  renderDrone,
  renderStereoPad,
  renderStereoBells,
  renderStereoAir,
  renderStereoShimmer,
  renderStereoGhostMelody
} from './layers/index.js';
import { stereoReverb, softClip, limiter } from './effects/index.js';
import { TIMING, REVERB } from './constants.js';

/**
 * Main Audio Engine
 */
export class AudioEngine {
  constructor() {
    this.renderer = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.isPlaying = false;

    this.currentParams = null;
    this.prevGameState = null;
    this.voiceManager = null;

    this.unsubscribe = null;
    this.renderLoopId = null;
    this.startTime = 0;

    this.euclideanDensity = combineDensityCurves();
    this.masterVolume = 0.7;
  }

  /**
   * Initialize audio context and renderer
   */
  async initialize() {
    if (this.isInitialized) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.renderer = new WebRenderer();

    const node = await this.renderer.initialize(this.audioContext, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });

    node.connect(this.audioContext.destination);

    this.voiceManager = resetVoiceManager();
    this.startTime = Date.now();
    this.isInitialized = true;

    console.log('[AudioEngine] Initialized');
  }

  /**
   * Subscribe to game store
   */
  subscribeToStore(store) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = store.subscribe(
      (state) => state.games.get(state.activeGameId),
      (gameState, prevGameState) => this.onGameStateChange(gameState, prevGameState)
    );
  }

  /**
   * Handle game state changes
   */
  onGameStateChange(gameState, prevGameState) {
    this.prevGameState = prevGameState;
    this.currentParams = interpret(gameState, prevGameState, this.currentParams);

    // Update voice manager with new params
    if (this.currentParams) {
      this.voiceManager.setDroneFrequency(this.currentParams.drone.frequency);
      this.voiceManager.setPadVoicing(this.currentParams.pad.frequencies);
    }
  }

  /**
   * Start audio playback
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    this.startRenderLoop();

    console.log('[AudioEngine] Started');
  }

  /**
   * Stop audio playback
   */
  stop() {
    this.isPlaying = false;
    this.stopRenderLoop();

    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }

    console.log('[AudioEngine] Stopped');
  }

  /**
   * Start the render loop for ambient events
   */
  startRenderLoop() {
    if (this.renderLoopId) return;

    const loop = () => {
      if (!this.isPlaying) return;

      this.checkAmbientEvents();
      this.render();

      this.renderLoopId = setTimeout(loop, TIMING.renderInterval);
    };

    loop();
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop() {
    if (this.renderLoopId) {
      clearTimeout(this.renderLoopId);
      this.renderLoopId = null;
    }
  }

  /**
   * Check and trigger ambient events based on Euclidean probability
   */
  checkAmbientEvents() {
    if (!this.currentParams) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const density = this.euclideanDensity(elapsed);

    // Check bells
    if (shouldFireAmbientEvent(
      this.currentParams.bells.densityProbability,
      density,
      this.currentParams.timeSinceLastChange,
      this.currentParams.isBreathing ? 'Mid' : 'Top'
    )) {
      this.triggerRandomBell();
    }

    // Check ghost melody
    if (shouldFireAmbientEvent(
      this.currentParams.ghostMelody.noteProbability,
      density,
      this.currentParams.timeSinceLastChange,
      this.currentParams.isBreathing ? 'Mid' : 'Top'
    )) {
      this.triggerGhostMelodyNote();
    }

    // Cleanup decayed voices
    this.voiceManager.cleanupDecayedVoices();
  }

  /**
   * Trigger a random bell from the current scale
   */
  triggerRandomBell() {
    const scale = this.currentParams?.bells.scale || [];
    if (scale.length === 0) return;

    const register = this.currentParams.bells.register;
    let filteredScale = scale;

    if (register === 'high') {
      filteredScale = scale.filter(n => parseInt(n.slice(-1)) >= 4);
    } else if (register === 'low') {
      filteredScale = scale.filter(n => parseInt(n.slice(-1)) <= 3);
    }

    if (filteredScale.length === 0) filteredScale = scale;

    const note = filteredScale[Math.floor(Math.random() * filteredScale.length)];
    this.voiceManager.triggerBell(note, 0.3 + Math.random() * 0.3);
  }

  /**
   * Trigger a ghost melody note
   */
  triggerGhostMelodyNote() {
    const scale = this.currentParams?.ghostMelody.scale || [];
    if (scale.length === 0) return;

    const position = this.currentParams.ghostMelody.scalePosition;
    const note = scale[position % scale.length];

    this.voiceManager.triggerGhostMelody(note, 0.4);

    // Auto-release after a few seconds
    setTimeout(() => this.voiceManager.releaseGhostMelody(), 2000);
  }

  /**
   * Render the audio graph
   */
  render() {
    if (!this.isInitialized || !this.renderer || !this.currentParams) return;

    const params = this.currentParams;
    const voiceState = this.voiceManager.getVoiceState();

    // Render layers
    const drone = renderDrone(params.drone, 'drone');
    const { left: padL, right: padR } = renderStereoPad(params.pad, 'pad');
    const { left: bellsL, right: bellsR } = renderStereoBells(params.bells, voiceState.bells, 'bells');
    const { left: airL, right: airR } = renderStereoAir(params.air, 'air');
    const { left: shimmerL, right: shimmerR } = renderStereoShimmer(params.shimmer, padL, padR, 0, 'shimmer');
    const { left: ghostL, right: ghostR } = renderStereoGhostMelody(params.ghostMelody, voiceState.ghostMelody, 'ghost');

    // Sum all layers
    const sumL = el.add(drone, padL, bellsL, airL, shimmerL, ghostL);
    const sumR = el.add(drone, padR, bellsR, airR, shimmerR, ghostR);

    // Master effects
    const reverbDecay = params.master.reverbDecay;
    const { left: reverbL, right: reverbR } = stereoReverb(
      reverbDecay / 10, // normalize to 0-1 range
      REVERB.mix,
      REVERB.damping,
      sumL,
      sumR,
      'master-reverb'
    );

    // Soft saturation
    const satL = softClip(params.master.saturation, reverbL, 'master-sat-L');
    const satR = softClip(params.master.saturation, reverbR, 'master-sat-R');

    // Final limiter
    const limitedL = limiter(-1, satL, 'master-lim-L');
    const limitedR = limiter(-1, satR, 'master-lim-R');

    // Master volume
    const outL = el.mul(el.const({ key: 'master-vol-L', value: this.masterVolume }), limitedL);
    const outR = el.mul(el.const({ key: 'master-vol-R', value: this.masterVolume }), limitedR);

    // Render to Elementary
    this.renderer.render(outL, outR);
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Cleanup
   */
  disconnect() {
    this.stop();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.renderer = null;
    this.isInitialized = false;

    console.log('[AudioEngine] Disconnected');
  }
}

// Singleton
let engineInstance = null;

export function getEngine() {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}

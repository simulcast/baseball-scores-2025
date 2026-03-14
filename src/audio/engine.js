import * as Tone from 'tone';
import { diffGameEvents } from './diffGameEvents';
import { SoundBank } from './sounds';

let instance = null;

export class AudioEngine {
  constructor() {
    if (instance) return instance;
    instance = this;

    this.masterGain = null;
    this.soundBank = null;
    this.unsub = null;
    this.connected = false;
    this.prevGame = null;
    this._volume = 1;
    this._paused = false;
  }

  async connect(store) {
    if (this.connected) return;

    try {
      await Tone.start();

      this.masterGain = new Tone.Gain(this._volume).toDestination();
      this.soundBank = new SoundBank(this.masterGain);
      this.connected = true;

      // Snapshot initial active game
      const state = store.getState();
      this.prevGame = state.activeGameId
        ? state.games[state.activeGameId] ?? null
        : null;

      // Subscribe to store — diff active game object on every change
      this.unsub = store.subscribe((state) => {
        const nextGame = state.activeGameId
          ? state.games[state.activeGameId] ?? null
          : null;

        if (nextGame !== this.prevGame) {
          const events = diffGameEvents(this.prevGame, nextGame);
          this._handleEvents(events);
          this.prevGame = nextGame;
        }
      });
    } catch (err) {
      // Cleanup AudioContext if Tone.start() succeeded but something else failed
      try {
        Tone.getContext().rawContext.close();
      } catch (_) { /* already closed or never opened */ }
      this.connected = false;
      this.masterGain = null;
      this.soundBank = null;
      instance = null;
      throw err;
    }
  }

  _handleEvents(events) {
    if (this._paused) return;

    for (const event of events) {
      switch (event.type) {
        case 'runScored': this.soundBank.playRunScored(event.detail); break;
        case 'outRecorded': this.soundBank.playOutRecorded(event.detail); break;
        case 'inningChange': this.soundBank.playInningChange(event.detail); break;
        case 'runnerAdvance': this.soundBank.playRunnerAdvance(event.detail); break;
        case 'statusChange': this.soundBank.playStatusChange(event.detail); break;
        case 'strike': this.soundBank.playStrike(event.detail); break;
        case 'ball': this.soundBank.playBall(event.detail); break;
        // gameSelected is intentionally silent — no sound on initial selection
      }
    }
  }

  disconnect() {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    this.soundBank?.dispose();
    this.soundBank = null;
    this.masterGain?.dispose();
    this.masterGain = null;
    this.connected = false;
    this.prevGame = null;
    this._paused = false;
    instance = null;
  }

  pause() {
    if (this.masterGain && !this._paused) {
      this._paused = true;
      this.masterGain.gain.value = 0;
    }
  }

  resume() {
    if (this.masterGain && this._paused) {
      this._paused = false;
      this.masterGain.gain.value = this._volume;
    }
  }

  setMasterVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && !this._paused) {
      this.masterGain.gain.value = this._volume;
    }
  }

  isConnected() {
    return this.connected;
  }
}

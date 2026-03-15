import * as Tone from 'tone';
import { diffGameEvents } from './diffGameEvents';
import { Composer } from './composer';
import { startKeepAlive, stopKeepAlive, updateMediaSession, ensureKeepAlive } from './keepAlive';

let instance = null;

export class AudioEngine {
  constructor() {
    if (instance) return instance;
    instance = this;

    this.masterGain = null;
    this.composer = null;
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
      this.composer = new Composer(this.masterGain);
      this.connected = true;

      // Best-effort: silent audio keep-alive + Media Session + Wake Lock
      try {
        await startKeepAlive({
          onPlay: () => this.resume(),
          onPause: () => this.pause(),
        });
      } catch (_) { /* keep-alive is optional */ }

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
          this.composer.update(nextGame, events);
          this.prevGame = nextGame;

          // Update lock screen metadata with current matchup
          if (nextGame) {
            updateMediaSession({
              title: `${nextGame.awayTeam.abbreviation} @ ${nextGame.homeTeam.abbreviation}`,
              artist: 'Baseball Scores',
            });
          }
        }
      });
    } catch (err) {
      // Cleanup AudioContext if Tone.start() succeeded but something else failed
      try {
        Tone.getContext().rawContext.close();
      } catch (_) { /* already closed or never opened */ }
      this.connected = false;
      this.masterGain = null;
      this.composer = null;
      instance = null;
      throw err;
    }
  }

  disconnect() {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    this.composer?.dispose();
    this.composer = null;
    this.masterGain?.dispose();
    this.masterGain = null;
    this.connected = false;
    this.prevGame = null;
    this._paused = false;
    instance = null;
    stopKeepAlive();
  }

  pause() {
    if (this.masterGain && !this._paused) {
      this._paused = true;
      this.masterGain.gain.value = 0;
      this.composer?.suspend();
      updateMediaSession({ isPlaying: false });
    }
  }

  resume() {
    if (this.masterGain && this._paused) {
      this._paused = false;
      this.masterGain.gain.value = this._volume;
      this.composer?.resume();
      updateMediaSession({ isPlaying: true });
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

  async ensureRunning() {
    if (!this.connected) return;
    const ctx = Tone.getContext().rawContext;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    await ensureKeepAlive();
  }
}

import WebRenderer from '@elemaudio/web-renderer';
import { el } from '@elemaudio/core';

let instance = null;

export class AudioEngine {
  constructor() {
    if (instance) return instance;
    instance = this;

    this.ctx = null;
    this.core = null;
    this.ready = false;
    this.unsub = null;
    this.volume = 1;
    this.playing = false;
  }

  async connect(store) {
    if (this.ctx) return;

    this.ctx = new AudioContext();
    this.core = new WebRenderer();

    const node = await this.core.initialize(this.ctx, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    node.connect(this.ctx.destination);
    this.ready = true;

    // Subscribe to store — re-render when activeGameId changes
    let prevActiveGameId = store.getState().activeGameId;
    this._render(prevActiveGameId);

    this.unsub = store.subscribe((state) => {
      if (state.activeGameId !== prevActiveGameId) {
        prevActiveGameId = state.activeGameId;
        this._render(state.activeGameId);
      }
    });
  }

  _render(activeGameId) {
    if (!this.ready) return;

    if (activeGameId && this.ctx.state === 'running') {
      const tone = el.mul(
        el.const({ key: 'vol', value: this.volume }),
        el.cycle({ key: 'sine', frequency: 440 }),
      );
      this.core.render(tone, tone);
      this.playing = true;
    } else {
      const silence = el.const({ key: 'silence', value: 0 });
      this.core.render(silence, silence);
      this.playing = false;
    }
  }

  disconnect() {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.core = null;
    this.ready = false;
    this.playing = false;
    instance = null;
  }

  pause() {
    if (this.ctx) this.ctx.suspend();
  }

  resume() {
    if (this.ctx) this.ctx.resume();
  }

  setMasterVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ready && this.playing) {
      const tone = el.mul(
        el.const({ key: 'vol', value: this.volume }),
        el.cycle({ key: 'sine', frequency: 440 }),
      );
      this.core.render(tone, tone);
    }
  }

  isConnected() {
    return this.ready && this.ctx?.state === 'running';
  }
}

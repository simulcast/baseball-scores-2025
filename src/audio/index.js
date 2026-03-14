import { AudioEngine } from './engine';

let engine = null;

export function connect(store) {
  if (!engine) engine = new AudioEngine();
  return engine.connect(store);
}

export function disconnect() {
  if (engine) {
    engine.disconnect();
    engine = null;
  }
}

export function pause() {
  engine?.pause();
}

export function resume() {
  engine?.resume();
}

export function setMasterVolume(v) {
  engine?.setMasterVolume(v);
}

export function isConnected() {
  return engine?.isConnected() ?? false;
}

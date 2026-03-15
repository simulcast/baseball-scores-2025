/**
 * Keep-alive module for mobile background audio.
 *
 * Three mechanisms work together:
 * 1. Silent <audio> loop — browsers treat pages with playing <audio> as
 *    "media pages" and are less aggressive about suspending AudioContext
 * 2. Media Session API — lock screen controls (play/pause) and metadata
 * 3. Wake Lock API — prevents screen dimming while audio plays
 *
 * All functions are best-effort — failures are silent.
 * Tone.js audio works without this module.
 */

let audioEl = null;
let wakeLock = null;
let visibilityHandler = null;

/**
 * Generate a minimal silent WAV as a Blob URL.
 * 44-byte header + 1 second of silence (44100 samples, mono, 16-bit, 44100 Hz).
 */
function createSilentWavUrl() {
  const sampleRate = 44100;
  const numSamples = sampleRate; // 1 second of silence
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);       // chunk size
  view.setUint16(20, 1, true);        // PCM format
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);        // block align
  view.setUint16(34, 16, true);       // bits per sample

  // data chunk (all zeros = silence)
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  // Samples are already 0 (silence) from ArrayBuffer initialization

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Request a screen wake lock (best-effort).
 * Returns the WakeLockSentinel or null.
 */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      return await navigator.wakeLock.request('screen');
    }
  } catch (_) { /* user denied or not supported */ }
  return null;
}

/**
 * Start the keep-alive system: silent audio loop, Media Session, Wake Lock.
 * Must be called within a user gesture context for autoplay to succeed.
 *
 * @param {{ onPlay: Function, onPause: Function }} callbacks
 */
export async function startKeepAlive(callbacks = {}) {
  // Silent audio loop
  try {
    if (!audioEl) {
      const url = createSilentWavUrl();
      audioEl = document.createElement('audio');
      audioEl.src = url;
      audioEl.loop = true;
      await audioEl.play();
    }
  } catch (_) { /* autoplay blocked — keep-alive won't work but audio still plays */ }

  // Media Session
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Baseball Scores',
        artist: 'Ambient Soundtrack',
      });
      navigator.mediaSession.playbackState = 'playing';

      if (callbacks.onPlay) {
        navigator.mediaSession.setActionHandler('play', callbacks.onPlay);
      }
      if (callbacks.onPause) {
        navigator.mediaSession.setActionHandler('pause', callbacks.onPause);
      }
    }
  } catch (_) { /* Media Session not supported */ }

  // Wake Lock
  wakeLock = await requestWakeLock();

  // Re-acquire wake lock when returning from background (browsers release it)
  if (!visibilityHandler) {
    visibilityHandler = async () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        wakeLock = await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }
}

/**
 * Stop everything: pause and remove <audio>, clear Media Session, release Wake Lock.
 */
export function stopKeepAlive() {
  // Audio element
  if (audioEl) {
    audioEl.pause();
    if (audioEl.src) {
      URL.revokeObjectURL(audioEl.src);
    }
    audioEl.remove();
    audioEl = null;
  }

  // Media Session
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    }
  } catch (_) { /* ignore */ }

  // Wake Lock
  if (wakeLock) {
    try { wakeLock.release(); } catch (_) { /* already released */ }
    wakeLock = null;
  }

  // Visibility handler
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

/**
 * Update Media Session metadata and/or playback state.
 *
 * @param {{ title?: string, artist?: string, isPlaying?: boolean }} opts
 */
export function updateMediaSession(opts = {}) {
  try {
    if (!('mediaSession' in navigator)) return;

    if (opts.title || opts.artist) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: opts.title ?? 'Baseball Scores',
        artist: opts.artist ?? 'Ambient Soundtrack',
      });
    }

    if (opts.isPlaying !== undefined) {
      navigator.mediaSession.playbackState = opts.isPlaying ? 'playing' : 'paused';
    }
  } catch (_) { /* ignore */ }
}

/**
 * Ensure the keep-alive <audio> is still playing and wake lock is held.
 * Called from ensureRunning() when returning from background.
 */
export async function ensureKeepAlive() {
  // Re-play audio if browser paused it
  try {
    if (audioEl && audioEl.paused) {
      await audioEl.play();
    }
  } catch (_) { /* autoplay blocked */ }

  // Re-acquire wake lock if lost
  if (!wakeLock) {
    wakeLock = await requestWakeLock();
  }
}

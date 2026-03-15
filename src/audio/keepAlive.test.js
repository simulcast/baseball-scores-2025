/**
 * @jest-environment jsdom
 */

// Reset module state between tests
let keepAlive;

beforeEach(async () => {
  jest.resetModules();

  // Mock Audio element
  const mockPlay = jest.fn().mockResolvedValue(undefined);
  const mockPause = jest.fn();
  const mockRemove = jest.fn();

  jest.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'audio') {
      return {
        play: mockPlay,
        pause: mockPause,
        remove: mockRemove,
        paused: false,
        loop: false,
        src: '',
      };
    }
    return document._createElement(tag);
  });

  // Mock URL.createObjectURL / revokeObjectURL
  global.URL.createObjectURL = jest.fn(() => 'blob:silent-wav');
  global.URL.revokeObjectURL = jest.fn();

  // Mock MediaMetadata
  global.MediaMetadata = jest.fn().mockImplementation((opts) => opts);

  keepAlive = await import('./keepAlive');
});

afterEach(() => {
  keepAlive.stopKeepAlive();
  jest.restoreAllMocks();
  delete navigator.mediaSession;
  delete navigator.wakeLock;
});

// Helper to set up mediaSession mock
function setupMediaSession() {
  const handlers = {};
  Object.defineProperty(navigator, 'mediaSession', {
    value: {
      metadata: null,
      playbackState: 'none',
      setActionHandler: jest.fn((action, handler) => {
        handlers[action] = handler;
      }),
    },
    writable: true,
    configurable: true,
  });
  return handlers;
}

// Helper to set up wakeLock mock
function setupWakeLock() {
  const sentinel = { release: jest.fn() };
  Object.defineProperty(navigator, 'wakeLock', {
    value: { request: jest.fn().mockResolvedValue(sentinel) },
    writable: true,
    configurable: true,
  });
  return sentinel;
}

describe('keepAlive', () => {
  // --- startKeepAlive ---

  test('creates audio element and calls play()', async () => {
    await keepAlive.startKeepAlive();

    expect(document.createElement).toHaveBeenCalledWith('audio');
    const audioEl = document.createElement.mock.results.find(
      r => r.type === 'return' && r.value.loop !== undefined
    ).value;
    expect(audioEl.loop).toBe(true);
    expect(audioEl.src).toBe('blob:silent-wav');
    expect(audioEl.play).toHaveBeenCalled();
  });

  test('is idempotent — second call does not create another audio element', async () => {
    await keepAlive.startKeepAlive();
    const createCount = document.createElement.mock.calls.filter(c => c[0] === 'audio').length;

    await keepAlive.startKeepAlive();
    const createCount2 = document.createElement.mock.calls.filter(c => c[0] === 'audio').length;

    expect(createCount2).toBe(createCount);
  });

  test('registers Media Session metadata and handlers', async () => {
    const handlers = setupMediaSession();
    const onPlay = jest.fn();
    const onPause = jest.fn();

    await keepAlive.startKeepAlive({ onPlay, onPause });

    expect(navigator.mediaSession.metadata).toEqual({
      title: 'Baseball Scores',
      artist: 'Ambient Soundtrack',
    });
    expect(navigator.mediaSession.playbackState).toBe('playing');
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', onPlay);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', onPause);
  });

  test('Media Session play handler calls onPlay callback', async () => {
    const handlers = setupMediaSession();
    const onPlay = jest.fn();

    await keepAlive.startKeepAlive({ onPlay, onPause: jest.fn() });
    handlers.play();

    expect(onPlay).toHaveBeenCalled();
  });

  test('Media Session pause handler calls onPause callback', async () => {
    const handlers = setupMediaSession();
    const onPause = jest.fn();

    await keepAlive.startKeepAlive({ onPlay: jest.fn(), onPause });
    handlers.pause();

    expect(onPause).toHaveBeenCalled();
  });

  test('requests wake lock when API is available', async () => {
    const sentinel = setupWakeLock();

    await keepAlive.startKeepAlive();

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  });

  test('works without mediaSession API', async () => {
    // navigator.mediaSession is undefined by default in jsdom
    await expect(keepAlive.startKeepAlive()).resolves.not.toThrow();
  });

  test('works without wakeLock API', async () => {
    // navigator.wakeLock is undefined by default in jsdom
    await expect(keepAlive.startKeepAlive()).resolves.not.toThrow();
  });

  // --- stopKeepAlive ---

  test('pauses and removes audio element', async () => {
    await keepAlive.startKeepAlive();

    const audioEl = document.createElement.mock.results.find(
      r => r.type === 'return' && r.value.loop !== undefined
    ).value;

    keepAlive.stopKeepAlive();

    expect(audioEl.pause).toHaveBeenCalled();
    expect(audioEl.remove).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:silent-wav');
  });

  test('clears Media Session on stop', async () => {
    setupMediaSession();
    await keepAlive.startKeepAlive({ onPlay: jest.fn(), onPause: jest.fn() });

    keepAlive.stopKeepAlive();

    expect(navigator.mediaSession.metadata).toBeNull();
    expect(navigator.mediaSession.playbackState).toBe('none');
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', null);
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('pause', null);
  });

  test('releases wake lock on stop', async () => {
    const sentinel = setupWakeLock();
    await keepAlive.startKeepAlive();

    keepAlive.stopKeepAlive();

    expect(sentinel.release).toHaveBeenCalled();
  });

  test('stopKeepAlive is safe to call without start', () => {
    expect(() => keepAlive.stopKeepAlive()).not.toThrow();
  });

  // --- updateMediaSession ---

  test('updates title and artist', async () => {
    setupMediaSession();
    await keepAlive.startKeepAlive();

    keepAlive.updateMediaSession({ title: 'NYY @ BOS', artist: 'Baseball Scores' });

    expect(navigator.mediaSession.metadata).toEqual({
      title: 'NYY @ BOS',
      artist: 'Baseball Scores',
    });
  });

  test('updates playback state', async () => {
    setupMediaSession();
    await keepAlive.startKeepAlive();

    keepAlive.updateMediaSession({ isPlaying: false });
    expect(navigator.mediaSession.playbackState).toBe('paused');

    keepAlive.updateMediaSession({ isPlaying: true });
    expect(navigator.mediaSession.playbackState).toBe('playing');
  });

  test('updateMediaSession is safe without mediaSession API', () => {
    expect(() => keepAlive.updateMediaSession({ title: 'test' })).not.toThrow();
  });

  // --- ensureKeepAlive ---

  test('re-plays audio if browser paused it', async () => {
    await keepAlive.startKeepAlive();

    const audioEl = document.createElement.mock.results.find(
      r => r.type === 'return' && r.value.loop !== undefined
    ).value;

    // Simulate browser pausing the audio
    audioEl.paused = true;
    audioEl.play.mockClear();

    await keepAlive.ensureKeepAlive();

    expect(audioEl.play).toHaveBeenCalled();
  });

  test('re-acquires wake lock if lost', async () => {
    const sentinel = setupWakeLock();
    await keepAlive.startKeepAlive();

    // Simulate wake lock being released by browser
    keepAlive.stopKeepAlive();
    await keepAlive.startKeepAlive(); // restart without wake lock setup
    navigator.wakeLock.request.mockClear();

    // Force internal wakeLock to null by stopping and restarting without wakeLock API
    keepAlive.stopKeepAlive();
    delete navigator.wakeLock;
    await keepAlive.startKeepAlive();

    // Now add wakeLock back and ensure it re-acquires
    setupWakeLock();
    await keepAlive.ensureKeepAlive();

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  });

  test('ensureKeepAlive is safe without prior start', async () => {
    await expect(keepAlive.ensureKeepAlive()).resolves.not.toThrow();
  });
});

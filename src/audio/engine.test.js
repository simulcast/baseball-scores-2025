import { AudioEngine } from './engine';

// Mock Tone.js
jest.mock('tone', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  Gain: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    gain: { value: 1 },
    dispose: jest.fn(),
  })),
  getContext: jest.fn(() => ({
    rawContext: { close: jest.fn() },
  })),
  now: jest.fn(() => 0),
}));

// Mock SoundBank
jest.mock('./sounds', () => ({
  SoundBank: jest.fn().mockImplementation(() => ({
    playRunScored: jest.fn(),
    playOutRecorded: jest.fn(),
    playInningChange: jest.fn(),
    playRunnerAdvance: jest.fn(),
    playStatusChange: jest.fn(),
    playStrike: jest.fn(),
    playBall: jest.fn(),
    dispose: jest.fn(),
  })),
}));

const Tone = require('tone');
const { SoundBank } = require('./sounds');

/** Create a minimal Zustand-like store */
function createMockStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setState: (partial) => {
      state = { ...state, ...partial };
      listeners.forEach((fn) => fn(state));
    },
  };
}

function makeGame(overrides = {}) {
  return {
    gameId: '1', status: 'Live', homeScore: 0, awayScore: 0,
    inning: 1, isTopInning: true, balls: 0, strikes: 0, outs: 0,
    runners: [false, false, false], ...overrides,
  };
}

describe('AudioEngine', () => {
  let engine;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    engine = new AudioEngine();
    engine.disconnect();
    engine = new AudioEngine();
  });

  afterEach(() => {
    engine.disconnect();
  });

  // --- Connect lifecycle ---

  test('connect initializes Tone.js and subscribes to store', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    expect(Tone.start).toHaveBeenCalled();
    expect(Tone.Gain).toHaveBeenCalled();
    expect(SoundBank).toHaveBeenCalled();
    expect(engine.isConnected()).toBe(true);
  });

  test('connect is idempotent', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);
    await engine.connect(store);

    expect(Tone.start).toHaveBeenCalledTimes(1);
  });

  test('connect cleans up AudioContext on failure', async () => {
    const mockClose = jest.fn();
    Tone.getContext.mockReturnValue({ rawContext: { close: mockClose } });
    SoundBank.mockImplementationOnce(() => { throw new Error('SoundBank failed'); });

    const store = createMockStore({ activeGameId: null, games: {} });
    await expect(engine.connect(store)).rejects.toThrow('SoundBank failed');

    expect(mockClose).toHaveBeenCalled();
    expect(engine.isConnected()).toBe(false);
  });

  // --- Disconnect ---

  test('disconnect cleans up everything', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    const soundBank = engine.soundBank;
    const masterGain = engine.masterGain;

    engine.disconnect();

    expect(soundBank.dispose).toHaveBeenCalled();
    expect(masterGain.dispose).toHaveBeenCalled();
    expect(engine.isConnected()).toBe(false);
  });

  // --- Store subscription and event dispatch ---

  test('dispatches events when active game state changes', async () => {
    const game1 = makeGame({ homeScore: 0 });
    const game2 = makeGame({ homeScore: 1 });

    const store = createMockStore({ activeGameId: '1', games: { '1': game1 } });
    await engine.connect(store);

    // Update game with score change
    store.setState({ games: { '1': game2 } });

    expect(engine.soundBank.playRunScored).toHaveBeenCalledWith({ team: 'home', runs: 1 });
  });

  test('does not dispatch when game reference is unchanged', async () => {
    const game = makeGame();
    const store = createMockStore({ activeGameId: '1', games: { '1': game } });
    await engine.connect(store);

    // Trigger subscription with same game reference
    store.setState({ activeGameId: '1', games: { '1': game } });

    expect(engine.soundBank.playRunScored).not.toHaveBeenCalled();
    expect(engine.soundBank.playOutRecorded).not.toHaveBeenCalled();
  });

  // --- Pause / Resume ---

  test('pause sets masterGain to 0', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    engine.pause();
    expect(engine.masterGain.gain.value).toBe(0);
  });

  test('resume restores volume', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);
    engine.setMasterVolume(0.7);

    engine.pause();
    expect(engine.masterGain.gain.value).toBe(0);

    engine.resume();
    expect(engine.masterGain.gain.value).toBe(0.7);
  });

  test('events are not dispatched while paused', async () => {
    const game1 = makeGame({ outs: 0 });
    const game2 = makeGame({ outs: 1 });

    const store = createMockStore({ activeGameId: '1', games: { '1': game1 } });
    await engine.connect(store);
    engine.pause();

    store.setState({ games: { '1': game2 } });
    expect(engine.soundBank.playOutRecorded).not.toHaveBeenCalled();
  });

  // --- Volume ---

  test('setMasterVolume clamps to 0-1', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    engine.setMasterVolume(1.5);
    expect(engine.masterGain.gain.value).toBe(1);

    engine.setMasterVolume(-0.5);
    expect(engine.masterGain.gain.value).toBe(0);

    engine.setMasterVolume(0.5);
    expect(engine.masterGain.gain.value).toBe(0.5);
  });
});

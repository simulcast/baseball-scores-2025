import { AudioEngine } from './engine';
import { createMockStore, makeGame } from './testHelpers';

// Mock Tone.js
jest.mock('tone', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  Gain: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    gain: { value: 1 },
    dispose: jest.fn(),
  })),
  getContext: jest.fn(() => ({
    rawContext: { close: jest.fn(), state: 'running', resume: jest.fn().mockResolvedValue(undefined) },
  })),
  now: jest.fn(() => 0),
}));

// Mock Composer
jest.mock('./composer', () => ({
  Composer: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn(),
  })),
}));

const Tone = require('tone');
const { Composer } = require('./composer');

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

  test('connect initializes Tone.js and creates Composer', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    expect(Tone.start).toHaveBeenCalled();
    expect(Tone.Gain).toHaveBeenCalled();
    expect(Composer).toHaveBeenCalled();
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
    Composer.mockImplementationOnce(() => { throw new Error('Composer failed'); });

    const store = createMockStore({ activeGameId: null, games: {} });
    await expect(engine.connect(store)).rejects.toThrow('Composer failed');

    expect(mockClose).toHaveBeenCalled();
    expect(engine.isConnected()).toBe(false);
  });

  // --- Disconnect ---

  test('disconnect cleans up everything', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    const composer = engine.composer;
    const masterGain = engine.masterGain;

    engine.disconnect();

    expect(composer.dispose).toHaveBeenCalled();
    expect(masterGain.dispose).toHaveBeenCalled();
    expect(engine.isConnected()).toBe(false);
  });

  // --- Store subscription ---

  test('passes game state and events to composer.update on state change', async () => {
    const game1 = makeGame({ homeScore: 0 });
    const game2 = makeGame({ homeScore: 1 });

    const store = createMockStore({ activeGameId: '1', games: { '1': game1 } });
    await engine.connect(store);

    store.setState({ games: { '1': game2 } });

    expect(engine.composer.update).toHaveBeenCalledWith(
      game2,
      expect.arrayContaining([
        expect.objectContaining({ type: 'runScored' }),
      ]),
    );
  });

  test('does not call composer.update when game reference is unchanged', async () => {
    const game = makeGame();
    const store = createMockStore({ activeGameId: '1', games: { '1': game } });
    await engine.connect(store);

    // Trigger subscription with same game reference
    store.setState({ activeGameId: '1', games: { '1': game } });

    expect(engine.composer.update).not.toHaveBeenCalled();
  });

  // --- Pause / Resume ---

  test('pause sets masterGain to 0 and suspends composer', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    engine.pause();
    expect(engine.masterGain.gain.value).toBe(0);
    expect(engine.composer.suspend).toHaveBeenCalled();
  });

  test('resume restores volume and resumes composer', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);
    engine.setMasterVolume(0.7);

    engine.pause();
    engine.resume();

    expect(engine.masterGain.gain.value).toBe(0.7);
    expect(engine.composer.resume).toHaveBeenCalled();
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

  // --- ensureRunning ---

  test('ensureRunning does not call resume when context is running', async () => {
    const mockResume = jest.fn();
    Tone.getContext.mockReturnValue({ rawContext: { state: 'running', resume: mockResume, close: jest.fn() } });

    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    await engine.ensureRunning();
    expect(mockResume).not.toHaveBeenCalled();
  });

  test('ensureRunning calls resume when context is suspended', async () => {
    const store = createMockStore({ activeGameId: null, games: {} });
    await engine.connect(store);

    const mockCtx = { state: 'suspended', resume: jest.fn().mockResolvedValue(undefined), close: jest.fn() };
    Tone.getContext.mockReturnValue({ rawContext: mockCtx });

    await engine.ensureRunning();
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  test('ensureRunning is a no-op when not connected', async () => {
    await engine.ensureRunning(); // should not throw
    expect(Tone.getContext).not.toHaveBeenCalled();
  });
});

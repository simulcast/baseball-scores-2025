import { Composer } from './index';

// Mock Tone.js (Composer uses getTransport)
jest.mock('tone', () => ({
  getTransport: jest.fn(() => ({
    start: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Mock all Tone.js dependent modules
jest.mock('./effects', () => ({
  EffectsChain: jest.fn().mockImplementation(() => ({
    bus: { gain: { value: 1 } },
    delaySend: { gain: { value: 0 } },
    dispose: jest.fn(),
  })),
}));

jest.mock('./layers/PadLayer', () => ({
  PadLayer: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    crossfadeTo: jest.fn(),
    setPan: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('./layers/BreathLayer', () => ({
  BreathLayer: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('./layers/EventVoice', () => ({
  EventVoice: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    handleEvent: jest.fn(),
    setPan: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('./layers/PulseManager', () => ({
  PulseManager: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    stopAll: jest.fn(),
    setPan: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn(),
  })),
}));

function makeGame(overrides = {}) {
  return {
    gameId: '1', status: 'Live',
    homeTeam: { id: 147, name: 'Yankees', abbreviation: 'NYY' },
    awayTeam: { id: 111, name: 'Red Sox', abbreviation: 'BOS' },
    homeScore: 0, awayScore: 0,
    inning: 1, isTopInning: true,
    balls: 0, strikes: 0, outs: 0,
    runners: [false, false, false],
    ...overrides,
  };
}

describe('Composer', () => {
  let composer;
  const mockMasterGain = { gain: { value: 1 } };

  beforeEach(() => {
    jest.clearAllMocks();
    composer = new Composer(mockMasterGain);
  });

  afterEach(() => {
    composer.dispose();
  });

  // --- Update routing ---

  test('update calls padLayer.update with harmony', () => {
    composer.update(makeGame(), []);
    expect(composer.padLayer.update).toHaveBeenCalledWith(
      expect.objectContaining({ root: expect.any(String), mode: expect.any(String) }),
    );
  });

  test('update calls breathLayer.update', () => {
    composer.update(makeGame(), []);
    expect(composer.breathLayer.update).toHaveBeenCalled();
  });

  test('update calls pulseManager.update with runners', () => {
    const game = makeGame({ runners: [true, false, true] });
    composer.update(game, []);
    expect(composer.pulseManager.update).toHaveBeenCalledWith(
      [true, false, true],
      expect.objectContaining({ root: expect.any(String) }),
    );
  });

  test('events are routed to eventVoice.handleEvent', () => {
    const events = [
      { type: 'strike', detail: { count: 1 } },
      { type: 'ball', detail: { count: 1 } },
    ];
    composer.update(makeGame(), events);
    expect(composer.eventVoice.handleEvent).toHaveBeenCalledTimes(2);
  });

  test('eventVoice receives harmony context', () => {
    const events = [{ type: 'strike', detail: { count: 1 } }];
    composer.update(makeGame(), events);
    expect(composer.eventVoice.handleEvent).toHaveBeenCalledWith(
      events[0],
      expect.objectContaining({ root: expect.any(String), scaleTones: expect.any(Array) }),
    );
  });

  // --- Game switch detection ---

  test('detects game switch and triggers crossfade', () => {
    const game1 = makeGame({ homeTeam: { id: 147 }, awayTeam: { id: 111 } });
    const game2 = makeGame({ homeTeam: { id: 119 }, awayTeam: { id: 137 } });

    composer.update(game1, []);
    composer.update(game2, []);

    expect(composer.padLayer.crossfadeTo).toHaveBeenCalled();
  });

  test('does not trigger crossfade for same game', () => {
    const game = makeGame();
    composer.update(game, []);
    composer.update({ ...game, homeScore: 1 }, []);

    expect(composer.padLayer.crossfadeTo).not.toHaveBeenCalled();
  });

  // --- Dispose guard ---

  test('update does nothing after dispose', () => {
    composer.dispose();
    expect(() => composer.update(makeGame(), [])).not.toThrow();
  });

  // --- Suspend / resume ---

  test('suspend delegates to all layers', () => {
    composer.suspend();
    expect(composer.padLayer.suspend).toHaveBeenCalled();
    expect(composer.breathLayer.suspend).toHaveBeenCalled();
    expect(composer.eventVoice.suspend).toHaveBeenCalled();
    expect(composer.pulseManager.suspend).toHaveBeenCalled();
  });

  test('resume delegates to all layers', () => {
    composer.suspend();
    composer.resume();
    expect(composer.padLayer.resume).toHaveBeenCalled();
    expect(composer.breathLayer.resume).toHaveBeenCalled();
    expect(composer.eventVoice.resume).toHaveBeenCalled();
    expect(composer.pulseManager.resume).toHaveBeenCalled();
  });

  // --- Dispose ---

  test('dispose cleans up all layers and effects', () => {
    const { padLayer, breathLayer, eventVoice, pulseManager, effects } = composer;
    composer.dispose();
    expect(padLayer.dispose).toHaveBeenCalled();
    expect(breathLayer.dispose).toHaveBeenCalled();
    expect(eventVoice.dispose).toHaveBeenCalled();
    expect(pulseManager.dispose).toHaveBeenCalled();
    expect(effects.dispose).toHaveBeenCalled();
  });

  // --- Brightness tracking ---

  test('brightness increases with more events', () => {
    // First update with events
    composer.update(makeGame(), [
      { type: 'strike', detail: {} },
      { type: 'ball', detail: {} },
      { type: 'strike', detail: {} },
    ]);

    // The harmony passed to padLayer should have brightness > 0
    const firstCall = composer.padLayer.update.mock.calls[0][0];
    expect(firstCall.brightness).toBeGreaterThan(0);
  });

  // --- Stereo panning ---

  test('sets event pan based on batting team', () => {
    // Top of inning = away team batting = pan right
    composer.update(makeGame({ isTopInning: true }), [{ type: 'strike', detail: {} }]);
    expect(composer.eventVoice.setPan).toHaveBeenCalledWith(0.3);

    // Bottom of inning = home team batting = pan left
    composer.update(makeGame({ isTopInning: false }), [{ type: 'strike', detail: {} }]);
    expect(composer.eventVoice.setPan).toHaveBeenCalledWith(-0.3);
  });

  test('sets pad pan toward home team', () => {
    composer.update(makeGame(), []);
    expect(composer.padLayer.setPan).toHaveBeenCalledWith(-0.15);
  });
});

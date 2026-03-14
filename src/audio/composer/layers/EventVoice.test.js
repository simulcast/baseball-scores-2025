import { EventVoice } from './EventVoice';

// Mock Tone.js
jest.mock('tone', () => {
  const mockSynth = () => ({
    triggerAttackRelease: jest.fn(),
    connect: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
  });

  return {
    FMSynth: jest.fn().mockImplementation(() => mockSynth()),
    AMSynth: jest.fn().mockImplementation(() => mockSynth()),
    Gain: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockReturnThis(),
      gain: { value: 1 },
      dispose: jest.fn(),
    })),
    Panner: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockReturnThis(),
      pan: { value: 0 },
      dispose: jest.fn(),
    })),
    now: jest.fn(() => 0),
  };
});

// A realistic HarmonyState for testing
const HARMONY = {
  root: 'C',
  mode: 'ionian',
  chordTones: [48, 52, 55, 59, 60, 64, 67, 71, 72, 76, 79, 83],
  scaleTones: [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79],
  tension: 0.5,
  brightness: 0.3,
};

function createMockOutput() {
  return { gain: { value: 1 } };
}

describe('EventVoice', () => {
  let voice;

  beforeEach(() => {
    jest.clearAllMocks();
    voice = new EventVoice(createMockOutput(), null);
  });

  afterEach(() => {
    voice.dispose();
  });

  test('handleEvent with runScored triggers arpeggio synth', () => {
    voice.handleEvent({ type: 'runScored', detail: { team: 'home', runs: 2 } }, HARMONY);
    expect(voice.arpeggioSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('runScored caps at 4 notes', () => {
    voice.handleEvent({ type: 'runScored', detail: { team: 'home', runs: 10 } }, HARMONY);
    expect(voice.arpeggioSynth.triggerAttackRelease).toHaveBeenCalledTimes(4);
  });

  test('outRecorded triggers low synth', () => {
    voice.handleEvent({ type: 'outRecorded', detail: { outs: 1 } }, HARMONY);
    expect(voice.lowSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('inningChange triggers bell synth', () => {
    voice.handleEvent({ type: 'inningChange', detail: { inning: 2, isTop: true } }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('strike triggers bell synth', () => {
    voice.handleEvent({ type: 'strike', detail: { count: 1 } }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('ball triggers low synth', () => {
    voice.handleEvent({ type: 'ball', detail: { count: 1 } }, HARMONY);
    expect(voice.lowSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('statusChange Final triggers bell synth resolution', () => {
    voice.handleEvent({ type: 'statusChange', detail: { from: 'Live', to: 'Final' } }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('runnerAdvance is silent (handled by PulsePool)', () => {
    voice.handleEvent({ type: 'runnerAdvance', detail: { base: 1 } }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).not.toHaveBeenCalled();
    expect(voice.arpeggioSynth.triggerAttackRelease).not.toHaveBeenCalled();
    expect(voice.lowSynth.triggerAttackRelease).not.toHaveBeenCalled();
  });

  test('gameSelected is silent', () => {
    voice.handleEvent({ type: 'gameSelected', detail: {} }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).not.toHaveBeenCalled();
  });

  test('does nothing when suspended', () => {
    voice.suspend();
    voice.handleEvent({ type: 'strike', detail: { count: 1 } }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).not.toHaveBeenCalled();
  });

  test('resumes after suspend', () => {
    voice.suspend();
    voice.resume();
    voice.handleEvent({ type: 'strike', detail: { count: 1 } }, HARMONY);
    expect(voice.bellSynth.triggerAttackRelease).toHaveBeenCalled();
  });

  test('does nothing with null event or harmony', () => {
    expect(() => voice.handleEvent(null, HARMONY)).not.toThrow();
    expect(() => voice.handleEvent({ type: 'strike' }, null)).not.toThrow();
  });

  test('dispose cleans up all synths', () => {
    const bell = voice.bellSynth;
    const arp = voice.arpeggioSynth;
    const low = voice.lowSynth;
    voice.dispose();
    expect(bell.dispose).toHaveBeenCalled();
    expect(arp.dispose).toHaveBeenCalled();
    expect(low.dispose).toHaveBeenCalled();
  });
});

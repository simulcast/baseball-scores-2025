import { SoundBank } from './sounds';

// Mock Tone.js
jest.mock('tone', () => {
  const mockSynth = () => ({
    triggerAttackRelease: jest.fn(),
    connect: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
  });

  return {
    Synth: jest.fn(),
    PolySynth: jest.fn().mockImplementation(() => mockSynth()),
    MembraneSynth: jest.fn().mockImplementation(() => mockSynth()),
    now: jest.fn(() => 0),
  };
});

const Tone = require('tone');

function createMasterGain() {
  return { gain: { value: 1 } };
}

describe('SoundBank', () => {
  let bank;

  beforeEach(() => {
    jest.clearAllMocks();
    bank = new SoundBank(createMasterGain());
  });

  afterEach(() => {
    bank.dispose();
  });

  // --- Lazy creation ---

  test('does not create synths on construction', () => {
    expect(Tone.PolySynth).not.toHaveBeenCalled();
    expect(Tone.MembraneSynth).not.toHaveBeenCalled();
  });

  test('creates PolySynth lazily on first synth access', () => {
    bank.playStrike();
    expect(Tone.PolySynth).toHaveBeenCalledTimes(1);
  });

  test('reuses PolySynth on subsequent calls', () => {
    bank.playStrike();
    bank.playBall();
    expect(Tone.PolySynth).toHaveBeenCalledTimes(1);
  });

  test('creates MembraneSynth lazily on first membrane access', () => {
    bank.playOutRecorded();
    expect(Tone.MembraneSynth).toHaveBeenCalledTimes(1);
  });

  // --- Trigger calls ---

  test('playRunScored triggers synth with arpeggio', () => {
    bank.playRunScored({ runs: 2 });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledTimes(2);
  });

  test('playRunScored caps at 4 notes', () => {
    bank.playRunScored({ runs: 10 });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledTimes(4);
  });

  test('playOutRecorded triggers membrane', () => {
    bank.playOutRecorded();
    expect(bank.membrane.triggerAttackRelease).toHaveBeenCalledWith('C2', '8n');
  });

  test('playInningChange triggers two notes for top of inning', () => {
    bank.playInningChange({ isTop: true });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledTimes(2);
  });

  test('playInningChange triggers two notes for bottom of inning', () => {
    bank.playInningChange({ isTop: false });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledTimes(2);
  });

  test('playRunnerAdvance triggers at pitch mapped to base', () => {
    bank.playRunnerAdvance({ base: 1 });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledWith('G3', '32n');

    bank.playRunnerAdvance({ base: 2 });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledWith('D4', '32n');

    bank.playRunnerAdvance({ base: 3 });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledWith('A4', '32n');
  });

  test('playStatusChange plays swell for Live', () => {
    bank.playStatusChange({ to: 'Live' });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledTimes(1);
  });

  test('playStatusChange plays resolution for Final', () => {
    bank.playStatusChange({ to: 'Final' });
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledTimes(3);
  });

  test('playStrike triggers high tick', () => {
    bank.playStrike();
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledWith('E5', '32n');
  });

  test('playBall triggers low tick', () => {
    bank.playBall();
    expect(bank.synth.triggerAttackRelease).toHaveBeenCalledWith('G3', '32n');
  });

  // --- Dispose ---

  test('dispose cleans up all synths', () => {
    // Force creation
    bank.playStrike();
    bank.playOutRecorded();
    const synth = bank._synth;
    const membrane = bank._membrane;

    bank.dispose();
    expect(synth.dispose).toHaveBeenCalled();
    expect(membrane.dispose).toHaveBeenCalled();
    expect(bank._synth).toBeNull();
    expect(bank._membrane).toBeNull();
  });

  test('dispose is safe when no synths were created', () => {
    expect(() => bank.dispose()).not.toThrow();
  });
});

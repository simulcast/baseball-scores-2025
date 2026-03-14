import { PulseManager } from './PulseManager';

// Mock PulsePool
jest.mock('./PulsePool', () => ({
  PulsePool: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    updateNotes: jest.fn(),
    setPan: jest.fn(),
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn(),
  })),
}));

// Mock Tone.js (PulseManager doesn't use Tone directly, but PulsePool import requires it)
jest.mock('tone', () => ({
  Loop: jest.fn(),
  FMSynth: jest.fn(),
  Gain: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockReturnThis(),
    gain: { value: 0, rampTo: jest.fn() },
    dispose: jest.fn(),
  })),
  Panner: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockReturnThis(),
    pan: { value: 0 },
    dispose: jest.fn(),
  })),
  now: jest.fn(() => 0),
}));

const { PulsePool } = require('./PulsePool');

const HARMONY = {
  root: 'C',
  mode: 'ionian',
  scaleTones: [60, 62, 64, 65, 67, 69, 71, 72],
  chordTones: [60, 64, 67, 71],
  tension: 0.5,
  brightness: 0.3,
};

function createMockOutput() {
  return { gain: { value: 1 } };
}

describe('PulseManager', () => {
  let mgr;

  beforeEach(() => {
    jest.clearAllMocks();
    mgr = new PulseManager(createMockOutput());
  });

  afterEach(() => {
    mgr.dispose();
  });

  test('creates pool when base becomes occupied', () => {
    mgr.update([true, false, false], HARMONY);
    expect(PulsePool).toHaveBeenCalledTimes(1);
    expect(mgr.pools[0]).toBeTruthy();
    expect(mgr.pools[0].start).toHaveBeenCalledWith(HARMONY.scaleTones);
  });

  test('creates pools for multiple occupied bases', () => {
    mgr.update([true, true, false], HARMONY);
    expect(PulsePool).toHaveBeenCalledTimes(2);
    expect(mgr.pools[0]).toBeTruthy();
    expect(mgr.pools[1]).toBeTruthy();
    expect(mgr.pools[2]).toBeNull();
  });

  test('updates notes when harmony changes but runners unchanged', () => {
    mgr.update([true, false, false], HARMONY);
    const pool = mgr.pools[0];

    const newHarmony = { ...HARMONY, scaleTones: [62, 64, 66, 67, 69, 71, 73, 74] };
    mgr.update([true, false, false], newHarmony);

    expect(pool.updateNotes).toHaveBeenCalledWith(newHarmony.scaleTones);
    expect(PulsePool).toHaveBeenCalledTimes(1); // no new pool created
  });

  test('stops pool when base empties', () => {
    mgr.update([true, false, false], HARMONY);
    const pool = mgr.pools[0];

    mgr.update([false, false, false], HARMONY);
    expect(pool.stop).toHaveBeenCalledWith(3);
  });

  test('stopAll stops and clears all pools', () => {
    mgr.update([true, true, true], HARMONY);
    const pools = [...mgr.pools];

    mgr.stopAll();
    pools.forEach(pool => expect(pool.stop).toHaveBeenCalled());
    expect(mgr.pools).toEqual([null, null, null]);
  });

  test('setPan propagates to all active pools', () => {
    mgr.update([true, false, true], HARMONY);
    mgr.setPan(0.3);

    expect(mgr.pools[0].setPan).toHaveBeenCalledWith(0.3);
    expect(mgr.pools[2].setPan).toHaveBeenCalledWith(0.3);
  });

  test('suspend delegates to all pools', () => {
    mgr.update([true, true, false], HARMONY);
    mgr.suspend();

    expect(mgr.pools[0].suspend).toHaveBeenCalled();
    expect(mgr.pools[1].suspend).toHaveBeenCalled();
  });

  test('resume delegates to all pools', () => {
    mgr.update([true, true, false], HARMONY);
    mgr.suspend();
    mgr.resume();

    expect(mgr.pools[0].resume).toHaveBeenCalled();
    expect(mgr.pools[1].resume).toHaveBeenCalled();
  });

  test('does nothing with null runners', () => {
    expect(() => mgr.update(null, HARMONY)).not.toThrow();
    expect(PulsePool).not.toHaveBeenCalled();
  });

  test('dispose cleans up all pools', () => {
    mgr.update([true, true, true], HARMONY);
    const pools = [...mgr.pools];

    mgr.dispose();
    pools.forEach(pool => expect(pool.dispose).toHaveBeenCalled());
  });

  test('pool steps are prime numbers: 5, 7, 11', () => {
    mgr.update([true, true, true], HARMONY);

    const calls = PulsePool.mock.calls;
    expect(calls[0][1]).toBe(5);  // 1st base
    expect(calls[1][1]).toBe(7);  // 2nd base
    expect(calls[2][1]).toBe(11); // 3rd base
  });
});

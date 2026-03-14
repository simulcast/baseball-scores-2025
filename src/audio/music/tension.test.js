import { calculateTension, calculateBrightness } from './tension';

function makeGame(overrides = {}) {
  return {
    status: 'Live', homeScore: 0, awayScore: 0,
    inning: 1, isTopInning: true,
    balls: 0, strikes: 0, outs: 0,
    runners: [false, false, false],
    ...overrides,
  };
}

describe('calculateTension', () => {
  test('returns 0 for null game', () => {
    expect(calculateTension(null)).toBe(0);
  });

  test('returns 0 for non-Live games', () => {
    expect(calculateTension(makeGame({ status: 'Preview' }))).toBe(0);
    expect(calculateTension(makeGame({ status: 'Final' }))).toBe(0);
  });

  test('empty bases, 0-0, 1st inning, 0 outs = low tension', () => {
    const t = calculateTension(makeGame());
    expect(t).toBeLessThan(0.3);
    expect(t).toBeGreaterThanOrEqual(0);
  });

  // --- Runner tension ---
  test('runner on first adds some tension', () => {
    const base = calculateTension(makeGame());
    const with1st = calculateTension(makeGame({ runners: [true, false, false] }));
    expect(with1st).toBeGreaterThan(base);
  });

  test('RISP adds more tension than runner on 1st', () => {
    const with1st = calculateTension(makeGame({ runners: [true, false, false] }));
    const with2nd = calculateTension(makeGame({ runners: [false, true, false] }));
    expect(with2nd).toBeGreaterThan(with1st);
  });

  test('bases loaded = max runner tension', () => {
    const loaded = calculateTension(makeGame({ runners: [true, true, true] }));
    const with2nd = calculateTension(makeGame({ runners: [false, true, false] }));
    expect(loaded).toBeGreaterThan(with2nd);
  });

  // --- Score tension ---
  test('tied game is more tense than blowout', () => {
    const tied = calculateTension(makeGame({ homeScore: 3, awayScore: 3 }));
    const blowout = calculateTension(makeGame({ homeScore: 10, awayScore: 1 }));
    expect(tied).toBeGreaterThan(blowout);
  });

  test('close game in late innings > close game in early innings', () => {
    const early = calculateTension(makeGame({ homeScore: 2, awayScore: 2, inning: 2 }));
    const late = calculateTension(makeGame({ homeScore: 2, awayScore: 2, inning: 9 }));
    expect(late).toBeGreaterThan(early);
  });

  // --- Count tension ---
  test('full count is most tense count', () => {
    const full = calculateTension(makeGame({ balls: 3, strikes: 2 }));
    const fresh = calculateTension(makeGame({ balls: 0, strikes: 0 }));
    expect(full).toBeGreaterThan(fresh);
  });

  test('0-2 count is more tense than 0-0', () => {
    const behind = calculateTension(makeGame({ balls: 0, strikes: 2 }));
    const fresh = calculateTension(makeGame({ balls: 0, strikes: 0 }));
    expect(behind).toBeGreaterThan(fresh);
  });

  // --- Out tension ---
  test('2 outs adds significant tension', () => {
    const noOuts = calculateTension(makeGame({ outs: 0 }));
    const twoOuts = calculateTension(makeGame({ outs: 2 }));
    expect(twoOuts).toBeGreaterThan(noOuts);
  });

  // --- Combined high tension scenario ---
  test('bases loaded, full count, 2 outs, tied in 9th = very high tension', () => {
    const t = calculateTension(makeGame({
      runners: [true, true, true],
      balls: 3, strikes: 2, outs: 2,
      homeScore: 5, awayScore: 5, inning: 9,
    }));
    expect(t).toBeGreaterThan(0.8);
  });

  // --- Output is always 0-1 ---
  test('output is clamped to [0, 1]', () => {
    const extremeHigh = calculateTension(makeGame({
      runners: [true, true, true],
      balls: 3, strikes: 2, outs: 2,
      homeScore: 5, awayScore: 5, inning: 15,
    }));
    expect(extremeHigh).toBeLessThanOrEqual(1);
    expect(extremeHigh).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateBrightness', () => {
  const NOW = 1000000;

  test('returns 0 for empty timestamps', () => {
    expect(calculateBrightness([], NOW)).toBe(0);
    expect(calculateBrightness(null, NOW)).toBe(0);
  });

  test('returns 0 when all timestamps are outside window', () => {
    expect(calculateBrightness([NOW - 60000], NOW)).toBe(0);
  });

  test('recent events produce higher brightness', () => {
    const recent = calculateBrightness([NOW - 1000], NOW);
    const older = calculateBrightness([NOW - 25000], NOW);
    expect(recent).toBeGreaterThan(older);
  });

  test('more events = higher brightness', () => {
    const few = calculateBrightness([NOW - 1000, NOW - 2000], NOW);
    const many = calculateBrightness(
      [NOW - 1000, NOW - 2000, NOW - 3000, NOW - 4000, NOW - 5000],
      NOW,
    );
    expect(many).toBeGreaterThan(few);
  });

  test('many recent events approach 1.0', () => {
    const timestamps = Array.from({ length: 15 }, (_, i) => NOW - i * 500);
    const b = calculateBrightness(timestamps, NOW);
    expect(b).toBeGreaterThan(0.8);
  });

  test('output is clamped to [0, 1]', () => {
    const timestamps = Array.from({ length: 50 }, (_, i) => NOW - i * 100);
    const b = calculateBrightness(timestamps, NOW);
    expect(b).toBeLessThanOrEqual(1);
    expect(b).toBeGreaterThanOrEqual(0);
  });
});

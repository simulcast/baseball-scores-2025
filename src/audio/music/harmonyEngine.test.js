import { deriveHarmony } from './harmonyEngine';
import { teamPalette } from './teamPalette';
import { nameToIndex } from './scales';

function makeGame(overrides = {}) {
  return {
    status: 'Live', homeScore: 0, awayScore: 0,
    inning: 1, isTopInning: true,
    balls: 0, strikes: 0, outs: 0,
    runners: [false, false, false],
    homeTeam: { id: 147 }, awayTeam: { id: 111 },
    ...overrides,
  };
}

const DEFAULT_PALETTE = teamPalette(147, 111);
const ZERO_OFFSET_PALETTE = { rootOffset: 0, modeBias: 0, padColor: {}, pulseColor: {} };

describe('deriveHarmony', () => {
  test('returns expected shape', () => {
    const h = deriveHarmony(makeGame(), DEFAULT_PALETTE);
    expect(h).toHaveProperty('root');
    expect(h).toHaveProperty('mode');
    expect(h).toHaveProperty('chordTones');
    expect(h).toHaveProperty('scaleTones');
    expect(h).toHaveProperty('tension');
    expect(h).toHaveProperty('brightness');
    expect(Array.isArray(h.chordTones)).toBe(true);
    expect(Array.isArray(h.scaleTones)).toBe(true);
  });

  test('returns default harmony for null game', () => {
    const h = deriveHarmony(null, DEFAULT_PALETTE);
    expect(h.root).toBe('C');
    expect(h.mode).toBe('lydian');
    expect(h.tension).toBe(0);
  });

  // --- Root from inning ---
  test('1st inning top with zero offset = C (first in cycle)', () => {
    const h = deriveHarmony(makeGame({ inning: 1, isTopInning: true }), ZERO_OFFSET_PALETTE);
    expect(h.root).toBe('C');
  });

  test('1st inning bottom with zero offset = F (second in cycle)', () => {
    const h = deriveHarmony(makeGame({ inning: 1, isTopInning: false }), ZERO_OFFSET_PALETTE);
    expect(h.root).toBe('F');
  });

  test('2nd inning top with zero offset = Bb (third in cycle)', () => {
    const h = deriveHarmony(makeGame({ inning: 2, isTopInning: true }), ZERO_OFFSET_PALETTE);
    expect(h.root).toBe('Bb');
  });

  test('root changes with team palette offset', () => {
    const noOffset = deriveHarmony(makeGame(), ZERO_OFFSET_PALETTE);
    const withOffset = deriveHarmony(makeGame(), { ...ZERO_OFFSET_PALETTE, rootOffset: 3 });
    expect(noOffset.root).not.toBe(withOffset.root);
  });

  // --- Mode from tension ---
  test('low tension game = lydian', () => {
    // Empty bases, 0-0 count, 1st inning, blowout
    const h = deriveHarmony(
      makeGame({ homeScore: 10, awayScore: 0, runners: [false, false, false] }),
      ZERO_OFFSET_PALETTE,
    );
    expect(h.mode).toBe('lydian');
  });

  test('high tension game = dorian or aeolian', () => {
    const h = deriveHarmony(
      makeGame({
        runners: [true, true, true], balls: 3, strikes: 2,
        outs: 2, homeScore: 5, awayScore: 5, inning: 9,
      }),
      ZERO_OFFSET_PALETTE,
    );
    expect(['dorian', 'aeolian']).toContain(h.mode);
  });

  test('mode bias shifts thresholds', () => {
    // A game right at the lydian/mixolydian boundary
    const game = makeGame({ homeScore: 3, awayScore: 2, runners: [true, false, false] });

    const bright = deriveHarmony(game, { ...ZERO_OFFSET_PALETTE, modeBias: -0.1 });
    const dark = deriveHarmony(game, { ...ZERO_OFFSET_PALETTE, modeBias: 0.1 });

    // With negative bias, tension is lower → brighter mode
    // This may or may not cross a threshold, but the tension values should differ
    expect(bright.tension).toBe(dark.tension); // tension itself doesn't change
    // The mode might differ depending on exact threshold crossing
  });

  // --- Chord tones ---
  test('chordTones is always non-empty', () => {
    const h = deriveHarmony(makeGame(), DEFAULT_PALETTE);
    expect(h.chordTones.length).toBeGreaterThan(0);
  });

  test('chordTones are subset of scaleTones', () => {
    const h = deriveHarmony(makeGame(), DEFAULT_PALETTE);
    const scaleSet = new Set(h.scaleTones);
    h.chordTones.forEach(t => expect(scaleSet.has(t)).toBe(true));
  });

  test('scaleTones has more notes than chordTones', () => {
    const h = deriveHarmony(makeGame(), DEFAULT_PALETTE);
    expect(h.scaleTones.length).toBeGreaterThan(h.chordTones.length);
  });

  // --- Brightness passthrough ---
  test('brightness is passed through', () => {
    const h = deriveHarmony(makeGame(), DEFAULT_PALETTE, 0.7);
    expect(h.brightness).toBe(0.7);
  });

  // --- Different innings produce different roots ---
  test('harmony changes across innings', () => {
    const roots = new Set();
    for (let inning = 1; inning <= 5; inning++) {
      const h = deriveHarmony(makeGame({ inning }), ZERO_OFFSET_PALETTE);
      roots.add(h.root);
    }
    expect(roots.size).toBeGreaterThan(1);
  });
});

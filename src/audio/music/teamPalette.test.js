import { teamPalette } from './teamPalette';

describe('teamPalette', () => {
  test('returns expected shape', () => {
    const p = teamPalette(147, 111);
    expect(p).toHaveProperty('rootOffset');
    expect(p).toHaveProperty('modeBias');
    expect(p).toHaveProperty('padColor');
    expect(p).toHaveProperty('pulseColor');
    expect(p.padColor).toHaveProperty('harmonicity');
    expect(p.padColor).toHaveProperty('modulationIndex');
    expect(p.pulseColor).toHaveProperty('harmonicity');
    expect(p.pulseColor).toHaveProperty('modulationIndex');
  });

  test('rootOffset is 0-11', () => {
    for (let i = 100; i < 160; i++) {
      const p = teamPalette(i, i + 1);
      expect(p.rootOffset).toBeGreaterThanOrEqual(0);
      expect(p.rootOffset).toBeLessThan(12);
    }
  });

  test('modeBias is between -0.1 and 0.1', () => {
    for (let i = 100; i < 160; i++) {
      const p = teamPalette(i, i + 1);
      expect(p.modeBias).toBeGreaterThanOrEqual(-0.1);
      expect(p.modeBias).toBeLessThanOrEqual(0.1);
    }
  });

  test('is deterministic — same input always same output', () => {
    const a = teamPalette(147, 111);
    const b = teamPalette(147, 111);
    expect(a).toEqual(b);
  });

  test('different matchups produce different palettes', () => {
    const a = teamPalette(147, 111);
    const b = teamPalette(119, 137);
    // At least rootOffset or modeBias should differ
    expect(
      a.rootOffset !== b.rootOffset || a.modeBias !== b.modeBias
    ).toBe(true);
  });

  test('swapping home/away produces different palette', () => {
    const a = teamPalette(147, 111);
    const b = teamPalette(111, 147);
    // rootOffset is symmetric (sum-based), but modeBias and colors differ
    expect(a.modeBias).not.toBe(b.modeBias);
  });

  test('handles null team IDs with defaults', () => {
    const p = teamPalette(null, null);
    expect(p.rootOffset).toBeGreaterThanOrEqual(0);
    expect(p.rootOffset).toBeLessThan(12);
  });

  test('handles undefined team IDs', () => {
    expect(() => teamPalette(undefined, undefined)).not.toThrow();
  });

  test('padColor harmonicity is in reasonable range', () => {
    const p = teamPalette(147, 111);
    expect(p.padColor.harmonicity).toBeGreaterThanOrEqual(1.0);
    expect(p.padColor.harmonicity).toBeLessThanOrEqual(2.0);
  });

  test('pulseColor harmonicity is in glass/mallet range', () => {
    const p = teamPalette(147, 111);
    expect(p.pulseColor.harmonicity).toBeGreaterThanOrEqual(2.5);
    expect(p.pulseColor.harmonicity).toBeLessThanOrEqual(4.0);
  });
});

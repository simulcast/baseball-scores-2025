import { assignVoices, pickInitialVoices } from './voiceLeading';
import { noteToMidi } from './scales';

describe('assignVoices', () => {
  test('empty current voices returns empty', () => {
    expect(assignVoices([], [60, 64, 67])).toEqual([]);
  });

  test('empty target returns copy of current', () => {
    expect(assignVoices([60, 64, 67], [])).toEqual([60, 64, 67]);
  });

  test('null inputs handled gracefully', () => {
    expect(assignVoices(null, [60])).toEqual([]);
    expect(assignVoices([60], null)).toEqual([60]);
  });

  test('voices move to nearest target', () => {
    // Current: C4(60), E4(64), B4(71)
    // Target:  D4(62), F4(65), A4(69)
    // 60→62 (dist 2), 64→65 (dist 1), 71→69 (dist 2)
    const result = assignVoices([60, 64, 71], [62, 65, 69]);
    expect(result).toEqual([62, 65, 69]);
  });

  test('minimal movement when target is close', () => {
    // Current: C4(60), E4(64), G4(67)
    // Target:  C4(60), E4(64), Ab4(68)
    const result = assignVoices([60, 64, 67], [60, 64, 68]);
    expect(result).toEqual([60, 64, 68]);
  });

  test('voices can double when fewer targets than voices', () => {
    // 3 voices, only 2 targets — nearest wins, doubling is OK
    const result = assignVoices([60, 64, 67], [60, 67]);
    // 60→60, 64→60 or 67, 67→67
    expect(result[0]).toBe(60);
    expect(result[2]).toBe(67);
    // Middle voice goes to whichever is nearer: 64 is equidistant, but 67 is 3 away, 60 is 4 away
    expect(result[1]).toBe(67);
  });

  test('handles more targets than voices', () => {
    const result = assignVoices([60], [55, 60, 65, 70]);
    expect(result).toEqual([60]); // stays on exact match
  });

  test('prefers exact matches', () => {
    const result = assignVoices([64], [60, 64, 67]);
    expect(result).toEqual([64]);
  });

  test('returns same length as current', () => {
    const result = assignVoices([60, 64, 67], [55, 60, 64, 67, 72]);
    expect(result).toHaveLength(3);
  });
});

describe('pickInitialVoices', () => {
  const C_MAJOR_CHORD = [
    noteToMidi('C3'), noteToMidi('E3'), noteToMidi('G3'), noteToMidi('B3'),
    noteToMidi('C4'), noteToMidi('E4'), noteToMidi('G4'), noteToMidi('B4'),
    noteToMidi('C5'), noteToMidi('E5'), noteToMidi('G5'), noteToMidi('B5'),
  ];

  test('returns requested number of voices', () => {
    expect(pickInitialVoices(C_MAJOR_CHORD, 3)).toHaveLength(3);
    expect(pickInitialVoices(C_MAJOR_CHORD, 1)).toHaveLength(1);
  });

  test('returns empty for empty chord tones', () => {
    expect(pickInitialVoices([], 3)).toEqual([]);
  });

  test('returns empty for count <= 0', () => {
    expect(pickInitialVoices(C_MAJOR_CHORD, 0)).toEqual([]);
  });

  test('voices are near the center', () => {
    const voices = pickInitialVoices(C_MAJOR_CHORD, 3, 60);
    voices.forEach(v => {
      expect(Math.abs(v - 60)).toBeLessThan(12); // within an octave of center
    });
  });

  test('voices are sorted ascending', () => {
    const voices = pickInitialVoices(C_MAJOR_CHORD, 3);
    for (let i = 1; i < voices.length; i++) {
      expect(voices[i]).toBeGreaterThanOrEqual(voices[i - 1]);
    }
  });

  test('wraps when count > chord tones', () => {
    const small = [60, 64];
    const voices = pickInitialVoices(small, 4);
    expect(voices).toHaveLength(4);
  });
});

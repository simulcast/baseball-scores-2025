import {
  noteToMidi, midiToNote, midiToFreq, transpose,
  nameToIndex, indexToName, parseNote,
  getScaleTones, getChordTones, getModes, CYCLE_OF_FOURTHS,
} from './scales';

describe('scales', () => {
  // --- noteToMidi ---
  describe('noteToMidi', () => {
    test('C4 = 60', () => expect(noteToMidi('C4')).toBe(60));
    test('A4 = 69', () => expect(noteToMidi('A4')).toBe(69));
    test('C-1 = 0', () => expect(noteToMidi('C-1')).toBe(0));
    test('Db4 = 61', () => expect(noteToMidi('Db4')).toBe(61));
    test('B3 = 59', () => expect(noteToMidi('B3')).toBe(59));
    test('throws on invalid note', () => {
      expect(() => noteToMidi('X4')).toThrow();
      expect(() => noteToMidi('')).toThrow();
    });
  });

  // --- midiToNote ---
  describe('midiToNote', () => {
    test('60 = C4', () => expect(midiToNote(60)).toBe('C4'));
    test('69 = A4', () => expect(midiToNote(69)).toBe('A4'));
    test('61 = Db4', () => expect(midiToNote(61)).toBe('Db4'));
    test('roundtrip', () => {
      for (let midi = 24; midi < 96; midi++) {
        expect(noteToMidi(midiToNote(midi))).toBe(midi);
      }
    });
  });

  // --- midiToFreq ---
  describe('midiToFreq', () => {
    test('A4 (69) = 440 Hz', () => expect(midiToFreq(69)).toBeCloseTo(440));
    test('A3 (57) = 220 Hz', () => expect(midiToFreq(57)).toBeCloseTo(220));
    test('C4 (60) ≈ 261.63 Hz', () => expect(midiToFreq(60)).toBeCloseTo(261.63, 1));
  });

  // --- transpose ---
  describe('transpose', () => {
    test('C4 + 2 = D4', () => expect(transpose('C4', 2)).toBe('D4'));
    test('C4 + 12 = C5', () => expect(transpose('C4', 12)).toBe('C5'));
    test('C4 - 1 = B3', () => expect(transpose('C4', -1)).toBe('B3'));
    test('Db4 + 1 = D4', () => expect(transpose('Db4', 1)).toBe('D4'));
  });

  // --- nameToIndex / indexToName ---
  describe('nameToIndex / indexToName', () => {
    test('C = 0', () => expect(nameToIndex('C')).toBe(0));
    test('Db = 1', () => expect(nameToIndex('Db')).toBe(1));
    test('B = 11', () => expect(nameToIndex('B')).toBe(11));
    test('roundtrip', () => {
      for (let i = 0; i < 12; i++) {
        expect(nameToIndex(indexToName(i))).toBe(i);
      }
    });
    test('throws on unknown name', () => {
      expect(() => nameToIndex('H')).toThrow();
    });
  });

  // --- getScaleTones ---
  describe('getScaleTones', () => {
    test('C ionian contains expected notes', () => {
      const tones = getScaleTones('C', 'ionian', 4, 4);
      const notes = tones.map(midiToNote);
      expect(notes).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);
    });

    test('C lydian has raised 4th', () => {
      const tones = getScaleTones('C', 'lydian', 4, 4);
      const notes = tones.map(midiToNote);
      expect(notes).toContain('Gb4'); // F# = Gb in our naming
    });

    test('C aeolian has flat 3, 6, 7', () => {
      const tones = getScaleTones('C', 'aeolian', 4, 4);
      const notes = tones.map(midiToNote);
      expect(notes).toContain('Eb4');
      expect(notes).toContain('Ab4');
      expect(notes).toContain('Bb4');
    });

    test('returns tones across octave range', () => {
      const tones = getScaleTones('C', 'ionian', 3, 5);
      expect(tones.length).toBeGreaterThan(7);
      expect(tones[0]).toBeLessThan(noteToMidi('C4'));
      expect(tones[tones.length - 1]).toBeGreaterThan(noteToMidi('B4'));
    });

    test('throws on unknown mode', () => {
      expect(() => getScaleTones('C', 'locrian')).toThrow();
    });
  });

  // --- getChordTones ---
  describe('getChordTones', () => {
    test('C ionian chord = C E G B', () => {
      const tones = getChordTones('C', 'ionian', 4, 4);
      const notes = tones.map(midiToNote);
      expect(notes).toEqual(['C4', 'E4', 'G4', 'B4']);
    });

    test('C aeolian chord = C Eb G Bb', () => {
      const tones = getChordTones('C', 'aeolian', 4, 4);
      const notes = tones.map(midiToNote);
      expect(notes).toEqual(['C4', 'Eb4', 'G4', 'Bb4']);
    });

    test('returns fewer tones than scale', () => {
      const scale = getScaleTones('C', 'ionian', 4, 4);
      const chord = getChordTones('C', 'ionian', 4, 4);
      expect(chord.length).toBeLessThan(scale.length);
    });

    test('chord tones are subset of scale tones', () => {
      const scale = new Set(getScaleTones('C', 'dorian', 3, 5));
      const chord = getChordTones('C', 'dorian', 3, 5);
      chord.forEach(tone => expect(scale.has(tone)).toBe(true));
    });
  });

  // --- getModes ---
  test('getModes returns all 5 modes', () => {
    const modes = getModes();
    expect(modes).toHaveLength(5);
    expect(modes).toContain('lydian');
    expect(modes).toContain('aeolian');
  });

  // --- CYCLE_OF_FOURTHS ---
  test('cycle of fourths has 12 unique entries', () => {
    expect(CYCLE_OF_FOURTHS).toHaveLength(12);
    expect(new Set(CYCLE_OF_FOURTHS).size).toBe(12);
  });

  test('cycle of fourths starts on C', () => {
    expect(CYCLE_OF_FOURTHS[0]).toBe('C');
  });

  test('each step is 5 semitones up from the previous', () => {
    for (let i = 1; i < CYCLE_OF_FOURTHS.length; i++) {
      const prev = nameToIndex(CYCLE_OF_FOURTHS[i - 1]);
      const curr = nameToIndex(CYCLE_OF_FOURTHS[i]);
      expect((curr - prev + 12) % 12).toBe(5);
    }
  });
});

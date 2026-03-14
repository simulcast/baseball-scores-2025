import { formatInning, formatGameTime } from './formatGameDisplay';

describe('formatInning', () => {
  it('returns Top/Bottom with inning number', () => {
    expect(formatInning({ inning: 5, isTopInning: true, inningState: 'Top' }))
      .toBe('Top 5');
    expect(formatInning({ inning: 3, isTopInning: false, inningState: 'Bottom' }))
      .toBe('Bottom 3');
  });

  it('returns Mid/End when inningState starts with those', () => {
    expect(formatInning({ inning: 7, isTopInning: true, inningState: 'Middle' }))
      .toBe('Middle 7');
    expect(formatInning({ inning: 5, isTopInning: false, inningState: 'End' }))
      .toBe('End 5');
  });

  it('uses Mid prefix correctly', () => {
    expect(formatInning({ inning: 4, isTopInning: true, inningState: 'Mid' }))
      .toBe('Mid 4');
  });

  it('returns empty string for null/missing game', () => {
    expect(formatInning(null)).toBe('');
    expect(formatInning({})).toBe('');
    expect(formatInning({ inning: 0 })).toBe('');
  });
});

describe('formatGameTime', () => {
  it('formats ISO date to display time', () => {
    const result = formatGameTime('2025-07-04T23:05:00Z');
    // Result depends on local timezone, just verify it's a non-empty string
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });

  it('returns empty string for null/missing date', () => {
    expect(formatGameTime(null)).toBe('');
    expect(formatGameTime(undefined)).toBe('');
  });
});

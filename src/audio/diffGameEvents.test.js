import { diffGameEvents } from './diffGameEvents';

/** Helper: create a minimal normalized game object */
function makeGame(overrides = {}) {
  return {
    gameId: '1',
    status: 'Live',
    homeScore: 0,
    awayScore: 0,
    inning: 1,
    isTopInning: true,
    inningState: 'Middle',
    balls: 0,
    strikes: 0,
    outs: 0,
    runners: [false, false, false],
    homeTeam: { id: 1, name: 'Home', abbreviation: 'HOM' },
    awayTeam: { id: 2, name: 'Away', abbreviation: 'AWY' },
    gameDate: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('diffGameEvents', () => {
  // --- Null/identity cases ---

  test('returns [] when both prev and next are null', () => {
    expect(diffGameEvents(null, null)).toEqual([]);
  });

  test('returns [] when prev === next (same reference)', () => {
    const game = makeGame();
    expect(diffGameEvents(game, game)).toEqual([]);
  });

  test('returns [] when game is deselected (prev exists, next null)', () => {
    expect(diffGameEvents(makeGame(), null)).toEqual([]);
  });

  // --- Game selected ---

  test('returns gameSelected when selecting a Live game', () => {
    const events = diffGameEvents(null, makeGame({ status: 'Live' }));
    expect(events).toEqual([{ type: 'gameSelected', detail: {} }]);
  });

  test('returns [] when selecting a non-Live game', () => {
    expect(diffGameEvents(null, makeGame({ status: 'Preview' }))).toEqual([]);
    expect(diffGameEvents(null, makeGame({ status: 'Final' }))).toEqual([]);
  });

  // --- Status changes ---

  test('detects status change', () => {
    const prev = makeGame({ status: 'Preview' });
    const next = makeGame({ status: 'Live' });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'statusChange',
      detail: { from: 'Preview', to: 'Live' },
    });
  });

  // --- Score changes ---

  test('detects home run scored', () => {
    const prev = makeGame({ homeScore: 2 });
    const next = makeGame({ homeScore: 3 });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'runScored',
      detail: { team: 'home', runs: 1 },
    });
  });

  test('detects away run scored with multiple runs', () => {
    const prev = makeGame({ awayScore: 0 });
    const next = makeGame({ awayScore: 3 });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'runScored',
      detail: { team: 'away', runs: 3 },
    });
  });

  test('ignores score decrease (data correction)', () => {
    const prev = makeGame({ homeScore: 5 });
    const next = makeGame({ homeScore: 4 });
    const events = diffGameEvents(prev, next);
    const scoreEvents = events.filter((e) => e.type === 'runScored');
    expect(scoreEvents).toEqual([]);
  });

  // --- Inning changes ---

  test('detects inning number change', () => {
    const prev = makeGame({ inning: 3, isTopInning: false });
    const next = makeGame({ inning: 4, isTopInning: true });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'inningChange',
      detail: { inning: 4, isTop: true },
    });
  });

  test('detects half-inning flip', () => {
    const prev = makeGame({ inning: 5, isTopInning: true });
    const next = makeGame({ inning: 5, isTopInning: false });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'inningChange',
      detail: { inning: 5, isTop: false },
    });
  });

  // --- Outs ---

  test('detects out recorded within same half-inning', () => {
    const prev = makeGame({ outs: 1 });
    const next = makeGame({ outs: 2 });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'outRecorded',
      detail: { outs: 2 },
    });
  });

  test('does not fire outRecorded on inning change (outs reset)', () => {
    const prev = makeGame({ inning: 3, isTopInning: true, outs: 2 });
    const next = makeGame({ inning: 3, isTopInning: false, outs: 0 });
    const events = diffGameEvents(prev, next);
    const outEvents = events.filter((e) => e.type === 'outRecorded');
    expect(outEvents).toEqual([]);
  });

  // --- Strikes and balls ---

  test('detects strike within same half-inning', () => {
    const prev = makeGame({ strikes: 0 });
    const next = makeGame({ strikes: 1 });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'strike',
      detail: { count: 1 },
    });
  });

  test('detects ball within same half-inning', () => {
    const prev = makeGame({ balls: 1 });
    const next = makeGame({ balls: 2 });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({
      type: 'ball',
      detail: { count: 2 },
    });
  });

  test('does not fire strike/ball on inning change', () => {
    const prev = makeGame({ inning: 1, isTopInning: true, strikes: 2, balls: 3 });
    const next = makeGame({ inning: 1, isTopInning: false, strikes: 0, balls: 0 });
    const events = diffGameEvents(prev, next);
    const countEvents = events.filter((e) => e.type === 'strike' || e.type === 'ball');
    expect(countEvents).toEqual([]);
  });

  // --- Runners ---

  test('detects runner advance to each base', () => {
    const prev = makeGame({ runners: [false, false, false] });
    const next = makeGame({ runners: [true, true, true] });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({ type: 'runnerAdvance', detail: { base: 1 } });
    expect(events).toContainEqual({ type: 'runnerAdvance', detail: { base: 2 } });
    expect(events).toContainEqual({ type: 'runnerAdvance', detail: { base: 3 } });
  });

  test('does not fire runnerAdvance when runner leaves base', () => {
    const prev = makeGame({ runners: [true, true, false] });
    const next = makeGame({ runners: [false, false, true] });
    const events = diffGameEvents(prev, next);
    const runnerEvents = events.filter((e) => e.type === 'runnerAdvance');
    // Only base 3 is a new runner
    expect(runnerEvents).toEqual([{ type: 'runnerAdvance', detail: { base: 3 } }]);
  });

  // --- Edge cases ---

  test('handles malformed runners (undefined)', () => {
    const prev = makeGame({ runners: undefined });
    const next = makeGame({ runners: [true, false, false] });
    const events = diffGameEvents(prev, next);
    expect(events).toContainEqual({ type: 'runnerAdvance', detail: { base: 1 } });
  });

  test('handles malformed runners (empty array)', () => {
    const prev = makeGame({ runners: [] });
    const next = makeGame({ runners: [false, true, false] });
    const events = diffGameEvents(prev, next);
    // prev[1] is undefined (falsy), next[1] is true → runner advance
    expect(events).toContainEqual({ type: 'runnerAdvance', detail: { base: 2 } });
  });

  test('produces multiple events in a single diff', () => {
    const prev = makeGame({ homeScore: 1, runners: [false, true, false], outs: 0 });
    const next = makeGame({ homeScore: 2, runners: [true, false, false], outs: 1 });
    const events = diffGameEvents(prev, next);
    const types = events.map((e) => e.type);
    expect(types).toContain('runScored');
    expect(types).toContain('outRecorded');
    expect(types).toContain('runnerAdvance'); // base 1 new
  });
});

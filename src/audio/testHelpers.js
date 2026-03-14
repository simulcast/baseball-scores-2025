/**
 * Shared test helpers for audio engine tests.
 */

/** Create a minimal Zustand-like store. */
export function createMockStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setState: (partial) => {
      state = { ...state, ...partial };
      listeners.forEach((fn) => fn(state));
    },
  };
}

/** Create a normalized game object with optional overrides. */
export function makeGame(overrides = {}) {
  return {
    gameId: '1', status: 'Live',
    homeTeam: { id: 147, name: 'Yankees', abbreviation: 'NYY' },
    awayTeam: { id: 111, name: 'Red Sox', abbreviation: 'BOS' },
    homeScore: 0, awayScore: 0,
    inning: 1, isTopInning: true,
    inningState: '',
    balls: 0, strikes: 0, outs: 0,
    runners: [false, false, false],
    gameDate: null,
    ...overrides,
  };
}

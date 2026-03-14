import { useGameStore, gameEqual } from './gameStore';
import { normalizeGame } from '../utils/normalizeGame';

// Helper to reset store between tests
beforeEach(() => {
  useGameStore.setState({
    games: {},
    activeGameId: null,
    lastAcceptedSeq: 0,
    lastUpdatedAt: null,
    pollError: null,
  });
});

const makeRawGame = (gamePk, overrides = {}) => ({
  gamePk,
  status: { abstractGameState: 'Live' },
  gameDate: '2025-04-15T23:10:00Z',
  teams: {
    home: { team: { id: 1, name: 'Yankees', abbreviation: 'NYY' }, score: 0 },
    away: { team: { id: 2, name: 'Red Sox', abbreviation: 'BOS' }, score: 0 },
  },
  linescore: {
    currentInning: 1,
    isTopInning: true,
    inningState: 'Top',
    balls: 0,
    strikes: 0,
    outs: 0,
    offense: {},
  },
  ...overrides,
});

describe('gameStore', () => {
  describe('ingestGames', () => {
    it('populates games from raw API data', () => {
      const { ingestGames } = useGameStore.getState();
      ingestGames([makeRawGame(100), makeRawGame(200)]);

      const { games } = useGameStore.getState();
      expect(Object.keys(games)).toEqual(['100', '200']);
      expect(games['100'].gameId).toBe('100');
      expect(games['200'].gameId).toBe('200');
    });

    it('keeps same object reference when game data is unchanged', () => {
      const { ingestGames } = useGameStore.getState();
      const raw = [makeRawGame(100)];

      ingestGames(raw);
      const ref1 = useGameStore.getState().games['100'];

      ingestGames(raw);
      const ref2 = useGameStore.getState().games['100'];

      expect(ref1).toBe(ref2);
    });

    it('creates new object reference when game data changes', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100)]);
      const ref1 = useGameStore.getState().games['100'];

      ingestGames([makeRawGame(100, {
        teams: {
          home: { team: { id: 1, name: 'Yankees', abbreviation: 'NYY' }, score: 1 },
          away: { team: { id: 2, name: 'Red Sox', abbreviation: 'BOS' }, score: 0 },
        },
      })]);
      const ref2 = useGameStore.getState().games['100'];

      expect(ref1).not.toBe(ref2);
      expect(ref2.homeScore).toBe(1);
    });

    it('removes games that are no longer in the raw data', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100), makeRawGame(200)]);
      expect(Object.keys(useGameStore.getState().games)).toHaveLength(2);

      ingestGames([makeRawGame(100)]);
      expect(Object.keys(useGameStore.getState().games)).toEqual(['100']);
    });

    it('skips null normalized results', () => {
      const { ingestGames } = useGameStore.getState();
      ingestGames([null, makeRawGame(100)]);

      const { games } = useGameStore.getState();
      expect(Object.keys(games)).toEqual(['100']);
    });
  });

  describe('seq-based ordering', () => {
    it('drops ingestion when seq is less than lastAcceptedSeq', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100)], 200);
      expect(Object.keys(useGameStore.getState().games)).toHaveLength(1);

      ingestGames([makeRawGame(100), makeRawGame(200)], 100);
      // Should still have only 1 game — stale response dropped
      expect(Object.keys(useGameStore.getState().games)).toHaveLength(1);
    });

    it('drops ingestion when seq equals lastAcceptedSeq', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100)], 200);
      ingestGames([makeRawGame(100), makeRawGame(200)], 200);

      expect(Object.keys(useGameStore.getState().games)).toHaveLength(1);
    });

    it('accepts ingestion when seq is greater than lastAcceptedSeq', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100)], 100);
      ingestGames([makeRawGame(100), makeRawGame(200)], 200);

      expect(Object.keys(useGameStore.getState().games)).toHaveLength(2);
    });

    it('updates lastAcceptedSeq on successful ingestion', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100)], 150);
      expect(useGameStore.getState().lastAcceptedSeq).toBe(150);
    });

    it('accepts ingestion when seq is undefined (backwards compat)', () => {
      const { ingestGames } = useGameStore.getState();

      // Set a high lastAcceptedSeq
      ingestGames([makeRawGame(100)], 9999);

      // Calling without seq should still work
      ingestGames([makeRawGame(100), makeRawGame(200)]);
      expect(Object.keys(useGameStore.getState().games)).toHaveLength(2);
    });
  });

  describe('top-level games reference stability', () => {
    it('keeps same games object reference when no game data changed', () => {
      const { ingestGames } = useGameStore.getState();
      const raw = [makeRawGame(100)];

      ingestGames(raw);
      const gamesRef1 = useGameStore.getState().games;

      ingestGames(raw);
      const gamesRef2 = useGameStore.getState().games;

      expect(gamesRef1).toBe(gamesRef2);
    });

    it('creates new games object reference when a game changes', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100)]);
      const gamesRef1 = useGameStore.getState().games;

      ingestGames([makeRawGame(100, {
        linescore: { currentInning: 2, isTopInning: true, inningState: 'Top', balls: 0, strikes: 0, outs: 0, offense: {} },
      })]);
      const gamesRef2 = useGameStore.getState().games;

      expect(gamesRef1).not.toBe(gamesRef2);
    });

    it('creates new games object reference when game count changes', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100), makeRawGame(200)]);
      const gamesRef1 = useGameStore.getState().games;

      ingestGames([makeRawGame(100)]);
      const gamesRef2 = useGameStore.getState().games;

      expect(gamesRef1).not.toBe(gamesRef2);
    });
  });

  describe('active game preservation', () => {
    it('preserves active game when it disappears from the response', () => {
      const { ingestGames, setActiveGame } = useGameStore.getState();

      ingestGames([makeRawGame(100), makeRawGame(200)]);
      setActiveGame(100);

      // Response no longer includes game 100
      ingestGames([makeRawGame(200)]);

      const { games } = useGameStore.getState();
      expect(games['100']).toBeDefined();
      expect(games['100'].gameId).toBe('100');
      expect(games['200']).toBeDefined();
    });

    it('clears games normally when no active game is set', () => {
      const { ingestGames } = useGameStore.getState();

      ingestGames([makeRawGame(100), makeRawGame(200)]);
      ingestGames([makeRawGame(200)]);

      const { games } = useGameStore.getState();
      expect(games['100']).toBeUndefined();
      expect(games['200']).toBeDefined();
    });

    it('clears games normally when active game is still in response', () => {
      const { ingestGames, setActiveGame } = useGameStore.getState();

      ingestGames([makeRawGame(100), makeRawGame(200)]);
      setActiveGame(100);

      // Game 100 is still in the response, game 200 is removed
      ingestGames([makeRawGame(100)]);

      const { games } = useGameStore.getState();
      expect(games['100']).toBeDefined();
      expect(games['200']).toBeUndefined();
    });
  });

  describe('staleness and error state', () => {
    it('sets lastUpdatedAt on successful ingestion', () => {
      const { ingestGames } = useGameStore.getState();
      const before = Date.now();

      ingestGames([makeRawGame(100)]);

      const { lastUpdatedAt } = useGameStore.getState();
      expect(lastUpdatedAt).toBeGreaterThanOrEqual(before);
      expect(lastUpdatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('clears pollError on successful ingestion', () => {
      const { ingestGames, setPollError } = useGameStore.getState();

      setPollError('network timeout');
      expect(useGameStore.getState().pollError).toBe('network timeout');

      ingestGames([makeRawGame(100)]);
      expect(useGameStore.getState().pollError).toBeNull();
    });

    it('sets pollError via setPollError', () => {
      const { setPollError } = useGameStore.getState();

      setPollError('fetch failed');
      expect(useGameStore.getState().pollError).toBe('fetch failed');
    });

    it('does not update lastUpdatedAt when setPollError is called', () => {
      const { setPollError } = useGameStore.getState();

      setPollError('error');
      expect(useGameStore.getState().lastUpdatedAt).toBeNull();
    });
  });

  describe('isStale', () => {
    it('returns true when lastUpdatedAt is null (no polls yet)', () => {
      expect(useGameStore.getState().isStale()).toBe(true);
    });

    it('returns false immediately after successful ingestion', () => {
      const { ingestGames } = useGameStore.getState();
      ingestGames([makeRawGame(100)]);

      expect(useGameStore.getState().isStale()).toBe(false);
    });

    it('returns true when lastUpdatedAt exceeds threshold', () => {
      // Manually set lastUpdatedAt to a time in the past
      useGameStore.setState({ lastUpdatedAt: Date.now() - 20000 });

      expect(useGameStore.getState().isStale()).toBe(true);
    });

    it('respects custom threshold', () => {
      useGameStore.setState({ lastUpdatedAt: Date.now() - 5000 });

      // 10s threshold — 5s old is not stale
      expect(useGameStore.getState().isStale(10000)).toBe(false);
      // 3s threshold — 5s old is stale
      expect(useGameStore.getState().isStale(3000)).toBe(true);
    });
  });

  describe('input guard', () => {
    it('does not crash when rawGames is null', () => {
      const { ingestGames } = useGameStore.getState();
      expect(() => ingestGames(null, 100)).not.toThrow();
      expect(Object.keys(useGameStore.getState().games)).toHaveLength(0);
    });

    it('does not crash when rawGames is undefined', () => {
      const { ingestGames } = useGameStore.getState();
      expect(() => ingestGames(undefined, 100)).not.toThrow();
    });

    it('does not crash when rawGames is a string', () => {
      const { ingestGames } = useGameStore.getState();
      expect(() => ingestGames('bad data', 100)).not.toThrow();
    });
  });

  describe('gameEqual', () => {
    const fullRaw = {
      gamePk: 718405,
      status: { abstractGameState: 'Live' },
      gameDate: '2025-04-15T23:10:00Z',
      teams: {
        home: { team: { id: 147, name: 'New York Yankees', abbreviation: 'NYY' }, score: 3 },
        away: { team: { id: 111, name: 'Boston Red Sox', abbreviation: 'BOS' }, score: 1 },
      },
      linescore: {
        currentInning: 5,
        isTopInning: false,
        inningState: 'Bottom',
        balls: 2,
        strikes: 1,
        outs: 1,
        offense: { first: { id: 123 }, third: { id: 456 } },
      },
    };

    it('checks every field produced by normalizeGame (exhaustiveness)', () => {
      const normalized = normalizeGame(fullRaw);
      const keys = Object.keys(normalized);

      // These are the fields gameEqual must check
      const expectedFields = [
        'gameId', 'status', 'gameDate',
        'homeTeam', 'awayTeam',
        'homeScore', 'awayScore',
        'inning', 'isTopInning', 'inningState',
        'balls', 'strikes', 'outs',
        'runners',
      ];

      expect(keys.sort()).toEqual(expectedFields.sort());
    });

    it('returns true for identical games', () => {
      const a = normalizeGame(fullRaw);
      const b = normalizeGame(fullRaw);
      expect(gameEqual(a, b)).toBe(true);
    });

    it('detects runner-only changes', () => {
      const a = normalizeGame(fullRaw);
      const b = normalizeGame({
        ...fullRaw,
        linescore: {
          ...fullRaw.linescore,
          offense: { second: { id: 789 } },
        },
      });
      expect(gameEqual(a, b)).toBe(false);
    });

    it('detects team abbreviation-only changes', () => {
      const a = normalizeGame(fullRaw);
      const b = normalizeGame({
        ...fullRaw,
        teams: {
          ...fullRaw.teams,
          home: { team: { id: 147, name: 'New York Yankees', abbreviation: 'NY' }, score: 3 },
        },
      });
      expect(gameEqual(a, b)).toBe(false);
    });

    it('detects count changes', () => {
      const a = normalizeGame(fullRaw);
      const b = normalizeGame({
        ...fullRaw,
        linescore: { ...fullRaw.linescore, strikes: 2 },
      });
      expect(gameEqual(a, b)).toBe(false);
    });
  });

  describe('setActiveGame', () => {
    it('sets activeGameId as a string', () => {
      const { setActiveGame } = useGameStore.getState();
      setActiveGame(12345);
      expect(useGameStore.getState().activeGameId).toBe('12345');
    });

    it('clears activeGameId when passed null', () => {
      const { setActiveGame } = useGameStore.getState();
      setActiveGame(100);
      setActiveGame(null);
      expect(useGameStore.getState().activeGameId).toBeNull();
    });
  });

  describe('getGame', () => {
    it('returns the game by id', () => {
      const { ingestGames } = useGameStore.getState();
      ingestGames([makeRawGame(100)]);

      const game = useGameStore.getState().getGame('100');
      expect(game.gameId).toBe('100');
    });

    it('returns null for unknown id', () => {
      expect(useGameStore.getState().getGame('999')).toBeNull();
    });
  });

  describe('getActiveGame', () => {
    it('returns null when no game is active', () => {
      expect(useGameStore.getState().getActiveGame()).toBeNull();
    });

    it('returns the active game', () => {
      const { ingestGames, setActiveGame } = useGameStore.getState();
      ingestGames([makeRawGame(100)]);
      setActiveGame(100);

      const game = useGameStore.getState().getActiveGame();
      expect(game.gameId).toBe('100');
    });

    it('returns null when activeGameId does not match any game', () => {
      const { setActiveGame } = useGameStore.getState();
      setActiveGame(999);
      expect(useGameStore.getState().getActiveGame()).toBeNull();
    });
  });
});

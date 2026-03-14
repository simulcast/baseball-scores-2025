import { useGameStore } from './gameStore';

// Helper to reset store between tests
beforeEach(() => {
  useGameStore.setState({ games: {}, activeGameId: null });
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

import { adaptLiveFeed } from './adaptLiveFeed';
import { normalizeGame } from './normalizeGame';

const makeLiveFeed = (overrides = {}) => ({
  gameData: {
    game: { pk: 718405 },
    status: { abstractGameState: 'Live' },
    datetime: { dateTime: '2025-04-15T23:10:00Z' },
    teams: {
      home: { id: 1, name: 'Yankees', abbreviation: 'NYY' },
      away: { id: 2, name: 'Red Sox', abbreviation: 'BOS' },
    },
  },
  liveData: {
    linescore: {
      currentInning: 3,
      isTopInning: false,
      inningState: 'Bottom',
      balls: 2,
      strikes: 1,
      outs: 1,
      teams: {
        home: { runs: 4 },
        away: { runs: 2 },
      },
      offense: {
        first: { id: 123 },
        second: { id: 456 },
      },
    },
  },
  ...overrides,
});

describe('adaptLiveFeed', () => {
  it('returns null for null/undefined input', () => {
    expect(adaptLiveFeed(null)).toBeNull();
    expect(adaptLiveFeed(undefined)).toBeNull();
  });

  it('returns null when gameData is missing', () => {
    expect(adaptLiveFeed({ liveData: {} })).toBeNull();
  });

  it('produces schedule-shaped output that normalizeGame can consume', () => {
    const adapted = adaptLiveFeed(makeLiveFeed());
    const normalized = normalizeGame(adapted);

    expect(normalized).toEqual({
      gameId: '718405',
      status: 'Live',
      gameDate: '2025-04-15T23:10:00Z',
      homeTeam: { id: 1, name: 'Yankees', abbreviation: 'NYY' },
      awayTeam: { id: 2, name: 'Red Sox', abbreviation: 'BOS' },
      homeScore: 4,
      awayScore: 2,
      inning: 3,
      isTopInning: false,
      inningState: 'Bottom',
      balls: 2,
      strikes: 1,
      outs: 1,
      runners: [true, true, false],
    });
  });

  it('handles missing linescore (pre-game state)', () => {
    const feed = makeLiveFeed({
      liveData: {},
    });
    const adapted = adaptLiveFeed(feed);
    const normalized = normalizeGame(adapted);

    expect(normalized.inning).toBe(0);
    expect(normalized.balls).toBe(0);
    expect(normalized.homeScore).toBe(0);
    expect(normalized.runners).toEqual([false, false, false]);
  });

  it('handles empty bases', () => {
    const feed = makeLiveFeed();
    feed.liveData.linescore.offense = {};

    const adapted = adaptLiveFeed(feed);
    const normalized = normalizeGame(adapted);

    expect(normalized.runners).toEqual([false, false, false]);
  });

  it('handles all three bases occupied', () => {
    const feed = makeLiveFeed();
    feed.liveData.linescore.offense = {
      first: { id: 100 },
      second: { id: 200 },
      third: { id: 300 },
    };

    const adapted = adaptLiveFeed(feed);
    const normalized = normalizeGame(adapted);

    expect(normalized.runners).toEqual([true, true, true]);
  });
});

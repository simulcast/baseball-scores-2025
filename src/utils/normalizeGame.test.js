import { normalizeGame } from './normalizeGame';

const fullGame = {
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
    offense: {
      first: { id: 123 },
      third: { id: 456 },
    },
  },
};

describe('normalizeGame', () => {
  it('returns null for null input', () => {
    expect(normalizeGame(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeGame(undefined)).toBeNull();
  });

  it('normalizes a full game with all linescore fields', () => {
    const result = normalizeGame(fullGame);

    expect(result).toEqual({
      gameId: '718405',
      status: 'Live',
      gameDate: '2025-04-15T23:10:00Z',
      homeTeam: { id: 147, name: 'New York Yankees', abbreviation: 'NYY' },
      awayTeam: { id: 111, name: 'Boston Red Sox', abbreviation: 'BOS' },
      homeScore: 3,
      awayScore: 1,
      inning: 5,
      isTopInning: false,
      inningState: 'Bottom',
      balls: 2,
      strikes: 1,
      outs: 1,
      runners: [true, false, true],
    });
  });

  it('defaults to zeros when linescore is missing', () => {
    const game = { gamePk: 1, status: { abstractGameState: 'Preview' }, teams: fullGame.teams };
    const result = normalizeGame(game);

    expect(result.inning).toBe(0);
    expect(result.balls).toBe(0);
    expect(result.strikes).toBe(0);
    expect(result.outs).toBe(0);
    expect(result.runners).toEqual([false, false, false]);
  });

  it('defaults to empty strings when teams are missing', () => {
    const game = { gamePk: 2, status: { abstractGameState: 'Preview' } };
    const result = normalizeGame(game);

    expect(result.homeTeam).toEqual({ id: null, name: '', abbreviation: '' });
    expect(result.awayTeam).toEqual({ id: null, name: '', abbreviation: '' });
  });

  it('maps abstractGameState to status correctly', () => {
    const states = ['Preview', 'Live', 'Final'];
    for (const state of states) {
      const game = { gamePk: 3, status: { abstractGameState: state } };
      expect(normalizeGame(game).status).toBe(state);
    }
  });

  it('defaults status to Preview when missing', () => {
    const game = { gamePk: 4 };
    expect(normalizeGame(game).status).toBe('Preview');
  });

  it('detects runners correctly', () => {
    const game = {
      ...fullGame,
      linescore: {
        ...fullGame.linescore,
        offense: {
          first: { id: 1 },
          second: { id: 2 },
          third: { id: 3 },
        },
      },
    };
    expect(normalizeGame(game).runners).toEqual([true, true, true]);
  });

  it('detects no runners when offense is empty', () => {
    const game = {
      ...fullGame,
      linescore: { ...fullGame.linescore, offense: {} },
    };
    expect(normalizeGame(game).runners).toEqual([false, false, false]);
  });

  it('reads scores from teams, not linescore', () => {
    const game = {
      ...fullGame,
      teams: {
        home: { ...fullGame.teams.home, score: 7 },
        away: { ...fullGame.teams.away, score: 4 },
      },
    };
    const result = normalizeGame(game);
    expect(result.homeScore).toBe(7);
    expect(result.awayScore).toBe(4);
  });

  it('defaults scores to 0 when missing', () => {
    const game = {
      gamePk: 5,
      status: { abstractGameState: 'Preview' },
      teams: {
        home: { team: { id: 1, name: 'A', abbreviation: 'A' } },
        away: { team: { id: 2, name: 'B', abbreviation: 'B' } },
      },
    };
    const result = normalizeGame(game);
    expect(result.homeScore).toBe(0);
    expect(result.awayScore).toBe(0);
  });
});

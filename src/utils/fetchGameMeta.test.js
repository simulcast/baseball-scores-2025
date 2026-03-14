import { fetchGameMeta } from './fetchGameMeta';

// Mock normalizeGame to isolate fetchGameMeta logic
jest.mock('./normalizeGame', () => ({
  normalizeGame: jest.fn((raw) => ({
    gameId: String(raw.gamePk),
    status: raw.status?.abstractGameState ?? 'Preview',
    homeTeam: { name: raw.teams?.home?.team?.name ?? '' },
    awayTeam: { name: raw.teams?.away?.team?.name ?? '' },
  })),
}));

const mockGame = {
  gamePk: 748263,
  status: { abstractGameState: 'Live' },
  teams: {
    home: { team: { name: 'Boston Red Sox' } },
    away: { team: { name: 'New York Yankees' } },
  },
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('fetchGameMeta', () => {
  it('returns normalized game on successful API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dates: [{ games: [mockGame] }] }),
    });

    const result = await fetchGameMeta('748263');

    expect(result).toEqual({
      gameId: '748263',
      status: 'Live',
      homeTeam: { name: 'Boston Red Sox' },
      awayTeam: { name: 'New York Yankees' },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('gamePk=748263'),
      expect.objectContaining({ next: { revalidate: 30 } }),
    );
  });

  it('returns null when API returns error status', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchGameMeta('748263');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('MLB API returned 500'),
    );
  });

  it('returns null when API returns empty dates', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dates: [] }),
    });

    const result = await fetchGameMeta('748263');

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await fetchGameMeta('748263');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed for gamePk=748263'),
      'Network timeout',
    );
  });

  it('returns null when API returns malformed JSON', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    });

    const result = await fetchGameMeta('748263');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

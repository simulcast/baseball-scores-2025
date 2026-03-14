import { fetchGames } from './api';

const mockFetch = (body, ok = true, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
};

afterEach(() => {
  delete global.fetch;
});

describe('fetchGames', () => {
  it('returns games array on success', async () => {
    const games = [{ gamePk: 1 }, { gamePk: 2 }];
    mockFetch({ games });

    const result = await fetchGames();
    expect(result).toEqual(games);
  });

  it('returns empty array when response has no games field', async () => {
    mockFetch({});

    const result = await fetchGames();
    expect(result).toEqual([]);
  });

  it('throws on non-200 response', async () => {
    mockFetch({}, false, 500);

    await expect(fetchGames()).rejects.toThrow('API error: 500');
  });

  it('passes date parameter in query string', async () => {
    mockFetch({ games: [] });

    await fetchGames('2025-04-15');

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('date=2025-04-15');
  });

  it('always includes timezoneOffset in query string', async () => {
    mockFetch({ games: [] });

    await fetchGames();

    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('timezoneOffset=');
  });
});

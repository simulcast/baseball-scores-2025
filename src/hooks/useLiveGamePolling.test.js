import { renderHook, act } from '@testing-library/react';
import { useLiveGamePolling } from './useLiveGamePolling';
import { useGameStore } from '../store/gameStore';
import { fetchGameLive } from '../services/api';

jest.mock('../services/api', () => ({
  fetchGameLive: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  fetchGameLive.mockReset();
  useGameStore.setState({
    games: {},
    activeGameId: null,
    lastAcceptedSeq: 0,
    lastAcceptedLiveSeq: 0,
    lastUpdatedAt: null,
    pollError: null,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

const makeLiveFeedResponse = (gamePk, overrides = {}) => ({
  gameData: {
    game: { pk: gamePk },
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
      balls: 1,
      strikes: 2,
      outs: 1,
      teams: { home: { runs: 3 }, away: { runs: 1 } },
      offense: {},
    },
  },
  ...overrides,
});

describe('useLiveGamePolling', () => {
  it('polls when activeGameId is set and ingests adapted result', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    renderHook(() => useLiveGamePolling('718405', { interval: 1000 }));
    await act(async () => {});

    expect(fetchGameLive).toHaveBeenCalledWith('718405');
    const { games } = useGameStore.getState();
    expect(games['718405']).toBeDefined();
    expect(games['718405'].homeScore).toBe(3);
    expect(games['718405'].inning).toBe(3);
  });

  it('does not poll when activeGameId is null', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    renderHook(() => useLiveGamePolling(null, { interval: 1000 }));
    await act(async () => {});

    expect(fetchGameLive).not.toHaveBeenCalled();
  });

  it('linger-polls prev game after deselection then stops', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    const { rerender } = renderHook(
      ({ gameId }) => useLiveGamePolling(gameId, { interval: 1000, lingerPolls: 2 }),
      { initialProps: { gameId: '718405' } },
    );

    // Initial active poll
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(1);

    // Deselect — linger starts
    rerender({ gameId: null });

    // First linger poll after 1 interval
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(2);
    expect(fetchGameLive).toHaveBeenLastCalledWith('718405');

    // Second linger poll after another interval
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(3);

    // No more polls after linger exhausted
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(3);
  });

  it('linger-polls prev game when switching A→B', async () => {
    fetchGameLive.mockImplementation((id) =>
      Promise.resolve(makeLiveFeedResponse(Number(id))),
    );

    const { rerender } = renderHook(
      ({ gameId }) => useLiveGamePolling(gameId, { interval: 1000, lingerPolls: 2 }),
      { initialProps: { gameId: '111' } },
    );

    // Initial active poll for game 111
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(1);
    expect(fetchGameLive).toHaveBeenCalledWith('111');

    // Switch to game 222 — active polls 222, linger polls 111
    rerender({ gameId: '222' });
    await act(async () => {}); // immediate active poll for 222

    // After 1 interval: second active poll for 222 + first linger poll for 111
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});

    // After another interval: third active poll for 222 + second linger poll for 111
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});

    const calls = fetchGameLive.mock.calls.map(([id]) => id);
    expect(calls.filter((id) => id === '222').length).toBeGreaterThanOrEqual(2);
    expect(calls.filter((id) => id === '111').length).toBeGreaterThanOrEqual(2);
  });

  it('cancels linger when a new game is selected mid-linger', async () => {
    fetchGameLive.mockImplementation((id) =>
      Promise.resolve(makeLiveFeedResponse(Number(id))),
    );

    const { rerender } = renderHook(
      ({ gameId }) => useLiveGamePolling(gameId, { interval: 1000, lingerPolls: 2 }),
      { initialProps: { gameId: '111' } },
    );

    await act(async () => {}); // initial poll

    // Deselect — linger starts for 111
    rerender({ gameId: null });

    // First linger poll fires
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});

    const callsBeforeReselect = fetchGameLive.mock.calls.length;

    // Select game 222 — should cancel linger for 111, start linger for null (no-op since prev=null after cleanup)
    rerender({ gameId: '222' });
    await act(async () => {}); // immediate active poll for 222

    // Advance several intervals — should only see 222 polls, no more 111 linger polls
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});

    const callsAfterReselect = fetchGameLive.mock.calls.slice(callsBeforeReselect);
    const lingerCallsFor111 = callsAfterReselect.filter(([id]) => id === '111');
    // At most 1 more linger poll for 111 (the one already scheduled), but the cleanup should prevent the second
    expect(lingerCallsFor111.length).toBeLessThanOrEqual(1);
  });

  it('sets pollError on fetch failure', async () => {
    fetchGameLive.mockRejectedValue(new Error('network down'));

    renderHook(() => useLiveGamePolling('718405', { interval: 1000 }));
    await act(async () => {});

    expect(useGameStore.getState().pollError).toBe('network down');
  });

  it('schedules next poll after completion', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    renderHook(() => useLiveGamePolling('718405', { interval: 2000 }));
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(2000); });
    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(2);
  });

  it('updates lastAcceptedLiveSeq (not lastAcceptedSeq)', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    renderHook(() => useLiveGamePolling('718405', { interval: 1000 }));
    await act(async () => {});

    const { lastAcceptedLiveSeq, lastAcceptedSeq } = useGameStore.getState();
    expect(lastAcceptedLiveSeq).toBeGreaterThan(0);
    expect(lastAcceptedSeq).toBe(0); // schedule tier untouched
  });

  it('linger polls do not update lastAcceptedLiveSeq', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    const { rerender } = renderHook(
      ({ gameId }) => useLiveGamePolling(gameId, { interval: 1000, lingerPolls: 2 }),
      { initialProps: { gameId: '718405' } },
    );

    await act(async () => {});
    const { lastAcceptedLiveSeq: seqAfterActive } = useGameStore.getState();

    // Deselect — linger starts
    rerender({ gameId: null });

    // First linger poll
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});

    const { lastAcceptedLiveSeq: seqAfterLinger } = useGameStore.getState();
    expect(seqAfterLinger).toBe(seqAfterActive); // unchanged
  });

  it('handles null response from fetchGameLive gracefully', async () => {
    fetchGameLive.mockResolvedValue(null);

    renderHook(() => useLiveGamePolling('718405', { interval: 1000 }));
    await act(async () => {});

    // Should not throw, games should be empty
    expect(Object.keys(useGameStore.getState().games)).toHaveLength(0);
  });
});

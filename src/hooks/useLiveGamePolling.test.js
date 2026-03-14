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

  it('stops polling when activeGameId changes to null', async () => {
    fetchGameLive.mockResolvedValue(makeLiveFeedResponse(718405));

    const { rerender } = renderHook(
      ({ gameId }) => useLiveGamePolling(gameId, { interval: 1000 }),
      { initialProps: { gameId: '718405' } },
    );

    await act(async () => {});
    expect(fetchGameLive).toHaveBeenCalledTimes(1);

    rerender({ gameId: null });
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});

    expect(fetchGameLive).toHaveBeenCalledTimes(1);
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

  it('handles null response from fetchGameLive gracefully', async () => {
    fetchGameLive.mockResolvedValue(null);

    renderHook(() => useLiveGamePolling('718405', { interval: 1000 }));
    await act(async () => {});

    // Should not throw, games should be empty
    expect(Object.keys(useGameStore.getState().games)).toHaveLength(0);
  });
});

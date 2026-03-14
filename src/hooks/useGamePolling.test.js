import { renderHook, act } from '@testing-library/react';
import { useGamePolling } from './useGamePolling';
import { useGameStore } from '../store/gameStore';
import { fetchGames } from '../services/api';

jest.mock('../services/api', () => ({
  fetchGames: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  fetchGames.mockReset();
  useGameStore.setState({
    games: {},
    activeGameId: null,
    lastAcceptedSeq: 0,
    lastUpdatedAt: null,
    pollError: null,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

const makeRawGame = (gamePk) => ({
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
});

describe('useGamePolling', () => {
  it('calls ingestGames with fetched data on success', async () => {
    fetchGames.mockResolvedValue([makeRawGame(100)]);

    renderHook(() => useGamePolling({ interval: 5000 }));

    // Flush the initial poll's promise
    await act(async () => {});

    const { games } = useGameStore.getState();
    expect(games['100']).toBeDefined();
    expect(games['100'].gameId).toBe('100');
  });

  it('sets pollError on fetch failure', async () => {
    fetchGames.mockRejectedValue(new Error('network timeout'));

    renderHook(() => useGamePolling({ interval: 5000 }));

    await act(async () => {});

    expect(useGameStore.getState().pollError).toBe('network timeout');
  });

  it('does not set games on fetch failure', async () => {
    fetchGames.mockRejectedValue(new Error('network timeout'));

    renderHook(() => useGamePolling({ interval: 5000 }));

    await act(async () => {});

    expect(Object.keys(useGameStore.getState().games)).toHaveLength(0);
  });

  it('schedules next poll after completion', async () => {
    fetchGames.mockResolvedValue([makeRawGame(100)]);

    renderHook(() => useGamePolling({ interval: 5000 }));

    // First poll
    await act(async () => {});
    expect(fetchGames).toHaveBeenCalledTimes(1);

    // Advance past the interval to trigger second poll
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    // Need to flush the second poll's promise
    await act(async () => {});

    expect(fetchGames).toHaveBeenCalledTimes(2);
  });

  it('cleans up timer on unmount', async () => {
    fetchGames.mockResolvedValue([makeRawGame(100)]);

    const { unmount } = renderHook(() => useGamePolling({ interval: 5000 }));

    // First poll
    await act(async () => {});
    expect(fetchGames).toHaveBeenCalledTimes(1);

    // Unmount and advance time — should not trigger another poll
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(fetchGames).toHaveBeenCalledTimes(1);
  });

  it('passes a numeric seq to ingestGames', async () => {
    fetchGames.mockResolvedValue([makeRawGame(100)]);

    renderHook(() => useGamePolling({ interval: 5000 }));

    await act(async () => {});

    // lastAcceptedSeq should be a number > 0 (Date.now() based)
    const { lastAcceptedSeq } = useGameStore.getState();
    expect(typeof lastAcceptedSeq).toBe('number');
    expect(lastAcceptedSeq).toBeGreaterThan(0);
  });
});

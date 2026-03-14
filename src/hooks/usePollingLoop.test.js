import { renderHook, act } from '@testing-library/react';
import { usePollingLoop } from './usePollingLoop';
import { useGameStore } from '../store/gameStore';

beforeEach(() => {
  jest.useFakeTimers();
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

describe('usePollingLoop', () => {
  it('calls pollFn immediately on mount', async () => {
    const pollFn = jest.fn().mockResolvedValue();

    renderHook(() => usePollingLoop(pollFn, { interval: 5000 }));
    await act(async () => {});

    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('calls pollFn again after interval', async () => {
    const pollFn = jest.fn().mockResolvedValue();

    renderHook(() => usePollingLoop(pollFn, { interval: 3000 }));
    await act(async () => {});
    expect(pollFn).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(3000); });
    await act(async () => {});
    expect(pollFn).toHaveBeenCalledTimes(2);
  });

  it('does not poll when enabled is false', async () => {
    const pollFn = jest.fn().mockResolvedValue();

    renderHook(() => usePollingLoop(pollFn, { interval: 1000, enabled: false }));
    await act(async () => {});

    expect(pollFn).not.toHaveBeenCalled();
  });

  it('tears down when enabled changes to false', async () => {
    const pollFn = jest.fn().mockResolvedValue();

    const { rerender } = renderHook(
      ({ enabled }) => usePollingLoop(pollFn, { interval: 1000, enabled }),
      { initialProps: { enabled: true } },
    );

    await act(async () => {});
    expect(pollFn).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});

    // Should not have been called again after disabling
    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('starts polling when enabled changes to true', async () => {
    const pollFn = jest.fn().mockResolvedValue();

    const { rerender } = renderHook(
      ({ enabled }) => usePollingLoop(pollFn, { interval: 1000, enabled }),
      { initialProps: { enabled: false } },
    );

    await act(async () => {});
    expect(pollFn).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await act(async () => {});

    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('sets pollError on pollFn error', async () => {
    const pollFn = jest.fn().mockRejectedValue(new Error('boom'));

    renderHook(() => usePollingLoop(pollFn, { interval: 5000 }));
    await act(async () => {});

    expect(useGameStore.getState().pollError).toBe('boom');
  });

  it('cleans up timer on unmount', async () => {
    const pollFn = jest.fn().mockResolvedValue();

    const { unmount } = renderHook(() => usePollingLoop(pollFn, { interval: 1000 }));
    await act(async () => {});
    expect(pollFn).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});

    expect(pollFn).toHaveBeenCalledTimes(1);
  });

  it('always uses latest pollFn via ref (no restart on pollFn change)', async () => {
    const pollFn1 = jest.fn().mockResolvedValue();
    const pollFn2 = jest.fn().mockResolvedValue();

    const { rerender } = renderHook(
      ({ fn }) => usePollingLoop(fn, { interval: 1000 }),
      { initialProps: { fn: pollFn1 } },
    );

    await act(async () => {});
    expect(pollFn1).toHaveBeenCalledTimes(1);

    // Change pollFn — should NOT restart the loop (no extra immediate call)
    rerender({ fn: pollFn2 });

    // Advance to next tick — should call pollFn2, not pollFn1
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => {});

    expect(pollFn2).toHaveBeenCalledTimes(1);
    expect(pollFn1).toHaveBeenCalledTimes(1); // still only the initial call
  });
});

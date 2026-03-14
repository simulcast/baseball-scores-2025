import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Shared polling loop primitive. Calls pollFn immediately, then on interval.
 * Uses a ref for pollFn so callers don't need useCallback — the hook always
 * calls the latest function without restarting the effect.
 *
 * @param {() => Promise<void>} pollFn - Async function to call on each tick
 * @param {{ interval: number, enabled?: boolean }} options
 */
export function usePollingLoop(pollFn, { interval, enabled = true }) {
  const setPollError = useGameStore((s) => s.setPollError);
  const pollFnRef = useRef(pollFn);
  pollFnRef.current = pollFn;

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let timer;

    async function poll() {
      try {
        await pollFnRef.current();
      } catch (err) {
        console.error('[usePollingLoop]', err);
        if (mounted) setPollError(err.message);
      } finally {
        if (mounted) timer = setTimeout(poll, interval);
      }
    }

    poll();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [interval, enabled, setPollError]);
}

export default usePollingLoop;

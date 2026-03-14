import { useEffect, useRef } from 'react';
import { fetchGameLive } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { adaptLiveFeed } from '../utils/adaptLiveFeed';
import { usePollingLoop } from './usePollingLoop';

export function useLiveGamePolling(activeGameId, { interval = 1000, lingerPolls = 2 } = {}) {
  const ingestGame = useGameStore((s) => s.ingestGame);
  const prevGameIdRef = useRef(null);

  // Main polling — unchanged behavior
  usePollingLoop(() => {
    const seq = Date.now();
    return fetchGameLive(activeGameId).then((raw) => {
      const adapted = adaptLiveFeed(raw);
      if (adapted) ingestGame(adapted, seq);
    });
  }, { interval, enabled: !!activeGameId });

  // Linger polling — fire N more polls for the previous game after deselection
  useEffect(() => {
    const prevId = prevGameIdRef.current;
    prevGameIdRef.current = activeGameId;

    // Only linger if we had a previous game and it changed
    if (!prevId || prevId === activeGameId) return;

    let remaining = lingerPolls;
    let mounted = true;
    let timer;

    async function tick() {
      if (!mounted || remaining <= 0) return;
      remaining--;
      try {
        const raw = await fetchGameLive(prevId);
        const adapted = adaptLiveFeed(raw);
        if (adapted) ingestGame(adapted, undefined); // no seq — avoid lastAcceptedLiveSeq interference
      } catch (err) {
        console.error('[useLiveGamePolling] linger poll error:', err);
      }
      if (mounted && remaining > 0) {
        timer = setTimeout(tick, interval);
      }
    }

    timer = setTimeout(tick, interval); // first linger poll after one interval

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [activeGameId, interval, lingerPolls, ingestGame]);
}

export default useLiveGamePolling;

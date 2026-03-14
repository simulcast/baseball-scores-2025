import { useEffect, useRef } from 'react';
import { fetchGames } from '../services/api';
import { useGameStore } from '../store/gameStore';

export function useGamePolling({ interval = 5000 } = {}) {
  const ingestGames = useGameStore((s) => s.ingestGames);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let timer;
    let mounted = true;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const games = await fetchGames();
        if (mounted) ingestGames(games);
      } catch (err) {
        console.error('[useGamePolling]', err);
      } finally {
        inFlightRef.current = false;
      }
    }

    poll();
    timer = setInterval(poll, interval);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [interval, ingestGames]);
}

export default useGamePolling;

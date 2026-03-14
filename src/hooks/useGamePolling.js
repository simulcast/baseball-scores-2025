import { useEffect } from 'react';
import { fetchGames } from '../services/api';
import { useGameStore } from '../store/gameStore';

export function useGamePolling({ interval = 5000 } = {}) {
  const ingestGames = useGameStore((s) => s.ingestGames);
  const setPollError = useGameStore((s) => s.setPollError);

  useEffect(() => {
    let mounted = true;
    let timer;

    async function poll() {
      const seq = Date.now();
      try {
        const games = await fetchGames();
        if (mounted) ingestGames(games, seq);
      } catch (err) {
        console.error('[useGamePolling]', err);
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
  }, [interval, ingestGames, setPollError]);
}

export default useGamePolling;

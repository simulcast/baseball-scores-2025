import { fetchGames } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { usePollingLoop } from './usePollingLoop';

export function useGamePolling({ interval = 5000 } = {}) {
  const ingestGames = useGameStore((s) => s.ingestGames);

  usePollingLoop(() => {
    const seq = Date.now();
    return fetchGames().then((games) => ingestGames(games, seq));
  }, { interval });
}

export default useGamePolling;

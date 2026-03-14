import { fetchGameLive } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { adaptLiveFeed } from '../utils/adaptLiveFeed';
import { usePollingLoop } from './usePollingLoop';

export function useLiveGamePolling(activeGameId, { interval = 1000 } = {}) {
  const ingestGame = useGameStore((s) => s.ingestGame);

  usePollingLoop(() => {
    const seq = Date.now();
    return fetchGameLive(activeGameId).then((raw) => {
      const adapted = adaptLiveFeed(raw);
      if (adapted) ingestGame(adapted, seq);
    });
  }, { interval, enabled: !!activeGameId });
}

export default useLiveGamePolling;

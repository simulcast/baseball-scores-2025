import { useEffect, useRef, useCallback } from 'react';
import { getTodaysGames, getMultipleGameStates } from '../services/api';
import { useGameStore } from '../store/gameStore';

/**
 * Hook that polls the MLB API and updates the game store
 *
 * @param {Object} options Configuration options
 * @param {string} options.date Optional date in YYYY-MM-DD format
 * @param {number} options.interval Polling interval in ms (default 5000)
 * @param {boolean} options.enabled Whether polling is enabled (default true)
 * @returns {Object} Polling state and controls
 */
export function useGamePolling({
  date,
  interval = 5000,
  enabled = true,
} = {}) {
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);

  // Get store action
  const ingestApiResponse = useGameStore((state) => state.ingestApiResponse);

  /**
   * Fetch games and their states, then update the store
   */
  const fetchAndUpdate = useCallback(async () => {
    // Prevent overlapping requests
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      // 1. Fetch basic game data
      const games = await getTodaysGames(date);

      // Check if still mounted
      if (!isMountedRef.current) return;

      // 2. Extract IDs of all live games
      const liveGameIds = games
        .filter((game) => game.status?.abstractGameState === 'Live')
        .map((game) => game.gamePk);

      // 3. Fetch detailed states for live games
      let gameStates = {};
      if (liveGameIds.length > 0) {
        gameStates = await getMultipleGameStates(liveGameIds);
      }

      // Check if still mounted before updating store
      if (!isMountedRef.current) return;

      // 4. Update the store
      ingestApiResponse(games, gameStates);
    } catch (error) {
      console.error('[useGamePolling] Error fetching games:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [date, ingestApiResponse]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Do an immediate fetch
    fetchAndUpdate();

    // Set up interval
    intervalRef.current = setInterval(fetchAndUpdate, interval);
  }, [fetchAndUpdate, interval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    fetchAndUpdate();
  }, [fetchAndUpdate]);

  // Set up polling on mount / when enabled changes
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Update interval if it changes
  useEffect(() => {
    if (enabled && intervalRef.current) {
      // Restart with new interval
      stopPolling();
      startPolling();
    }
  }, [interval, enabled, startPolling, stopPolling]);

  return {
    refresh,
    startPolling,
    stopPolling,
    isPolling: !!intervalRef.current,
  };
}

export default useGamePolling;

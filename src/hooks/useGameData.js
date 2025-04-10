import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodaysGames, getGameState } from '../services/api';

/**
 * Custom hook for fetching and managing game data
 * @param {Object} options Options for the hook
 * @param {string} options.date Optional date in YYYY-MM-DD format
 * @param {number} options.gamePk Optional game ID to fetch details for
 * @param {number} options.refreshInterval Interval in ms to refresh data
 * @returns {Object} Game data and loading state
 */
const useGameData = ({ date, gamePk, refreshInterval = 5000 }) => {
  // State for all games
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState(null);

  // State for a specific game
  const [gameState, setGameState] = useState(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState(null);
  
  // Interval IDs for cleanup
  const gamesIntervalRef = useRef(null);
  const gameIntervalRef = useRef(null);
  
  // Game events state
  const [gameEvents, setGameEvents] = useState([]);
  const previousGameStateRef = useRef(null);

  /**
   * Fetch all games for today or specified date
   */
  const fetchGames = useCallback(async () => {
    try {
      setGamesError(null);
      const data = await getTodaysGames(date);
      setGames(data);
    } catch (error) {
      setGamesError('Failed to fetch games');
      console.error('Error fetching games:', error);
    } finally {
      setGamesLoading(false);
    }
  }, [date]);

  /**
   * Fetch detailed game state for a specific game
   */
  const fetchGameState = useCallback(async () => {
    if (!gamePk) return;
    
    try {
      setGameError(null);
      setGameLoading(true);
      
      const data = await getGameState(gamePk);
      setGameState(data);
      
      // Game events detection could go here if needed
    } catch (error) {
      setGameError('Failed to fetch game details');
      console.error('Error fetching game details:', error);
    } finally {
      setGameLoading(false);
    }
  }, [gamePk]);

  // Initial fetch and set up refresh interval for games
  useEffect(() => {
    fetchGames();
    
    // Set up refresh interval
    gamesIntervalRef.current = setInterval(fetchGames, refreshInterval);
    
    // Clean up interval on unmount
    return () => {
      if (gamesIntervalRef.current) {
        clearInterval(gamesIntervalRef.current);
      }
    };
  }, [fetchGames, refreshInterval]);

  // Fetch specific game data if gamePk is provided
  useEffect(() => {
    if (gamePk) {
      fetchGameState();
      
      // Set up refresh interval for game state
      // Use the same interval as games list for synchronization
      gameIntervalRef.current = setInterval(fetchGameState, refreshInterval);
      
      // Clean up interval on unmount
      return () => {
        if (gameIntervalRef.current) {
          clearInterval(gameIntervalRef.current);
        }
      };
    }
  }, [gamePk, fetchGameState, refreshInterval]);

  // Acknowledge game event (can be called by components)
  const acknowledgeEvent = useCallback((eventId) => {
    setGameEvents(current => current.filter(event => event.id !== eventId));
  }, []);

  return {
    games,
    gamesLoading,
    gamesError,
    gameState,
    gameLoading,
    gameError,
    gameEvents,
    acknowledgeEvent,
    refreshGames: fetchGames,
    refreshGameState: fetchGameState
  };
};

export default useGameData;
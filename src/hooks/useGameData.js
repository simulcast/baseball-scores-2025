import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodaysGames, getGameState, detectGameStateChanges } from '../services/api';

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
  
  // State for detected events
  const [gameEvents, setGameEvents] = useState([]);
  
  // Ref to store previous game state for change detection
  const previousGameStateRef = useRef(null);
  
  // Interval IDs for cleanup
  const gamesIntervalRef = useRef(null);
  const gameIntervalRef = useRef(null);

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
      
      // Store the previous state for change detection
      previousGameStateRef.current = gameState;
      
      // Update the game state
      setGameState(data);
      
      // Detect changes if we have a previous state
      if (previousGameStateRef.current) {
        const { hasChanges, events } = detectGameStateChanges(
          previousGameStateRef.current,
          data
        );
        
        if (hasChanges && events.length > 0) {
          // Add new events to the queue
          setGameEvents(prevEvents => [...prevEvents, ...events]);
        }
      }
    } catch (error) {
      setGameError('Failed to fetch game details');
      console.error('Error fetching game details:', error);
    } finally {
      setGameLoading(false);
    }
  }, [gamePk, gameState]);

  /**
   * Acknowledge and remove an event from the queue
   */
  const acknowledgeEvent = useCallback((eventIndex) => {
    setGameEvents(prevEvents => 
      prevEvents.filter((_, index) => index !== eventIndex)
    );
  }, []);

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
      gameIntervalRef.current = setInterval(fetchGameState, refreshInterval / 2);
      
      // Clean up interval on unmount
      return () => {
        if (gameIntervalRef.current) {
          clearInterval(gameIntervalRef.current);
        }
      };
    }
  }, [gamePk, fetchGameState, refreshInterval]);

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
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
  
  // State for game events
  const [gameEvents, setGameEvents] = useState([]);
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
      
      // If we have detailed game state, update the corresponding game in the list
      if (gamePk && gameState) {
        const updatedGames = data.map(game => {
          if (String(game.gamePk) === String(gamePk) && game.status.abstractGameState === 'Live') {
            // Create a consistent game object that combines API data with our processed gameState
            return {
              ...game,
              // Add or update linescore properties with more accurate data from gameState
              linescore: {
                ...game.linescore,
                balls: gameState.balls,
                strikes: gameState.strikes,
                outs: gameState.outs,
                currentInning: gameState.inning,
                isTopInning: gameState.isTopInning,
                // Update runners on base
                offense: {
                  first: gameState.runners[0] ? { id: 1 } : undefined,
                  second: gameState.runners[1] ? { id: 1 } : undefined,
                  third: gameState.runners[2] ? { id: 1 } : undefined
                }
              },
              // Update teams scores
              teams: {
                ...game.teams,
                home: {
                  ...game.teams.home,
                  score: gameState.homeScore
                },
                away: {
                  ...game.teams.away,
                  score: gameState.awayScore
                }
              }
            };
          }
          return game;
        });
        setGames(updatedGames);
      } else {
        setGames(data);
      }
    } catch (error) {
      setGamesError('Failed to fetch games');
      console.error('Error fetching games:', error);
    } finally {
      setGamesLoading(false);
    }
  }, [date, gamePk, gameState]);

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
      
      // Check for events by comparing with previous state
      if (previousGameStateRef.current) {
        detectGameEvents(previousGameStateRef.current, data);
      }
      
      // Update reference for next comparison
      previousGameStateRef.current = data;
      
    } catch (error) {
      setGameError('Failed to fetch game details');
      console.error('Error fetching game details:', error);
    } finally {
      setGameLoading(false);
    }
  }, [gamePk]);

  /**
   * Detect game events by comparing previous and current state
   */
  const detectGameEvents = useCallback((prevState, currentState) => {
    if (!prevState || !currentState) return;
    
    const newEvents = [];
    
    // Detect scoring plays
    if (currentState.homeScore > prevState.homeScore) {
      newEvents.push({ 
        id: `run-home-${Date.now()}`,
        type: 'runScored', 
        team: 'home',
        timestamp: Date.now(),
        acknowledged: false 
      });
    }
    
    if (currentState.awayScore > prevState.awayScore) {
      newEvents.push({ 
        id: `run-away-${Date.now()}`,
        type: 'runScored', 
        team: 'away',
        timestamp: Date.now(),
        acknowledged: false
      });
    }
    
    // Add more event detection here as needed...
    
    if (newEvents.length > 0) {
      setGameEvents(prev => [...prev, ...newEvents]);
    }
  }, []);

  /**
   * Mark an event as acknowledged
   */
  const acknowledgeEvent = useCallback((eventId) => {
    setGameEvents(prev => 
      prev.map(event => 
        event.id === eventId 
          ? { ...event, acknowledged: true } 
          : event
      )
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
      // Use the same refresh interval to keep everything in sync
      gameIntervalRef.current = setInterval(fetchGameState, refreshInterval);
      
      // Clean up interval on unmount
      return () => {
        if (gameIntervalRef.current) {
          clearInterval(gameIntervalRef.current);
        }
      };
    } else {
      // Reset game state when no game is selected
      setGameState(null);
      previousGameStateRef.current = null;
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
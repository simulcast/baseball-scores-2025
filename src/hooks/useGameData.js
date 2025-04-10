import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodaysGames, getGameState } from '../services/api';

/**
 * Custom hook for fetching and managing game data
 * @param {Object} options Options for the hook
 * @param {string} options.date Optional date in YYYY-MM-DD format
 * @param {number} options.gamePk Optional game ID to fetch details for
 * @param {number} options.refreshInterval Interval in ms to refresh data
 * @param {boolean} options.refreshAllGames If true, all games will refresh at the same rate as the selected game
 * @returns {Object} Game data and loading state
 */
const useGameData = ({ date, gamePk, refreshInterval = 5000, refreshAllGames = false }) => {
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
            // Check if it's between innings (End or Middle inning state)
            const inningState = game.linescore?.inningState || '';
            const isBetweenInnings = inningState.startsWith('End') || inningState.startsWith('Middle');
            
            // Override count data if between innings
            const balls = isBetweenInnings ? 0 : gameState.balls;
            const strikes = isBetweenInnings ? 0 : gameState.strikes;
            const outs = isBetweenInnings ? 0 : gameState.outs;
            
            // Clear runners if between innings
            const runnersOnBase = isBetweenInnings 
              ? [false, false, false] 
              : gameState.runners;
            
            // Create a consistent game object that combines API data with our processed gameState
            return {
              ...game,
              // Add or update linescore properties with more accurate data from gameState
              linescore: {
                ...game.linescore,
                balls,
                strikes,
                outs,
                currentInning: gameState.inning,
                isTopInning: gameState.isTopInning,
                // Update runners on base
                offense: {
                  first: runnersOnBase[0] ? { id: 1 } : undefined,
                  second: runnersOnBase[1] ? { id: 1 } : undefined,
                  third: runnersOnBase[2] ? { id: 1 } : undefined
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
      
      // Ensure the data is valid before setting
      if (data) {
        // Log the runners data for debugging
        console.log('Received game state with runners:', data.runners);
        
        // IMPORTANT: Make sure we don't lose runner data between API calls
        // If data comes back with empty runners but we had runners before, preserve them
        if (previousGameStateRef.current && 
            Array.isArray(data.runners) && 
            !data.runners.some(Boolean) && 
            Array.isArray(previousGameStateRef.current.runners) && 
            previousGameStateRef.current.runners.some(Boolean)) {
          
          console.log('WARNING: New data has empty runners but previous had runners. Preserving previous runner data.');
          data.runners = [...previousGameStateRef.current.runners];
        }
        
        // Store the original data
        setGameState(data);
        
        // Check for events by comparing with previous state
        if (previousGameStateRef.current) {
          detectGameEvents(previousGameStateRef.current, data);
        }
        
        // Update reference for next comparison
        previousGameStateRef.current = data;
        
        // Trigger a refresh of games to update the cards with the new data
        fetchGames();
      }
      
    } catch (error) {
      setGameError('Failed to fetch game details');
      console.error('Error fetching game details:', error);
    } finally {
      setGameLoading(false);
    }
  }, [gamePk, fetchGames]);

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
    // If refreshAllGames is true, use the same fast interval as the game details
    const interval = refreshAllGames ? Math.min(refreshInterval, 200) : refreshInterval;
    
    console.log(`Setting up games refresh interval: ${interval}ms (refreshAllGames=${refreshAllGames})`);
    gamesIntervalRef.current = setInterval(fetchGames, interval);
    
    // Clean up interval on unmount
    return () => {
      if (gamesIntervalRef.current) {
        clearInterval(gamesIntervalRef.current);
      }
    };
  }, [fetchGames, refreshInterval, refreshAllGames]);

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
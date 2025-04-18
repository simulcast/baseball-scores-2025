import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodaysGames, getMultipleGameStates } from '../services/api';

/**
 * Custom hook for fetching and managing game data
 * @param {Object} options Options for the hook
 * @param {string} options.date Optional date in YYYY-MM-DD format
 * @param {number} options.refreshInterval Interval in ms to refresh data
 * @returns {Object} Game data and loading state
 */
const useGameData = ({ date, refreshInterval = 5000 }) => {
  // State for all games and game states
  const [games, setGames] = useState([]);
  const [gameStates, setGameStates] = useState({});
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState(null);
  
  // State for game events
  const [gameEvents, setGameEvents] = useState([]);
  const previousGameStatesRef = useRef({});
  
  // Interval ID for cleanup
  const refreshIntervalRef = useRef(null);

  /**
   * Fetch all games and their detailed states
   */
  const fetchGamesAndStates = useCallback(async () => {
    try {
      setGamesError(null);
      
      // 1. Fetch basic game data first
      const gamesData = await getTodaysGames(date);
      
      // 2. Extract IDs of all live games
      const liveGameIds = gamesData
        .filter(game => game.status.abstractGameState === 'Live')
        .map(game => game.gamePk);
      
      // Store basic game data
      setGames(gamesData);
      
      // 4. If we have live games, fetch their detailed states
      if (liveGameIds.length > 0) {
        const statesData = await getMultipleGameStates(liveGameIds);
        
        // 5. Merge with any previous states to preserve data
        const mergedStates = { ...gameStates };
        
        // Process each game state
        Object.entries(statesData).forEach(([id, newState]) => {
          const prevState = gameStates[id];
          
          // If previous state had runners but new state doesn't, preserve them
          if (prevState && 
              Array.isArray(prevState.runners) && prevState.runners.some(Boolean) &&
              Array.isArray(newState.runners) && !newState.runners.some(Boolean)) {
            newState.runners = [...prevState.runners];
          }
          
          // Detect events by comparing with previous state
          if (prevState) {
            const events = detectGameEvents(prevState, newState, id);
            if (events.length > 0) {
              setGameEvents(prev => [...prev, ...events]);
            }
          }
          
          // Update the merged states
          mergedStates[id] = newState;
        });
        
        // 6. Update game states and reference
        setGameStates(mergedStates);
        previousGameStatesRef.current = { ...mergedStates };
      }
      
      setGamesLoading(false);
    } catch (error) {
      setGamesError('Failed to fetch games');
      console.error('Error fetching games and states:', error);
      setGamesLoading(false);
    }
  }, [date, gameStates]);

  /**
   * Detect game events by comparing previous and current state
   */
  const detectGameEvents = useCallback((prevState, currentState, gameId) => {
    if (!prevState || !currentState) return [];
    
    const events = [];
    
    // Detect scoring plays
    if (currentState.homeScore > prevState.homeScore) {
      events.push({ 
        id: `run-home-${gameId}-${Date.now()}`,
        gameId,
        type: 'runScored', 
        team: 'home',
        timestamp: Date.now(),
        acknowledged: false 
      });
    }
    
    if (currentState.awayScore > prevState.awayScore) {
      events.push({ 
        id: `run-away-${gameId}-${Date.now()}`,
        gameId,
        type: 'runScored', 
        team: 'away',
        timestamp: Date.now(),
        acknowledged: false
      });
    }
    
    // Add more event detection as needed...
    
    return events;
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

  // Set up refresh interval on mount
  useEffect(() => {
    fetchGamesAndStates();
    
    refreshIntervalRef.current = setInterval(fetchGamesAndStates, refreshInterval);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchGamesAndStates, refreshInterval]);

  // Get events for a specific game
  const getGameEvents = useCallback((gameId) => {
    if (!gameId) return [];
    return gameEvents.filter(event => 
      event.gameId === String(gameId) && !event.acknowledged
    );
  }, [gameEvents]);

  // Get state for a specific game
  const getGameState = useCallback((gameId) => {
    if (!gameId) return null;
    return gameStates[gameId] || null;
  }, [gameStates]);

  return {
    games,
    gameStates,
    getGameState,
    gamesLoading,
    gamesError,
    gameEvents,
    getGameEvents,
    acknowledgeEvent,
    refreshData: fetchGamesAndStates
  };
};

export default useGameData;
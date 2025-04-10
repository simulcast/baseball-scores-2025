import { useContext, useEffect, useCallback } from 'react';
import { AudioContext } from '../contexts/AudioContextExtended';

/**
 * Custom hook for using baseball audio in components
 * 
 * @param {Object} options - Hook options
 * @param {string} options.gameId - ID of the currently selected game
 * @param {Object} options.gameState - Current game state
 * @param {Array} options.gameEvents - List of game events
 * @returns {Object} - Baseball audio controls and state
 */
export const useBaseballAudio = ({ gameId, gameState, gameEvents }) => {
  const { 
    audioEnabled,
    audioInitialized,
    baseballAudioInitialized,
    activeGameId,
    setActiveGame,
    updateGameState,
    initializeBaseballAudio
  } = useContext(AudioContext);

  // Initialize baseball audio when needed
  const initAudio = useCallback(async () => {
    if (!baseballAudioInitialized) {
      await initializeBaseballAudio();
    }
  }, [baseballAudioInitialized, initializeBaseballAudio]);

  // Set active game when gameId changes
  useEffect(() => {
    if (gameId !== activeGameId && audioInitialized) {
      setActiveGame(gameId);
    }
  }, [gameId, activeGameId, audioInitialized, setActiveGame]);

  // Update game state when it changes
  useEffect(() => {
    if (gameState && activeGameId && baseballAudioInitialized) {
      updateGameState(gameState);
    }
  }, [gameState, activeGameId, baseballAudioInitialized, updateGameState]);
  
  // Handle game events - we don't need to process these here since
  // the GameStateInterpreter will detect events from game state changes
  
  return {
    isActive: gameId === activeGameId,
    isAudioEnabled: audioEnabled,
    isAudioInitialized: audioInitialized,
    isBaseballAudioInitialized: baseballAudioInitialized,
    initializeAudio: initAudio
  };
};

export default useBaseballAudio;
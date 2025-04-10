import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import BaseballAudioEngine from '../audio/BaseballAudioEngine';
import { createAmbienceNoise } from '../audio/generators/AmbienceGenerator';

export const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  // State from your existing AudioContext
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // New baseball audio engine state
  const [baseballAudioInitialized, setBaseballAudioInitialized] = useState(false);
  const [activeGameId, setActiveGameId] = useState(null);
  
  // Refs
  const ambienceRef = useRef(null);
  const baseballAudioEngineRef = useRef(null);
  
  // Initialize audio context with user interaction (existing functionality)
  const initializeAudio = useCallback(async () => {
    if (audioInitialized) return;
    
    try {
      // This will only succeed after user interaction
      await Tone.start();
      console.log('Audio context started successfully');
      
      // Now we can initialize our audio components
      Tone.Transport.start();
      
      // Create ambient noise (will implement in AmbienceGenerator.js)
      const noise = createAmbienceNoise();
      ambienceRef.current = noise;
      
      // Don't start it yet, just prepare it
      setAudioInitialized(true);
      
      // Now we can enable audio
      setAudioEnabled(true);
      
      // Start the noise
      noise.start();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }, [audioInitialized]);

  // Initialize baseball audio engine
  const initializeBaseballAudio = useCallback(async () => {
    if (baseballAudioInitialized) return true;
    
    if (!audioInitialized) {
      const success = await initializeAudio();
      if (!success) return false;
    }
    
    try {
      // Create the baseball audio engine
      const baseballEngine = new BaseballAudioEngine();
      await baseballEngine.initialize();
      
      baseballAudioEngineRef.current = baseballEngine;
      setBaseballAudioInitialized(true);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize baseball audio engine:', error);
      return false;
    }
  }, [baseballAudioInitialized, audioInitialized, initializeAudio]);

  // Toggle audio on/off (existing functionality)
  const toggleAudio = useCallback(() => {
    if (!audioInitialized) {
      // First click - initialize audio
      initializeAudio();
    } else {
      // Subsequent clicks - toggle audio state
      setAudioEnabled(prev => !prev);
      
      // Here we'd handle starting/stopping the audio
      if (!audioEnabled) {
        // Audio was off, turn it on
        Tone.Transport.start();
        if (ambienceRef.current) {
          ambienceRef.current.start();
        }
        
        // Start baseball audio if a game is active
        if (activeGameId && baseballAudioEngineRef.current) {
          baseballAudioEngineRef.current.start();
        }
      } else {
        // Audio was on, turn it off
        if (ambienceRef.current) {
          ambienceRef.current.stop();
        }
        
        // Stop baseball audio
        if (baseballAudioEngineRef.current) {
          baseballAudioEngineRef.current.stop();
        }
        
        // Stop transport last
        Tone.Transport.stop();
      }
    }
  }, [audioInitialized, audioEnabled, activeGameId, initializeAudio]);

  // Update master volume (existing functionality)
  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioInitialized) {
      Tone.Destination.volume.value = Tone.gainToDb(newVolume);
    }
  }, [audioInitialized]);

  // NEW: Set active game
  const setActiveGame = useCallback(async (gameId) => {
    // Skip if same game is already active
    if (gameId === activeGameId) return;
    
    // If we're selecting a new game
    if (gameId) {
      // First initialize audio context if needed
      if (!audioInitialized) {
        const success = await initializeAudio();
        if (!success) return;
      }
      
      // Then initialize baseball audio if needed
      if (!baseballAudioInitialized) {
        const success = await initializeBaseballAudio();
        if (!success) return;
      }
      
      setActiveGameId(gameId);
      
      // Start the audio if audio is enabled
      if (audioEnabled && baseballAudioEngineRef.current) {
        baseballAudioEngineRef.current.start();
      }
    } 
    // If we're deselecting a game
    else {
      setActiveGameId(null);
      
      // Stop the baseball audio
      if (baseballAudioEngineRef.current) {
        baseballAudioEngineRef.current.stop();
      }
    }
  }, [activeGameId, audioEnabled, audioInitialized, baseballAudioInitialized, initializeAudio, initializeBaseballAudio]);

  // NEW: Update game state
  const updateGameState = useCallback((gameState) => {
    if (!baseballAudioInitialized || !gameState || !activeGameId) return;
    
    // Update the baseball audio engine with the new game state
    if (baseballAudioEngineRef.current) {
      baseballAudioEngineRef.current.updateGameState(gameState);
    }
  }, [activeGameId, baseballAudioInitialized]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (ambienceRef.current) {
        ambienceRef.current.dispose();
      }
      
      if (baseballAudioEngineRef.current) {
        baseballAudioEngineRef.current.dispose();
      }
    };
  }, []);

  const value = {
    // Existing audio context values
    audioEnabled,
    audioInitialized,
    volume,
    setVolume: updateVolume,
    toggleAudio,
    initializeAudio,
    
    // New baseball audio values
    baseballAudioInitialized,
    activeGameId,
    setActiveGame,
    updateGameState,
    initializeBaseballAudio
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
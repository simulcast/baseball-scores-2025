import React, { createContext, useState, useCallback } from 'react';
import * as Tone from 'tone';

export const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // Initialize audio context with user interaction
  const initializeAudio = useCallback(async () => {
    if (audioInitialized) return;
    
    try {
      // This will only succeed after user interaction
      await Tone.start();
      console.log('Audio context started successfully');
      
      // Now we can initialize our audio components
      Tone.Transport.start();
      
      // Create ambient noise (will implement in AmbienceGenerator.js)
      const noise = new Tone.Noise('pink').toDestination();
      noise.volume.value = -20; // Set initial volume low
      
      // Don't start it yet, just prepare it
      setAudioInitialized(true);
      
      // Now we can enable audio
      setAudioEnabled(true);
      
      // Start the noise
      noise.start();
      
      return noise; // Return for cleanup
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return null;
    }
  }, [audioInitialized]);

  // Toggle audio on/off
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
      } else {
        // Audio was on, turn it off
        Tone.Transport.stop();
      }
    }
  }, [audioInitialized, audioEnabled, initializeAudio]);

  // Update master volume
  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioInitialized) {
      Tone.Destination.volume.value = Tone.gainToDb(newVolume);
    }
  }, [audioInitialized]);

  const value = {
    audioEnabled,
    audioInitialized,
    volume,
    setVolume: updateVolume,
    toggleAudio,
    initializeAudio
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
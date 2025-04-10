/**
 * BaseballAudioEngine
 * 
 * Core audio engine that connects game state to music generation.
 * Handles audio synthesis, sequencing, and event playback.
 */

import * as Tone from 'tone';
import { createEuclideanSequence } from './EuclideanSequencer';
import musicConfig from './musicConfig';
import GameStateInterpreter from './GameStateInterpreter';

class BaseballAudioEngine {
  constructor() {
    this.initialized = false;
    this.playing = false;
    this.gameInterpreter = new GameStateInterpreter();
    
    // Audio components
    this.instruments = {};
    this.sequences = {};
    this.masterEffects = {};
    this.eventPlayers = {};
    
    // Game state
    this.currentGameState = null;
    this.currentMusicParams = null;
    
    // Create debounced update method
    this.debouncedUpdateTempo = this._debounce(this._updateTempo.bind(this), 250);
  }
  
  /**
   * Initialize the audio engine (must be called after user interaction)
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Start audio context
      await Tone.start();
      
      // Set up master effects
      this._setupMasterEffects();
      
      // Create instruments
      this._createInstruments();
      
      // Create event players
      this._createEventPlayers();
      
      this.initialized = true;
      console.log("Baseball Audio Engine initialized");
      
      return true;
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
      return false;
    }
  }
  
  /**
   * Start playing audio based on current game state
   */
  async start() {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) return false;
    }
    
    Tone.Transport.start();
    this.playing = true;
    return true;
  }
  
  /**
   * Stop all audio
   */
  stop() {
    if (!this.initialized) return;
    
    // Stop all sequences
    Object.values(this.sequences).forEach(sequence => {
      if (sequence && sequence.sequence) {
        sequence.sequence.stop();
      }
    });
    
    // Stop transport
    Tone.Transport.stop();
    this.playing = false;
  }
  
  /**
   * Update audio based on game state
   * @param {Object} gameState - Current game state from MLB API
   */
  updateGameState(gameState) {
    if (!this.initialized || !gameState) return;
    
    this.currentGameState = gameState;
    
    // Interpret game state to get musical parameters
    const musicParams = this.gameInterpreter.interpret(gameState);
    this.currentMusicParams = musicParams;
    
    // Update audio components based on musical parameters
    this._updateRhythms(musicParams.rhythm);
    this._updateTonality(musicParams.tonality);
    this.debouncedUpdateTempo(musicParams.tempo);
    
    // Trigger any events
    this._triggerEvents(musicParams.events);
  }
  
  /**
   * Set up master effects chain
   */
  _setupMasterEffects() {
    const { master } = musicConfig;
    
    // Set master volume
    Tone.Destination.volume.value = master.volume;
    
    // Create master limiter
    if (master.effects.limiter.enabled) {
      this.masterEffects.limiter = new Tone.Limiter(master.effects.limiter.threshold);
      this.masterEffects.limiter.toDestination();
    }
    
    // Create master reverb
    if (master.effects.reverb.enabled) {
      this.masterEffects.reverb = new Tone.Reverb({
        decay: master.effects.reverb.decay,
        preDelay: master.effects.reverb.preDelay,
        wet: master.effects.reverb.wet
      });
      
      // Connect effects chain
      if (this.masterEffects.limiter) {
        this.masterEffects.reverb.connect(this.masterEffects.limiter);
      } else {
        this.masterEffects.reverb.toDestination();
      }
    }
  }
  
  /**
   * Create instruments for each element
   */
  _createInstruments() {
    const { instruments } = musicConfig;
    
    // Create destination node based on effects chain
    const destination = this.masterEffects.reverb || 
                       this.masterEffects.limiter || 
                       Tone.Destination;
    
    // Create synths for each instrument type
    Object.entries(instruments).forEach(([name, config]) => {
      // Create synth
      const synth = new Tone.Synth({
        oscillator: config.oscillator,
        envelope: config.envelope
      });
      
      // Create filter if specified
      let output = synth;
      if (config.filter) {
        const filter = new Tone.Filter({
          type: config.filter.type,
          frequency: config.filter.frequency,
          Q: config.filter.Q
        });
        synth.connect(filter);
        output = filter;
      }
      
      // Connect to destination
      output.connect(destination);
      
      // Store the instrument
      this.instruments[name] = {
        synth,
        output
      };
    });
  }
  
  /**
   * Create players for event sounds
   */
  _createEventPlayers() {
    const { events } = musicConfig;
    
    // Create destination node based on effects chain
    const destination = this.masterEffects.reverb || 
                       this.masterEffects.limiter || 
                       Tone.Destination;
    
    // Create players for each event type
    Object.entries(events).forEach(([eventName, config]) => {
      // Create synth for this event
      const eventSynth = new Tone.Synth({
        oscillator: config.instrument.oscillator,
        envelope: config.instrument.envelope
      });
      
      // Create effects chain if specified
      let output = eventSynth;
      
      if (config.effects) {
        // Create delay if specified
        if (config.effects.delay) {
          const delay = new Tone.FeedbackDelay({
            delayTime: config.effects.delay.time,
            feedback: config.effects.delay.feedback,
            wet: config.effects.delay.wet
          });
          eventSynth.connect(delay);
          output = delay;
        }
        
        // Create distortion if specified
        if (config.effects.distortion) {
          const distortion = new Tone.Distortion({
            distortion: config.effects.distortion.amount,
            wet: config.effects.distortion.wet
          });
          output.connect(distortion);
          output = distortion;
        }
        
        // Create filter if specified
        if (config.effects.filter) {
          const filter = new Tone.Filter({
            type: config.effects.filter.type,
            frequency: config.effects.filter.frequency,
            Q: config.effects.filter.Q
          });
          output.connect(filter);
          output = filter;
        }
      }
      
      // Connect to destination
      output.connect(destination);
      
      // Store the event player
      this.eventPlayers[eventName] = {
        synth: eventSynth,
        output,
        config
      };
    });
  }
  
  /**
   * Update rhythm sequencers based on game state
   */
  _updateRhythms(rhythmParams) {
    // For each rhythm parameter, update or create the corresponding sequence
    Object.entries(rhythmParams).forEach(([name, params]) => {
      const instrument = this.instruments[name];
      if (!instrument) return;
      
      // Set up callback function for the sequence
      const callback = (time, index) => {
        // Get the scale from current tonality
        const scale = this.currentMusicParams?.tonality?.scale || musicConfig.scales.homeTeamLeading;
        
        // Choose a note from the scale based on the step index
        // For different rhythmic elements, use different parts of the scale
        let scaleOffset = 0;
        switch (name) {
          case 'balls': scaleOffset = 0; break;
          case 'strikes': scaleOffset = 2; break;
          case 'outs': scaleOffset = 4; break;
          case 'runners': scaleOffset = 1; break;
          case 'inning': scaleOffset = 3; break;
        }
        
        // Pick a note from the scale
        const noteIndex = (index + scaleOffset) % scale.length;
        const note = scale[noteIndex];
        
        // Trigger the note
        instrument.synth.triggerAttackRelease(note, params.subdivision, time);
      };
      
      // Create or update the sequence
      if (this.sequences[name]) {
        // Stop the existing sequence
        this.sequences[name].sequence.stop();
        
        // Create a new sequence with updated parameters
        this.sequences[name] = createEuclideanSequence(Tone, {
          steps: params.steps,
          pulses: params.pulses,
          rotation: params.rotation,
          callback,
          subdivision: params.subdivision
        });
        
        // Set volume
        if (params.volume && instrument.output.volume) {
          instrument.output.volume.value = params.volume;
        }
        
        // Start the sequence if playing
        if (this.playing) {
          this.sequences[name].sequence.start(0);
        }
      } else {
        // Create a new sequence
        this.sequences[name] = createEuclideanSequence(Tone, {
          steps: params.steps,
          pulses: params.pulses,
          rotation: params.rotation,
          callback,
          subdivision: params.subdivision
        });
        
        // Set volume
        if (params.volume && instrument.output.volume) {
          instrument.output.volume.value = params.volume;
        }
        
        // Start the sequence if playing
        if (this.playing) {
          this.sequences[name].sequence.start(0);
        }
      }
    });
  }
  
  /**
   * Update tonality based on game state
   */
  _updateTonality(tonalityParams) {
    // Tonality is applied in the rhythm callbacks
    // No further action needed here as the scale will be used when notes are triggered
  }
  
  /**
   * Update tempo based on game state
   */
  _updateTempo(tempoParams) {
    Tone.Transport.bpm.value = tempoParams.bpm;
  }
  
  /**
   * Trigger event sounds based on detected events
   */
  _triggerEvents(events) {
    if (!events || events.length === 0) return;
    
    events.forEach(event => {
      const eventPlayer = this.eventPlayers[event.type];
      if (!eventPlayer) return;
      
      const { config, synth } = eventPlayer;
      const { notes } = config;
      
      // Play each note in the sequence with slight delays
      notes.forEach((note, index) => {
        synth.triggerAttackRelease(
          note, 
          "8n", 
          Tone.now() + (index * 0.15)
        );
      });
    });
  }
  
  /**
   * Simple debounce function
   */
  _debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  /**
   * Clean up audio resources
   */
  dispose() {
    // Stop all sequences
    Object.values(this.sequences).forEach(sequence => {
      if (sequence && sequence.sequence) {
        sequence.sequence.dispose();
      }
    });
    
    // Dispose of instruments
    Object.values(this.instruments).forEach(instrument => {
      if (instrument.synth) instrument.synth.dispose();
      if (instrument.output && instrument.output !== instrument.synth) {
        instrument.output.dispose();
      }
    });
    
    // Dispose of event players
    Object.values(this.eventPlayers).forEach(player => {
      if (player.synth) player.synth.dispose();
      if (player.output && player.output !== player.synth) {
        player.output.dispose();
      }
    });
    
    // Dispose of master effects
    Object.values(this.masterEffects).forEach(effect => {
      if (effect) effect.dispose();
    });
    
    // Reset properties
    this.instruments = {};
    this.sequences = {};
    this.masterEffects = {};
    this.eventPlayers = {};
    this.initialized = false;
    this.playing = false;
  }
}

export default BaseballAudioEngine;
/**
 * GameStateInterpreter
 * 
 * Translates baseball game states into musical parameters.
 * This is the bridge between the game data and the audio engine.
 */

import musicConfig from './musicConfig';

class GameStateInterpreter {
  constructor() {
    this.previousState = null;
  }

  /**
   * Map game state to musical parameters
   * @param {Object} gameState - Current game state from MLB API
   * @returns {Object} - Musical parameters derived from game state
   */
  interpret(gameState) {
    if (!gameState) return null;
    
    const params = {
      rhythm: this._getRhythmParameters(gameState),
      tonality: this._getTonalityParameters(gameState),
      tempo: this._getTempoParameters(gameState),
      events: this._detectEvents(gameState)
    };
    
    // Store current state for future comparisons
    this.previousState = { ...gameState };
    
    return params;
  }
  
  /**
   * Extract rhythm parameters from game state
   */
  _getRhythmParameters(gameState) {
    const { balls, strikes, outs, inning, runners, isBetweenInnings, inningState } = gameState;
    const { rhythms } = musicConfig;
    
    // Determine if we're in early or late innings (7th inning or later)
    const isLateInning = inning >= 7;
    
    // Handle between-innings state
    if (isBetweenInnings || (inningState && (inningState.startsWith('End') || inningState.startsWith('Middle')))) {
      // Use simpler rhythm pattern during breaks between innings
      return {
        balls: {
          ...rhythms.balls,
          pulses: 0
        },
        strikes: {
          ...rhythms.strikes,
          pulses: 0
        },
        outs: {
          ...rhythms.outs,
          pulses: 0
        },
        inning: {
          ...rhythms.inning,
          steps: isLateInning ? rhythms.inning.stepsLate : rhythms.inning.stepsEarly,
          pulses: Math.min(inning, isLateInning ? rhythms.inning.stepsLate : rhythms.inning.stepsEarly)
        },
        runners: {
          ...rhythms.runners,
          pulses: 0
        }
      };
    }
    
    // Normal in-play state
    return {
      balls: {
        ...rhythms.balls,
        pulses: balls // 0-4 balls
      },
      strikes: {
        ...rhythms.strikes,
        pulses: strikes // 0-3 strikes
      },
      outs: {
        ...rhythms.outs,
        pulses: outs // 0-3 outs
      },
      inning: {
        ...rhythms.inning,
        steps: isLateInning ? rhythms.inning.stepsLate : rhythms.inning.stepsEarly,
        pulses: Math.min(inning, isLateInning ? rhythms.inning.stepsLate : rhythms.inning.stepsEarly)
      },
      runners: {
        ...rhythms.runners,
        pulses: runners.filter(Boolean).length // Count runners on base
      }
    };
  }
  
  /**
   * Determine tonality based on game state
   */
  _getTonalityParameters(gameState) {
    const { homeScore, awayScore, inning } = gameState;
    const { scales } = musicConfig;
    
    // Determine which scale to use based on score
    let currentScale;
    if (homeScore > awayScore) {
      currentScale = scales.homeTeamLeading;
    } else if (awayScore > homeScore) {
      currentScale = scales.awayTeamLeading;
    } else {
      currentScale = scales.tied;
    }
    
    // Use late innings scale in later innings
    if (inning >= 7) {
      currentScale = homeScore > awayScore 
        ? scales.homeTeamLeading
        : (awayScore > homeScore 
            ? scales.awayTeamLeading
            : scales.lateInnings);
    }
    
    // Calculate rootNote (could be based on team IDs or other factors)
    const rootNote = "C3";
    
    // Score differential affects chord complexity
    const scoreDifferential = Math.abs(homeScore - awayScore);
    const complexity = Math.min(1, scoreDifferential / 5); // 0-1 value
    
    return {
      scale: currentScale,
      rootNote,
      complexity
    };
  }
  
  /**
   * Calculate tempo based on game state
   */
  _getTempoParameters(gameState) {
    const { inning, homeScore, awayScore } = gameState;
    const { tempo } = musicConfig;
    
    // Calculate base tempo with modifiers
    let currentTempo = tempo.base + 
                     (inning * tempo.inningModifier) + 
                     ((homeScore + awayScore) * tempo.scoreModifier);
    
    // Cap at maximum tempo
    currentTempo = Math.min(currentTempo, tempo.maxTempo);
    
    return {
      bpm: currentTempo
    };
  }
  
  /**
   * Detect game events by comparing with previous state
   */
  _detectEvents(gameState) {
    if (!this.previousState) return [];
    
    const events = [];
    
    // Detect scoring plays
    if (gameState.homeScore > this.previousState.homeScore) {
      events.push({ type: 'runScored', team: 'home' });
    }
    if (gameState.awayScore > this.previousState.awayScore) {
      events.push({ type: 'runScored', team: 'away' });
    }
    
    // Detect strikeouts, hits, walks, etc.
    // Note: This is simplified - in a real implementation, we'd need to analyze
    // the detailed play data from the MLB API
    if (gameState.currentBatter?.id !== this.previousState.currentBatter?.id) {
      // Batter changed, let's infer what happened based on other state changes
      
      // Detect strikeout (strikes reset to 0, outs increased)
      if (gameState.strikes === 0 && 
          this.previousState.strikes === 2 && 
          gameState.outs > this.previousState.outs) {
        events.push({ type: 'strikeout' });
      }
      
      // Detect walk (balls reset to 0, runners possibly increased)
      if (gameState.balls === 0 && 
          this.previousState.balls === 3 && 
          gameState.outs === this.previousState.outs) {
        events.push({ type: 'walk' });
      }
      
      // Detect hit (balls and strikes reset, outs unchanged, possibly more runners)
      if (gameState.balls === 0 && 
          gameState.strikes === 0 && 
          gameState.outs === this.previousState.outs &&
          !events.find(e => e.type === 'walk')) {
        
        // Check if it's potentially a home run
        const previousRunners = this.previousState.runners.filter(Boolean).length;
        const currentRunners = gameState.runners.filter(Boolean).length;
        const runnersDifference = currentRunners - previousRunners;
        const scoreDifference = (gameState.homeScore + gameState.awayScore) - 
                                (this.previousState.homeScore + this.previousState.awayScore);
        
        if (scoreDifference > 0 && runnersDifference < 0) {
          // Runners decreased and score increased - likely a home run
          events.push({ type: 'homeRun' });
        } else {
          events.push({ type: 'hit' });
        }
      }
    }
    
    // Detect out recorded
    if (gameState.outs > this.previousState.outs && 
        !events.find(e => e.type === 'strikeout')) {
      events.push({ type: 'outRecorded' });
    }
    
    return events;
  }
}

export default GameStateInterpreter;
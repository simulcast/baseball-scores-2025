/**
 * Baseball Scores Music Configuration
 * 
 * This file contains all sound design parameters for the musical baseball scoreboard.
 * Musicians can modify this file to completely change the sound of the application
 * without touching any of the implementation code.
 */

const musicConfig = {
    // Master volume and effects
    master: {
      volume: -6, // in dB
      effects: {
        reverb: {
          enabled: true,
          decay: 1.5,
          preDelay: 0.01,
          wet: .3
        },
        limiter: {
          enabled: true,
          threshold: -3,
        }
      }
    },
    
    // Scales and tonality
    scales: {
      homeTeamLeading: ['C3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'], // Major pentatonic
      awayTeamLeading: ['C3', 'Eb3', 'F3', 'G3', 'Bb3', 'C4', 'Eb4', 'F4', 'G4'], // Minor pentatonic
      tied: ['C3', 'D3', 'E3', 'G3', 'B3', 'C4', 'D4', 'E4', 'G4'], // Mixolydian mode
      earlyInnings: ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'], // Major
      lateInnings: ['C3', 'D3', 'Eb3', 'G3', 'Bb3', 'C4', 'D4', 'Eb4', 'G4'], // Dorian
    },
    
    // Rhythm patterns
    rhythms: {
      balls: {
        steps: 4,
        rotation: 0,
        subdivision: "8n",
        volume: -8
      },
      strikes: {
        steps: 3,
        rotation: 1,
        subdivision: "16n",
        volume: -6
      },
      outs: {
        steps: 3,
        rotation: 0,
        subdivision: "8n.",
        volume: -4
      },
      inning: {
        stepsEarly: 8,
        stepsLate: 12, // More complex in later innings
        rotation: 0,
        subdivision: "4n",
        volume: -10
      },
      runners: {
        steps: 3,
        rotation: 0,
        subdivision: "8n",
        volume: -5
      }
    },
    
    // Instrument definitions
    instruments: {
      balls: {
        oscillator: {
          type: 'sine',
        },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 0.8
        },
        filter: {
          type: 'lowpass',
          frequency: 800,
          Q: 1
        }
      },
      strikes: {
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.005,
          decay: 0.2,
          sustain: 0.2,
          release: 0.3
        },
        filter: {
          type: 'highpass',
          frequency: 300,
          Q: 1
        }
      },
      outs: {
        oscillator: {
          type: 'square',
        },
        envelope: {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.1,
          release: 0.2
        },
        filter: {
          type: 'bandpass',
          frequency: 500,
          Q: 2
        }
      },
      runners: {
        oscillator: {
          type: 'sawtooth',
        },
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.4,
          release: 0.5
        },
        filter: {
          type: 'lowpass',
          frequency: 1200,
          Q: 1
        }
      },
      inning: {
        oscillator: {
          type: 'sine4',
        },
        envelope: {
          attack: 0.1,
          decay: 0.4,
          sustain: 0.6,
          release: 1.5
        },
        filter: {
          type: 'lowpass',
          frequency: 600,
          Q: 0.5
        }
      }
    },
    
    // One-shot event sounds
    events: {
      hit: {
        notes: ['G4', 'C5'],
        instrument: {
          oscillator: { type: 'triangle8' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.6 }
        },
        effects: { delay: { time: "16n", feedback: 0.3, wet: 0.4 } }
      },
      homeRun: {
        notes: ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'],
        instrument: {
          oscillator: { type: 'square8' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 }
        },
        effects: { 
          delay: { time: "8n", feedback: 0.4, wet: 0.5 },
          distortion: { amount: 0.3, wet: 0.3 }
        }
      },
      strikeout: {
        notes: ['E4', 'D4', 'C4'],
        instrument: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.3 }
        },
        effects: { 
          filter: { frequency: 800, Q: 8, type: 'lowpass', envelope: { attack: 0.01, decay: 0.1 } }
        }
      },
      walk: {
        notes: ['C4', 'E4', 'G4'],
        instrument: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.4 }
        }
      },
      runScored: {
        notes: ['C5', 'G4', 'E4', 'C4', 'G3', 'C4'],
        instrument: {
          oscillator: { type: 'sine4' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 }
        },
        effects: { 
          reverb: { decay: 2, wet: 0.5 }
        }
      },
      outRecorded: {
        notes: ['A3', 'E3'],
        instrument: {
          oscillator: { type: 'square4' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 }
        }
      }
    },
    
    // Tempo settings
    tempo: {
      base: 90, // BPM
      inningModifier: 5, // BPM added per inning
      scoreModifier: 0, // BPM added per run scored
      maxTempo: 140 // Maximum tempo
    }
  };
  
  export default musicConfig;
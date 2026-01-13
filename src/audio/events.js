// src/audio/events.js

/**
 * Detect game events by comparing previous and current state
 * Returns array of event objects
 */
export function detectEvents(prevState, currentState) {
  if (!prevState || !currentState) return [];

  const events = [];

  // Score changes
  if (currentState.homeScore > prevState.homeScore) {
    const runsScored = currentState.homeScore - prevState.homeScore;
    if (runsScored >= 4) {
      events.push({ type: 'HOME_RUN', team: 'home', runs: runsScored });
    } else {
      for (let i = 0; i < runsScored; i++) {
        events.push({ type: 'RUN_SCORED', team: 'home' });
      }
    }
  }

  if (currentState.awayScore > prevState.awayScore) {
    const runsScored = currentState.awayScore - prevState.awayScore;
    if (runsScored >= 4) {
      events.push({ type: 'HOME_RUN', team: 'away', runs: runsScored });
    } else {
      for (let i = 0; i < runsScored; i++) {
        events.push({ type: 'RUN_SCORED', team: 'away' });
      }
    }
  }

  // Lead change detection
  const prevLead = Math.sign(prevState.homeScore - prevState.awayScore);
  const currentLead = Math.sign(currentState.homeScore - currentState.awayScore);
  if (prevLead !== currentLead && currentLead !== 0) {
    events.push({
      type: 'LEAD_CHANGE',
      newLeader: currentLead > 0 ? 'home' : 'away'
    });
  }

  // Strikeout: strikes were 2, now 0, outs increased
  if (prevState.strikes === 2 && currentState.strikes === 0 &&
      currentState.outs > prevState.outs) {
    events.push({ type: 'STRIKEOUT' });
  }

  // Walk: balls were 3, now 0, outs same
  if (prevState.balls === 3 && currentState.balls === 0 &&
      currentState.outs === prevState.outs) {
    events.push({ type: 'WALK' });
  }

  // Out recorded (not strikeout)
  if (currentState.outs > prevState.outs && !events.some(e => e.type === 'STRIKEOUT')) {
    events.push({ type: 'OUT' });
  }

  // Hit detection (count reset, runner configuration changed, no out)
  if (prevState.strikes > 0 && currentState.strikes === 0 &&
      prevState.balls > 0 && currentState.balls === 0 &&
      currentState.outs === prevState.outs &&
      !events.some(e => e.type === 'WALK')) {
    // Check if runners changed (indicating hit)
    const prevRunners = prevState.runners.filter(Boolean).length;
    const currentRunners = currentState.runners.filter(Boolean).length;
    if (currentRunners !== prevRunners || currentState.runners[0]) {
      events.push({ type: 'HIT' });
    }
  }

  // Strike (count increased)
  if (currentState.strikes > prevState.strikes) {
    events.push({ type: 'STRIKE' });
  }

  // Ball (count increased)
  if (currentState.balls > prevState.balls) {
    events.push({ type: 'BALL' });
  }

  // Inning changes
  if (currentState.inning !== prevState.inning ||
      currentState.inningState !== prevState.inningState) {
    if (currentState.inningState === 'Mid' || currentState.inningState === 'End') {
      events.push({ type: 'INNING_END' });
    } else if (prevState.inningState === 'Mid' || prevState.inningState === 'End') {
      events.push({ type: 'INNING_START' });
    }
  }

  return events;
}

/**
 * Get musical response parameters for an event
 */
export function getEventResponse(event) {
  switch (event.type) {
    case 'STRIKE':
      return {
        bells: { trigger: true, register: 'high' },
        pad: { filterSweep: { target: 1.2, duration: 2 } }
      };

    case 'BALL':
      return {
        pad: { filterSweep: { target: 1.1, duration: 1.5 } },
        ghostMelody: { nudge: true }
      };

    case 'OUT':
      return {
        pad: { chordShift: true },
        density: { spike: 0.3, duration: 3 }
      };

    case 'STRIKEOUT':
      return {
        pad: { filterSweep: { target: 0.7, duration: 3 } },
        reverb: { decayMultiplier: 1.3, duration: 4 }
      };

    case 'WALK':
      return {
        bells: { arpeggio: 'ascending', notes: 3, duration: 3 }
      };

    case 'HIT':
      return {
        shimmer: { swell: 0.7, duration: 3 },
        bells: { cascade: true, notes: 3 }
      };

    case 'RUN_SCORED':
      return {
        harmony: { lift: 2 }, // semitones
        shimmer: { peak: 0.9, duration: 4 }
      };

    case 'HOME_RUN':
      return {
        harmony: { lift: 4 },
        all: { brighten: 0.3, duration: 5 }
      };

    case 'LEAD_CHANGE':
      return {
        harmony: { modulate: true, immediate: true },
        shimmer: { intensity: 0.8, duration: 5 }
      };

    case 'INNING_END':
      return {
        all: { fade: 0.3, duration: 4 },
        reverb: { decayMultiplier: 1.5 },
        air: { amount: 0.6 }
      };

    case 'INNING_START':
      return {
        density: { increase: 0.2, duration: 4 },
        harmony: { establish: true }
      };

    default:
      return {};
  }
}

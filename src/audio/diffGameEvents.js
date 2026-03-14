/**
 * Pure function: compares previous and next normalized game states,
 * returns an array of game event descriptors for the audio engine.
 *
 * Branching:
 * ├── prev=null, next=null → []
 * ├── prev=null, next exists → [gameSelected] if Live
 * ├── prev exists, next=null → []
 * ├── prev === next → []
 * └── diff fields → statusChange, runScored, inningChange,
 *     outRecorded, strike, ball, runnerAdvance
 */
export function diffGameEvents(prev, next) {
  const events = [];

  // No game on either side
  if (!prev && !next) return events;

  // Game just selected
  if (!prev && next) {
    if (next.status === 'Live') {
      events.push({ type: 'gameSelected', detail: {} });
    }
    return events;
  }

  // Game deselected
  if (prev && !next) return events;

  // Same reference = no change (leveraging store's referential stability)
  if (prev === next) return events;

  // Status transition
  if (prev.status !== next.status) {
    events.push({ type: 'statusChange', detail: { from: prev.status, to: next.status } });
  }

  // Score increases (ignore decreases — treat as data corrections)
  if (next.homeScore > prev.homeScore) {
    events.push({ type: 'runScored', detail: { team: 'home', runs: next.homeScore - prev.homeScore } });
  }
  if (next.awayScore > prev.awayScore) {
    events.push({ type: 'runScored', detail: { team: 'away', runs: next.awayScore - prev.awayScore } });
  }

  // Inning change
  if (next.inning !== prev.inning || next.isTopInning !== prev.isTopInning) {
    events.push({ type: 'inningChange', detail: { inning: next.inning, isTop: next.isTopInning } });
  }

  // Guards for within-half-inning events
  const sameHalfInning = prev.inning === next.inning && prev.isTopInning === next.isTopInning;

  if (sameHalfInning) {
    // Out recorded
    if (next.outs > prev.outs) {
      events.push({ type: 'outRecorded', detail: { outs: next.outs } });
    }

    // Strike
    if (next.strikes > prev.strikes) {
      events.push({ type: 'strike', detail: { count: next.strikes } });
    }

    // Ball
    if (next.balls > prev.balls) {
      events.push({ type: 'ball', detail: { count: next.balls } });
    }
  }

  // Runner advances (defensive guard on runners array)
  const prevRunners = prev.runners || [];
  const runners = next.runners || [];
  const len = Math.min(runners.length, 3);

  for (let i = 0; i < len; i++) {
    if (!prevRunners[i] && runners[i]) {
      events.push({ type: 'runnerAdvance', detail: { base: i + 1 } });
    }
  }

  return events;
}

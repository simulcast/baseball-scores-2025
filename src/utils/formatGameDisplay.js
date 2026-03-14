import { format } from 'date-fns';

/**
 * Format inning display string from game state.
 * Handles Mid/End inning states and Top/Bottom half-innings.
 */
export function formatInning(game) {
  if (!game || !game.inning) return '';

  if (
    game.inningState &&
    (game.inningState.startsWith('Mid') || game.inningState.startsWith('End'))
  ) {
    return `${game.inningState} ${game.inning}`;
  }

  return `${game.isTopInning ? 'Top' : 'Bottom'} ${game.inning}`;
}

/**
 * Format game date to a display time string (e.g., "7:05 PM").
 */
export function formatGameTime(gameDate) {
  if (!gameDate) return '';
  return format(new Date(gameDate), 'h:mm a');
}

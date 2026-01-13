/**
 * Audio Engine Stub
 *
 * This will be implemented in a separate ticket.
 * The audio engine should subscribe to the game store:
 *
 * import { useGameStore } from '../store/gameStore';
 *
 * const unsubscribe = useGameStore.subscribe(
 *   state => state.games.get(activeGameId),
 *   (gameState, prevGameState) => {
 *     // React to game state changes
 *   }
 * );
 */

export function connectAudioEngine(store) {
  console.log('[Audio] Engine not yet implemented');
  return () => {}; // cleanup
}

export function disconnectAudioEngine() {
  console.log('[Audio] Engine not yet implemented');
}

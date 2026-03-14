import { create } from 'zustand';
import { normalizeGame } from '../utils/normalizeGame';

export const useGameStore = create((set, get) => ({
  games: {},
  activeGameId: null,
  lastAcceptedSeq: 0,
  lastAcceptedLiveSeq: 0,
  lastUpdatedAt: null,
  pollError: null,

  ingestGames: (rawGames, seq) => {
    if (!Array.isArray(rawGames)) return;

    const { games: prev, activeGameId, lastAcceptedSeq } = get();

    // Drop stale responses — seq must be strictly greater
    if (seq !== undefined && seq <= lastAcceptedSeq) {
      console.debug('[gameStore] dropped stale response', { seq, lastAcceptedSeq });
      return;
    }

    const next = {};

    for (const raw of rawGames) {
      const normalized = normalizeGame(raw);
      if (!normalized) continue;

      const id = normalized.gameId;

      // Skip active game when live polling is active — live feed has fresher data
      if (id === activeGameId && get().lastAcceptedLiveSeq > 0) {
        next[id] = prev[id];
        continue;
      }

      const existing = prev[id];

      // Keep old reference if nothing changed (referential stability)
      if (existing && gameEqual(existing, normalized)) {
        next[id] = existing;
      } else {
        next[id] = normalized;
      }
    }

    // Preserve active game if it disappeared from the response
    if (activeGameId && prev[activeGameId] && !next[activeGameId]) {
      next[activeGameId] = prev[activeGameId];
    }

    // Check if games actually changed — skip games update if not
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const gamesChanged = prevKeys.length !== nextKeys.length ||
      nextKeys.some(k => next[k] !== prev[k]);

    const metadata = {
      lastAcceptedSeq: seq ?? get().lastAcceptedSeq,
      lastUpdatedAt: Date.now(),
      pollError: null,
    };

    if (gamesChanged) {
      set({ games: next, ...metadata });
    } else {
      set(metadata);
    }
  },

  // Single-game ingest for live feed updates. Structurally mirrors ingestGames
  // but merges a single game instead of replacing the full set. Uses its own
  // lastAcceptedLiveSeq to avoid interfering with schedule-tier staleness checks.
  // See ingestGames above for the batch counterpart.
  ingestGame: (rawGame, seq) => {
    if (!rawGame) return;

    const { games: prev, lastAcceptedLiveSeq } = get();

    if (seq !== undefined && seq <= lastAcceptedLiveSeq) {
      console.debug('[gameStore] dropped stale live response', { seq, lastAcceptedLiveSeq });
      return;
    }

    const normalized = normalizeGame(rawGame);
    if (!normalized) return;

    const id = normalized.gameId;
    const existing = prev[id];

    const metadata = {
      lastAcceptedLiveSeq: seq ?? get().lastAcceptedLiveSeq,
      lastUpdatedAt: Date.now(),
      pollError: null,
    };

    if (existing && gameEqual(existing, normalized)) {
      set(metadata);
      return;
    }

    set({ games: { ...prev, [id]: normalized }, ...metadata });
  },

  setPollError: (msg) => {
    set({ pollError: msg });
  },

  setActiveGame: (id) => {
    set({ activeGameId: id ? String(id) : null });
  },

  getGame: (id) => get().games[String(id)] ?? null,

  getActiveGame: () => {
    const { activeGameId, games } = get();
    return activeGameId ? games[activeGameId] ?? null : null;
  },

  isStale: (thresholdMs = 15000) => {
    const { lastUpdatedAt } = get();
    if (lastUpdatedAt === null) return true;
    return Date.now() - lastUpdatedAt > thresholdMs;
  },
}));

// Explicit field-by-field comparison for normalized game objects.
// Must stay in sync with normalizeGame — the exhaustiveness test enforces this.
function gameEqual(a, b) {
  return (
    a.gameId === b.gameId &&
    a.status === b.status &&
    a.gameDate === b.gameDate &&
    a.homeScore === b.homeScore &&
    a.awayScore === b.awayScore &&
    a.inning === b.inning &&
    a.isTopInning === b.isTopInning &&
    a.inningState === b.inningState &&
    a.balls === b.balls &&
    a.strikes === b.strikes &&
    a.outs === b.outs &&
    a.runners[0] === b.runners[0] &&
    a.runners[1] === b.runners[1] &&
    a.runners[2] === b.runners[2] &&
    a.homeTeam.id === b.homeTeam.id &&
    a.homeTeam.name === b.homeTeam.name &&
    a.homeTeam.abbreviation === b.homeTeam.abbreviation &&
    a.awayTeam.id === b.awayTeam.id &&
    a.awayTeam.name === b.awayTeam.name &&
    a.awayTeam.abbreviation === b.awayTeam.abbreviation
  );
}

// Exported for testing
export { gameEqual };

export default useGameStore;

import { create } from 'zustand';
import { normalizeGame } from '../utils/normalizeGame';

export const useGameStore = create((set, get) => ({
  games: {},
  activeGameId: null,

  ingestGames: (rawGames) => {
    const prev = get().games;
    const next = {};

    for (const raw of rawGames) {
      const normalized = normalizeGame(raw);
      if (!normalized) continue;

      const id = normalized.gameId;
      const existing = prev[id];

      // Keep old reference if nothing changed (referential stability)
      if (existing && shallowEqual(existing, normalized)) {
        next[id] = existing;
      } else {
        next[id] = normalized;
      }
    }

    set({ games: next });
  },

  setActiveGame: (id) => {
    set({ activeGameId: id ? String(id) : null });
  },

  getGame: (id) => get().games[String(id)] ?? null,

  getActiveGame: () => {
    const { activeGameId, games } = get();
    return activeGameId ? games[activeGameId] ?? null : null;
  },
}));

function shallowEqual(a, b) {
  for (const key in a) {
    if (key === 'runners') {
      if (a.runners[0] !== b.runners[0] ||
          a.runners[1] !== b.runners[1] ||
          a.runners[2] !== b.runners[2]) return false;
    } else if (a[key] !== b[key]) {
      // Skip nested objects (homeTeam, awayTeam) — compare by fields
      if (typeof a[key] === 'object' && a[key] !== null) {
        for (const k in a[key]) {
          if (a[key][k] !== b[key]?.[k]) return false;
        }
      } else {
        return false;
      }
    }
  }
  return true;
}

export default useGameStore;

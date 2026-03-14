/**
 * Adapts MLB live feed response to the schedule-game shape that normalizeGame expects.
 *
 * Live feed:  /api/v1.1/game/{gamePk}/feed/live
 * Schedule:   /api/v1/schedule?hydrate=team,linescore
 *
 * This adapter bridges the two so normalizeGame stays the single normalization path.
 */
export function adaptLiveFeed(liveFeed) {
  if (!liveFeed?.gameData) return null;

  const { gameData, liveData } = liveFeed;
  const linescore = liveData?.linescore;

  return {
    gamePk: gameData.game?.pk,
    status: gameData.status,
    gameDate: gameData.datetime?.dateTime ?? null,
    teams: {
      home: {
        team: {
          id: gameData.teams?.home?.id,
          name: gameData.teams?.home?.name ?? '',
          abbreviation: gameData.teams?.home?.abbreviation ?? '',
        },
        score: linescore?.teams?.home?.runs ?? 0,
      },
      away: {
        team: {
          id: gameData.teams?.away?.id,
          name: gameData.teams?.away?.name ?? '',
          abbreviation: gameData.teams?.away?.abbreviation ?? '',
        },
        score: linescore?.teams?.away?.runs ?? 0,
      },
    },
    linescore: linescore ? {
      currentInning: linescore.currentInning,
      isTopInning: linescore.isTopInning,
      inningState: linescore.inningState,
      balls: linescore.balls,
      strikes: linescore.strikes,
      outs: linescore.outs,
      offense: linescore.offense,
    } : undefined,
  };
}

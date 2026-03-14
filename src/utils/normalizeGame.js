export function normalizeGame(raw) {
  if (!raw) return null;

  const linescore = raw.linescore;

  return {
    gameId: String(raw.gamePk),
    status: raw.status?.abstractGameState ?? 'Preview',
    gameDate: raw.gameDate ?? null,
    homeTeam: {
      id: raw.teams?.home?.team?.id ?? null,
      name: raw.teams?.home?.team?.name ?? '',
      abbreviation: raw.teams?.home?.team?.abbreviation ?? '',
    },
    awayTeam: {
      id: raw.teams?.away?.team?.id ?? null,
      name: raw.teams?.away?.team?.name ?? '',
      abbreviation: raw.teams?.away?.team?.abbreviation ?? '',
    },
    homeScore: raw.teams?.home?.score ?? 0,
    awayScore: raw.teams?.away?.score ?? 0,
    inning: linescore?.currentInning ?? 0,
    isTopInning: linescore?.isTopInning ?? true,
    inningState: linescore?.inningState ?? '',
    balls: linescore?.balls ?? 0,
    strikes: linescore?.strikes ?? 0,
    outs: linescore?.outs ?? 0,
    runners: [
      linescore?.offense?.first?.id !== undefined,
      linescore?.offense?.second?.id !== undefined,
      linescore?.offense?.third?.id !== undefined,
    ],
  };
}

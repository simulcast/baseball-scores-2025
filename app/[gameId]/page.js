import { fetchGameMeta } from '../../src/utils/fetchGameMeta';
import { formatInning, formatGameTime } from '../../src/utils/formatGameDisplay';
import GameClient from '../../src/components/GameClient';

export async function generateMetadata({ params }) {
  const { gameId } = await params;
  const game = await fetchGameMeta(gameId);

  if (!game) {
    return { title: 'Game | Baseball Scores' };
  }

  const away = game.awayTeam.abbreviation;
  const home = game.homeTeam.abbreviation;
  const title = `${away} vs ${home} | Baseball Scores`;

  let description;
  if (game.status === 'Preview') {
    description = `${game.awayTeam.name} at ${game.homeTeam.name} — ${formatGameTime(game.gameDate)}`;
  } else if (game.status === 'Live' || game.status === 'In Progress') {
    description = `${away} ${game.awayScore} - ${home} ${game.homeScore} | ${formatInning(game)}`;
  } else if (game.status === 'Final') {
    description = `Final: ${away} ${game.awayScore} - ${home} ${game.homeScore}`;
  } else {
    description = `${away} vs ${home}`;
  }

  return {
    title,
    description,
    alternates: { canonical: `/${gameId}` },
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og?gameId=${gameId}`, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      images: [`/api/og?gameId=${gameId}`],
    },
  };
}

export default async function GamePage({ params }) {
  const { gameId } = await params;
  const game = await fetchGameMeta(gameId);

  const jsonLd = game ? {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${game.awayTeam.name} at ${game.homeTeam.name}`,
    startDate: game.gameDate,
    homeTeam: { '@type': 'SportsTeam', name: game.homeTeam.name },
    awayTeam: { '@type': 'SportsTeam', name: game.awayTeam.name },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <GameClient params={params} />
    </>
  );
}

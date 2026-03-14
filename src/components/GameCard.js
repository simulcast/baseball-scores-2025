import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { formatInning } from '../utils/formatGameDisplay';

const cardStyles = {
  common: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    border: '6px solid white',
    boxShadow: 'none',
    borderRadius: 0,
    textDecoration: 'none',
  },
  live: {
    cursor: 'pointer',
    transition: 'filter 0.3s ease, opacity 0.3s ease',
    '@media (max-width: 600px)': {
      transition: 'box-shadow 0.3s ease, opacity 0.3s ease',
    },
    '&:hover': {
      borderColor: 'white',
      filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.45))',
      '@media (max-width: 600px)': {
        filter: 'none',
        boxShadow: '15px 10px 5px rgba(255, 255, 255, 0.45)',
      },
    }
  },
  static: {
    opacity: 0.7,
  },
  selected: {
    filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.8)) !important',
    '@media (max-width: 600px)': {
      filter: 'none !important',
      boxShadow: '15px 10px 5px rgba(255, 255, 255, 0.8) !important',
    },
  }
};

const GameStatus = ({ isPreGame, isLive, gameTime, inningInfo }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Chip
      label={isPreGame ? gameTime : isLive ? inningInfo : 'Final'}
      color={isPreGame ? 'default' : isLive ? 'secondary' : 'primary'}
      size="small"
      sx={{ fontWeight: 'bold', filter: 'none' }}
    />
  </Box>
);

const TeamRow = ({ teamName, score, isLive }) => (
  <>
    <Grid item xs={8}>
      <Typography variant="body1" component="div" fontWeight="medium" noWrap
        color={isLive ? 'text.primary' : 'text.secondary'}>
        {teamName}
      </Typography>
    </Grid>
    <Grid item xs={4}>
      <Typography variant="h6" component="div" align="right" fontWeight="bold"
        color={isLive ? 'text.primary' : 'text.secondary'}>
        {score}
      </Typography>
    </Grid>
  </>
);

const CountIndicator = ({ count, total, label }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 1, height: '45px', justifyContent: 'flex-start' }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{label}</Typography>
    <Box sx={{ display: 'flex', gap: '2px', mt: 0.5, alignItems: 'center', height: '32px' }}>
      {[...Array(total)].map((_, i) => (
        <Box key={i} sx={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i < count ? '#fff' : 'rgba(255,255,255,0.3)' }} />
      ))}
    </Box>
  </Box>
);

export const baseColor = (occupied) => occupied ? 'var(--runner-on)' : 'var(--runner-off)';

const BaseballDiamond = ({ runners = [] }) => {
  const baseStyle = {
    width: '35%',
    height: '35%',
    position: 'absolute',
    transition: 'background-color 0.3s ease',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 1, height: '45px', justifyContent: 'flex-start' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>RUNNERS ON</Typography>
      <Box sx={{ position: 'relative', width: 32, aspectRatio: '1 / 1', transform: 'rotate(-45deg)', mt: 0.5 }}>
        {/* 3rd base — top-left */}
        <Box data-testid="base-3B" sx={{ ...baseStyle, top: '10%', left: '10%', backgroundColor: baseColor(runners[2]) }} />
        {/* 2nd base — top-right */}
        <Box data-testid="base-2B" sx={{ ...baseStyle, top: '10%', right: '10%', backgroundColor: baseColor(runners[1]) }} />
        {/* 1st base — bottom-right */}
        <Box data-testid="base-1B" sx={{ ...baseStyle, bottom: '10%', right: '10%', backgroundColor: baseColor(runners[0]) }} />
      </Box>
    </Box>
  );
};

const GameCard = ({ game, isSelected = false, onSelect = () => {} }) => {
  const isPreGame = game.status === 'Preview';
  const isLive = game.status === 'Live';

  const gameTime = game.gameDate ? format(new Date(game.gameDate), 'h:mm a') : '';

  const inningInfo = formatInning(game);

  let sx = { ...cardStyles.common };
  if (isLive) sx = { ...sx, ...cardStyles.live };
  else sx = { ...sx, ...cardStyles.static };
  if (isSelected) sx = { ...sx, ...cardStyles.selected };

  return (
    <Card
      onClick={isLive ? onSelect : undefined}
      sx={sx}
      className={isSelected ? 'selected-card' : isLive ? '' : 'static-card'}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <GameStatus isPreGame={isPreGame} isLive={isLive} gameTime={gameTime} inningInfo={inningInfo} />
        <Grid container spacing={1} alignItems="center">
          <TeamRow teamName={game.awayTeam.name} score={game.awayScore} isLive={isLive} />
          <TeamRow teamName={game.homeTeam.name} score={game.homeScore} isLive={isLive} />
        </Grid>
        {isLive && (
          <>
            <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <BaseballDiamond runners={game.runners} />
              <CountIndicator count={game.balls} total={4} label="BALLS" />
              <CountIndicator count={game.strikes} total={3} label="STRIKES" />
              <CountIndicator count={game.outs} total={3} label="OUTS" />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GameCard;

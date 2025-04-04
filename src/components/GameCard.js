import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  Chip
} from '@mui/material';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import { format } from 'date-fns';

// Card style constants
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
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: 'white',
    }
  },
  static: {
    opacity: 0.7,
    cursor: 'default',
  }
};

// Game status subcomponent
const GameStatus = ({ isPreGame, isInProgress, gameTime, inningInfo }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 2
    }}
  >
    <Chip 
      label={isPreGame ? gameTime : isInProgress ? inningInfo : 'Final'} 
      color={isPreGame ? 'default' : isInProgress ? 'secondary' : 'primary'}
      size="small"
      sx={{ 
        fontWeight: 'bold', 
        filter: 'none',
      }}
    />
  </Box>
);

// Team row subcomponent
const TeamRow = ({ teamName, score, isInProgress }) => (
  <>
    <Grid item xs={8}>
      <Typography 
        variant="body1" 
        component="div" 
        fontWeight="medium" 
        noWrap
        color={isInProgress ? 'text.primary' : 'text.secondary'}
      >
        {teamName}
      </Typography>
    </Grid>
    <Grid item xs={4}>
      <Typography 
        variant="h6" 
        component="div" 
        align="right" 
        fontWeight="bold"
        color={isInProgress ? 'text.primary' : 'text.secondary'}
      >
        {score}
      </Typography>
    </Grid>
  </>
);

/**
 * Game card component for the dashboard
 * 
 * @param {Object} props Component props
 * @param {Object} props.game Game data
 * @returns {JSX.Element} Game card component
 */
const GameCard = ({ game }) => {
  // Extract game data
  const {
    gamePk, 
    status, 
    teams, 
    linescore,
    gameDate
  } = game;

  // Determine game status
  const isPreGame = status.abstractGameState === 'Preview';
  const isInProgress = status.abstractGameState === 'Live';

  // Format game time
  const gameTime = gameDate ? format(new Date(gameDate), 'h:mm a', { timeZone: 'local' }) : '';

  // Get current inning if in progress
  const inningInfo = linescore?.currentInning 
    ? `${linescore.inningState} ${linescore.currentInning}` 
    : '';

  // Get score for teams
  const awayScore = teams.away.score !== undefined ? teams.away.score : 0;
  const homeScore = teams.home.score !== undefined ? teams.home.score : 0;

  // Card content
  const cardContent = (
    <CardContent sx={{ flexGrow: 1 }}>
      {/* Game status */}
      <GameStatus 
        isPreGame={isPreGame}
        isInProgress={isInProgress}
        gameTime={gameTime}
        inningInfo={inningInfo}
      />

      {/* Teams and scores */}
      <Grid container spacing={1} alignItems="center">
        {/* Away team */}
        <TeamRow 
          teamName={teams.away.team.name}
          score={awayScore}
          isInProgress={isInProgress}
        />

        {/* Home team */}
        <TeamRow 
          teamName={teams.home.team.name}
          score={homeScore}
          isInProgress={isInProgress}
        />
      </Grid>
    </CardContent>
  );

  // Compute final card styles
  const liveCardStyles = { ...cardStyles.common, ...cardStyles.live };
  const staticCardStyles = { ...cardStyles.common, ...cardStyles.static };

  // Render card with or without link based on game status
  return isInProgress ? (
    <Card 
      component={Link}
      to={`/${gamePk}`}
      sx={liveCardStyles}
    >
      {cardContent}
    </Card>
  ) : (
    <Card 
      className="static-card"
      sx={staticCardStyles}
    >
      {cardContent}
    </Card>
  );
};

export default GameCard;
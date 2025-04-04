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

const commonCardStyles = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  border: '6px solid white',
  boxShadow: 'none',
  borderRadius: 0,
  textDecoration: 'none',
};

const liveCardStyles = {
  ...commonCardStyles,
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: 'white',
  }
};

const staticCardStyles = {
  ...commonCardStyles,
  opacity: 0.7,
  cursor: 'default',
};

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
  const isOver = status.abstractGameState === 'Final';

  // Format game time
  const gameTime = gameDate ? format(new Date(gameDate), 'h:mm a') : '';

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
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2
        }}
      >
        <Chip 
          label={isPreGame ? 'Pre-Game' : isInProgress ? inningInfo : 'Final'} 
          color={isPreGame ? 'default' : isInProgress ? 'secondary' : 'primary'}
          size="small"
          icon={isInProgress ? <SportsBaseballIcon /> : undefined}
          sx={{ 
            fontWeight: 'bold', 
            filter: 'none',
          }}
        />
        {isPreGame && (
          <Typography variant="body2" color="text.secondary">
            {gameTime}
          </Typography>
        )}
      </Box>

      {/* Teams and scores */}
      <Grid container spacing={1} alignItems="center">
        {/* Away team */}
        <Grid item xs={8}>
          <Typography 
            variant="body1" 
            component="div" 
            fontWeight="medium" 
            noWrap
            color={isInProgress ? 'text.primary' : 'text.secondary'}
          >
            {teams.away.team.name}
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
            {awayScore}
          </Typography>
        </Grid>

        {/* Home team */}
        <Grid item xs={8}>
          <Typography 
            variant="body1" 
            component="div" 
            fontWeight="medium" 
            noWrap
            color={isInProgress ? 'text.primary' : 'text.secondary'}
          >
            {teams.home.team.name}
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
            {homeScore}
          </Typography>
        </Grid>
      </Grid>
    </CardContent>
  );

  // Render card with or without link based on game status
  return isInProgress ? (
    <Card 
      component={Link}
      to={`/games/${gamePk}`}
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
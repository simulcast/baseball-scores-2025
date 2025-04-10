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
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: 'white',
      filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.45))',
    }
  },
  static: {
    opacity: 0.7,
  },
  selected: {
    filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.8)) !important',
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

// Count indicator subcomponent
const CountIndicator = ({ count, total, label }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    mx: 1,
    height: '45px', // Fixed height to match the BaseballDiamond
    justifyContent: 'flex-start'
  }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
      {label}
    </Typography>
    <Box sx={{ 
      display: 'flex', 
      gap: '2px', 
      mt: 0.5,
      alignItems: 'center',
      height: '32px' // Match the diamond height
    }}>
      {[...Array(total)].map((_, index) => (
        <Box
          key={index}
          sx={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: index < count ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
      ))}
    </Box>
  </Box>
);

// Baseball diamond with runners
const BaseballDiamond = ({ runners = [] }) => {
  // Runners array should be [first, second, third]
  const firstBase = runners[0] || false;
  const secondBase = runners[1] || false;
  const thirdBase = runners[2] || false;

  // Base size and spacing constants for consistent positioning
  const baseSize = 10; // Width and height of each base in pixels
  const baseOffset = 4; // Standard offset from edges in pixels
  const baseStyles = {
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    position: 'absolute',
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        mx: 1,
        height: '45px', // Fixed height to match CountIndicator
        justifyContent: 'flex-start'
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
        RUNNERS ON
      </Typography>
      <Box 
        sx={{ 
          position: 'relative',
          width: '32px',
          height: '32px',
          transform: 'rotate(-45deg)',
          mt: 0.5,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/* Third Base (Top Left) */}
        <Box 
          sx={{ 
            ...baseStyles,
            top: `${baseOffset}px`,
            left: `${baseOffset}px`,
            backgroundColor: thirdBase ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
        
        {/* Second Base (Top Right) */}
        <Box 
          sx={{ 
            ...baseStyles,
            top: `${baseOffset}px`,
            right: `${baseOffset}px`,
            backgroundColor: secondBase ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
        
        {/* First Base (Bottom Right) */}
        <Box 
          sx={{ 
            ...baseStyles,
            bottom: '-2.5px',
            right: `${baseOffset}px`,
            backgroundColor: firstBase ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
        
        {/* Home Plate (Bottom Left - always empty) */}
        <Box 
          sx={{ 
            ...baseStyles,
            bottom: `${baseOffset}px`,
            left: `${baseOffset}px`,
            backgroundColor: 'transparent',
          }}
        />
      </Box>
    </Box>
  );
};

/**
 * Game card component for the dashboard
 * 
 * @param {Object} props Component props
 * @param {Object} props.game Game data
 * @param {boolean} props.isSelected Whether this game is currently selected
 * @param {Function} props.onSelect Callback for when the game is clicked
 * @param {Array} props.events Game-specific events
 * @param {Function} props.onAcknowledgeEvent Callback to acknowledge events
 * @returns {JSX.Element} Game card component
 */
const GameCard = ({ 
  game, 
  isSelected = false, 
  onSelect = () => {},
  events = [],
  onAcknowledgeEvent = () => {}
}) => {
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

  // Get count data if available
  const balls = linescore?.balls || 0;
  const strikes = linescore?.strikes || 0;
  const outs = linescore?.outs || 0;
  
  // Get runners on base
  const runnersOnBase = [
    linescore?.offense?.first?.id !== undefined,
    linescore?.offense?.second?.id !== undefined,
    linescore?.offense?.third?.id !== undefined
  ];

  // Handle event acknowledgment
  React.useEffect(() => {
    if (events && events.length > 0) {
      // Auto-acknowledge events after a delay
      const timer = setTimeout(() => {
        events.forEach(event => onAcknowledgeEvent(event.id));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [events, onAcknowledgeEvent]);

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

      {/* Count indicators and diamond (only for in-progress games) */}
      {isInProgress && (
        <>
          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <BaseballDiamond runners={runnersOnBase} />
            <CountIndicator count={balls} total={4} label="BALLS" />
            <CountIndicator count={strikes} total={3} label="STRIKES" />
            <CountIndicator count={outs} total={3} label="OUTS" />
          </Box>
        </>
      )}
    </CardContent>
  );

  // Compute final card styles
  let finalStyles = { ...cardStyles.common };
  
  if (isInProgress) {
    finalStyles = { ...finalStyles, ...cardStyles.live };
  } else {
    finalStyles = { ...finalStyles, ...cardStyles.static };
  }
  
  if (isSelected) {
    finalStyles = { ...finalStyles, ...cardStyles.selected };
  }
  
  // Add animation for events
  if (events && events.length > 0) {
    finalStyles = { 
      ...finalStyles, 
      animation: 'pulse 1.5s infinite',
      '@keyframes pulse': {
        '0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)' },
        '70%': { boxShadow: '0 0 0 15px rgba(255, 255, 255, 0)' },
        '100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' }
      }
    };
  }

  // Render card
  return (
    <Card 
      onClick={isInProgress ? onSelect : undefined}
      sx={finalStyles}
      className={isSelected ? 'selected-card' : isInProgress ? '' : 'static-card'}
    >
      {cardContent}
    </Card>
  );
};

export default GameCard;
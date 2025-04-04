import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Divider,
  Card
} from '@mui/material';

/**
 * Component to display balls, strikes, outs indicators
 */
const CountIndicator = ({ count, total, label }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box className="scoreboard-count">
        {[...Array(total)].map((_, index) => (
          <div
            key={index}
            className={`scoreboard-indicator ${index < count ? 'active' : 'inactive'}`}
          />
        ))}
      </Box>
    </Box>
  );
};

/**
 * Main scoreboard component
 * 
 * @param {Object} props Component props
 * @param {Object} props.gameState Game state data
 * @returns {JSX.Element} Scoreboard component
 */
const Scoreboard = ({ gameState }) => {
  if (!gameState) {
    return (
      <Card className="scoreboard" sx={{ p: 2, mb: 3 }}>
        <Typography>Loading game data...</Typography>
      </Card>
    );
  }

  const {
    homeTeam,
    awayTeam,
    inning,
    isTopInning,
    balls,
    strikes,
    outs,
    homeScore,
    awayScore,
    currentBatter,
    currentPitcher
  } = gameState;

  return (
    <Card className="scoreboard" sx={{ mb: 3 }}>
      {/* Team scores */}
      <Grid container>
        <Grid item xs={12} sm={6}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={8}>
                <Typography variant="h6">{awayTeam.name}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h4" align="center" fontWeight="bold">
                  {awayScore}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={8}>
                <Typography variant="h6">{homeTeam.name}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h4" align="center" fontWeight="bold">
                  {homeScore}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>

      <Divider />

      {/* Game information */}
      <Box sx={{ p: 2 }}>
        <Grid container alignItems="center" spacing={1}>
          {/* Inning indicator */}
          <Grid item xs={12} sm={3}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 1, 
                backgroundColor: 'background.default', 
                textAlign: 'center'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                INNING
              </Typography>
              <Typography variant="h6" className="scoreboard-inning">
                {isTopInning ? '▲' : '▼'} {inning}
              </Typography>
            </Paper>
          </Grid>

          {/* Count indicators */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
              <CountIndicator count={balls} total={4} label="BALLS" />
              <CountIndicator count={strikes} total={3} label="STRIKES" />
              <CountIndicator count={outs} total={3} label="OUTS" />
            </Box>
          </Grid>

          {/* At-bat information */}
          <Grid item xs={12} sm={3} sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              AT BAT
            </Typography>
            <Typography variant="body1" noWrap>
              {currentBatter?.fullName || 'Unknown'}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Current pitcher information */}
      <Divider />
      <Box sx={{ p: 1, backgroundColor: 'background.paper' }}>
        <Typography variant="body2" align="center">
          Pitching: {currentPitcher?.fullName || 'Unknown'}
        </Typography>
      </Box>
    </Card>
  );
};

export default Scoreboard;
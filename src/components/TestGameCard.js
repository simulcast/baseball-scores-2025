import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  Chip,
  Divider,
  Slider,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

// Reuse the BaseballDiamond from GameCard but as a simplified version
const BaseballDiamond = ({ runners = [false, false, false], onRunnerToggle }) => {
  // Base size and spacing constants for consistent positioning
  const baseSize = 10;
  const baseOffset = 4; 
  const baseStyles = {
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    position: 'absolute',
    cursor: 'pointer'
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        mx: 1,
        height: '45px',
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
          onClick={() => onRunnerToggle(2)}
          sx={{ 
            ...baseStyles,
            top: `${baseOffset}px`,
            left: `${baseOffset}px`,
            backgroundColor: runners[2] ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
        
        {/* Second Base (Top Right) */}
        <Box 
          onClick={() => onRunnerToggle(1)}
          sx={{ 
            ...baseStyles,
            top: `${baseOffset}px`,
            right: `${baseOffset}px`,
            backgroundColor: runners[1] ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
        
        {/* First Base (Bottom Right) */}
        <Box 
          onClick={() => onRunnerToggle(0)}
          sx={{ 
            ...baseStyles,
            bottom: '-2.5px',
            right: `${baseOffset}px`,
            backgroundColor: runners[0] ? '#fff' : 'rgba(255,255,255,0.3)',
          }}
        />
        
        {/* Home Plate (Bottom Left - always empty) */}
        <Box 
          sx={{ 
            ...baseStyles,
            bottom: `${baseOffset}px`,
            left: `${baseOffset}px`,
            backgroundColor: 'transparent',
            cursor: 'default'
          }}
        />
      </Box>
    </Box>
  );
};

/**
 * Test Game Card for simulating different game states
 * @returns {JSX.Element} Test game card with controls
 */
const TestGameCard = ({ onSelect, isSelected }) => {
  // Game state
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [outs, setOuts] = useState(0);
  const [runners, setRunners] = useState([false, false, false]);
  const [inning, setInning] = useState(1);
  const [inningState, setInningState] = useState('Top');
  const [isTopInning, setIsTopInning] = useState(true);
  const [testGameId] = useState(`test-${Date.now()}`);
  
  // Generate game state object compatible with our API format
  const generateGameState = () => {
    return {
      gameId: testGameId,
      status: 'Live',
      detailedState: 'In Progress',
      homeTeam: {
        id: 999,
        name: 'Test Home',
        abbreviation: 'HOME'
      },
      awayTeam: {
        id: 998,
        name: 'Test Away',
        abbreviation: 'AWAY'
      },
      venue: 'Test Stadium',
      inning,
      isTopInning,
      inningState,
      isBetweenInnings: inningState === 'Mid' || inningState === 'End',
      balls,
      strikes,
      outs,
      runners,
      homeScore,
      awayScore,
      lastUpdate: new Date().toISOString()
    };
  };

  // Update isTopInning based on inningState
  useEffect(() => {
    if (inningState === 'Top') {
      setIsTopInning(true);
    } else if (inningState === 'Bottom') {
      setIsTopInning(false);
    }
    // For Mid and End, we keep the current isTopInning value
  }, [inningState]);

  // Handle runner toggle
  const handleRunnerToggle = (baseIndex) => {
    const newRunners = [...runners];
    newRunners[baseIndex] = !newRunners[baseIndex];
    setRunners(newRunners);
  };

  // Reset all counts
  const resetCounts = () => {
    setBalls(0);
    setStrikes(0);
  };

  // Add an out (and reset counts if 3 outs)
  const addOut = () => {
    if (outs < 2) {
      setOuts(outs + 1);
      resetCounts();
    } else {
      setOuts(0);
      resetCounts();
      setRunners([false, false, false]);
      
      // Change innings
      if (inningState === 'Top') {
        setInningState('Bottom');
      } else if (inningState === 'Bottom') {
        setInningState('Top');
        setInning(inning + 1);
      }
    }
  };

  // Game state to pass to the GameCard
  const gameCardData = {
    gamePk: testGameId,
    status: {
      abstractGameState: 'Live',
      detailedState: 'In Progress'
    },
    teams: {
      home: {
        team: { name: 'Test Home' },
        score: homeScore
      },
      away: {
        team: { name: 'Test Away' },
        score: awayScore
      }
    },
    linescore: {
      currentInning: inning,
      inningState,
      isTopInning,
      balls,
      strikes,
      outs,
      offense: {
        first: runners[0] ? { id: 1 } : undefined,
        second: runners[1] ? { id: 1 } : undefined,
        third: runners[2] ? { id: 1 } : undefined
      }
    }
  };

  // Detailed game state for audio engine
  const gameState = generateGameState();

  return (
    <Card 
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: '6px solid #f5a623', // Make the test card stand out
        boxShadow: isSelected ? '0 0 15px rgba(245, 166, 35, 0.8)' : 'none',
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
      }}
      onClick={() => onSelect(testGameId, gameState)}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Chip 
            label={`${inningState} ${inning}`}
            color="secondary"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
          <Chip 
            label="TEST GAME"
            color="warning"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {/* Teams and scores */}
        <Grid container spacing={1} alignItems="center">
          {/* Away team */}
          <Grid item xs={7}>
            <Typography variant="body1" fontWeight="medium">Test Away</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="h6" align="right" fontWeight="bold">{awayScore}</Typography>
          </Grid>
          <Grid item xs={2}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setAwayScore(awayScore + 1)}
              sx={{ minWidth: '30px', p: 0 }}
            >+</Button>
          </Grid>

          {/* Home team */}
          <Grid item xs={7}>
            <Typography variant="body1" fontWeight="medium">Test Home</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="h6" align="right" fontWeight="bold">{homeScore}</Typography>
          </Grid>
          <Grid item xs={2}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setHomeScore(homeScore + 1)}
              sx={{ minWidth: '30px', p: 0 }}
            >+</Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
        
        {/* Game state controls */}
        <Grid container spacing={1}>
          {/* Inning controls */}
          <Grid item xs={6}>
            <FormControl size="small" fullWidth variant="outlined">
              <InputLabel>Inning</InputLabel>
              <Select
                value={inningState}
                onChange={(e) => setInningState(e.target.value)}
                label="Inning"
              >
                <MenuItem value="Top">Top</MenuItem>
                <MenuItem value="Mid">Mid</MenuItem>
                <MenuItem value="Bottom">Bottom</MenuItem>
                <MenuItem value="End">End</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setInning(Math.max(1, inning - 1))}
                sx={{ minWidth: '36px' }}
              >-</Button>
              <Typography variant="body1" sx={{ mx: 1, minWidth: '20px', textAlign: 'center' }}>
                {inning}
              </Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => setInning(inning + 1)}
                sx={{ minWidth: '36px' }}
              >+</Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Balls: {balls}
            </Typography>
            <Slider
              size="small"
              value={balls}
              min={0}
              max={4}
              step={1}
              marks
              onChange={(_, value) => setBalls(value)}
              valueLabelDisplay="off"
              sx={{ color: 'primary.main' }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Strikes: {strikes}
            </Typography>
            <Slider
              size="small"
              value={strikes}
              min={0}
              max={3}
              step={1}
              marks
              onChange={(_, value) => setStrikes(value)}
              valueLabelDisplay="off"
              sx={{ color: 'error.main' }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Outs: {outs}
            </Typography>
            <Slider
              size="small"
              value={outs}
              min={0}
              max={3}
              step={1}
              marks
              onChange={(_, value) => setOuts(value)}
              valueLabelDisplay="off"
              sx={{ color: 'warning.main' }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Game visualization */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <BaseballDiamond 
            runners={runners} 
            onRunnerToggle={handleRunnerToggle} 
          />
          
          <Box sx={{ ml: 2 }}>
            <Button 
              variant="contained" 
              color="info" 
              size="small" 
              onClick={resetCounts}
              sx={{ mb: 1, fontSize: '0.75rem' }}
            >
              Reset Count
            </Button>
            <Button 
              variant="contained" 
              color="warning" 
              size="small" 
              onClick={addOut}
              sx={{ fontSize: '0.75rem' }}
            >
              Record Out
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TestGameCard;
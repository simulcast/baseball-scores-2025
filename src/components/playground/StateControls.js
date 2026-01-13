import React from 'react';
import {
  Box,
  Typography,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Grid,
} from '@mui/material';
import { useGameStore } from '../../store/gameStore';

/**
 * State controls for the playground
 * Allows direct manipulation of game state values
 */
function StateControls({ gameId, gameState }) {
  const updateGameState = useGameStore((state) => state.updateGameState);

  const handleUpdate = (field, value) => {
    updateGameState(gameId, { [field]: value });
  };

  return (
    <Box>
      {/* Inning */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
          Inning: {gameState.inning}
        </Typography>
        <Slider
          value={gameState.inning}
          min={1}
          max={12}
          step={1}
          marks
          onChange={(_, value) => handleUpdate('inning', value)}
          sx={{
            color: 'white',
            '& .MuiSlider-markLabel': { color: 'rgba(255,255,255,0.5)' },
          }}
        />
      </Box>

      {/* Inning State */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
          Inning State
        </Typography>
        <ToggleButtonGroup
          value={gameState.inningState}
          exclusive
          onChange={(_, value) => {
            if (value) {
              handleUpdate('inningState', value);
              handleUpdate('isTopInning', value === 'Top' || value === 'Mid');
            }
          }}
          size="small"
          sx={{ display: 'flex', flexWrap: 'wrap' }}
        >
          <ToggleButton value="Top" sx={toggleButtonStyle}>
            Top
          </ToggleButton>
          <ToggleButton value="Mid" sx={toggleButtonStyle}>
            Mid
          </ToggleButton>
          <ToggleButton value="Bottom" sx={toggleButtonStyle}>
            Bottom
          </ToggleButton>
          <ToggleButton value="End" sx={toggleButtonStyle}>
            End
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Balls / Strikes / Outs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
            Balls
          </Typography>
          <ClickableCount
            count={gameState.balls}
            max={3}
            onChange={(value) => handleUpdate('balls', value)}
          />
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
            Strikes
          </Typography>
          <ClickableCount
            count={gameState.strikes}
            max={2}
            onChange={(value) => handleUpdate('strikes', value)}
          />
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
            Outs
          </Typography>
          <ClickableCount
            count={gameState.outs}
            max={2}
            onChange={(value) => handleUpdate('outs', value)}
          />
        </Grid>
      </Grid>

      {/* Runners */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
          Runners on Base
        </Typography>
        <ClickableDiamond
          runners={gameState.runners}
          onChange={(runners) => handleUpdate('runners', runners)}
        />
      </Box>

      {/* Scores */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
            Away Score
          </Typography>
          <TextField
            type="number"
            value={gameState.awayScore}
            onChange={(e) =>
              handleUpdate('awayScore', Math.max(0, parseInt(e.target.value) || 0))
            }
            size="small"
            inputProps={{ min: 0 }}
            sx={textFieldStyle}
          />
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
            Home Score
          </Typography>
          <TextField
            type="number"
            value={gameState.homeScore}
            onChange={(e) =>
              handleUpdate('homeScore', Math.max(0, parseInt(e.target.value) || 0))
            }
            size="small"
            inputProps={{ min: 0 }}
            sx={textFieldStyle}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * Clickable count indicator (for balls/strikes/outs)
 */
function ClickableCount({ count, max, onChange }) {
  const handleClick = (index) => {
    // Toggle: if clicking the last filled circle, decrement; otherwise set to that index + 1
    if (index < count) {
      onChange(index);
    } else {
      onChange(index + 1);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {Array.from({ length: max + 1 }).map((_, i) => (
        <Box
          key={i}
          onClick={() => handleClick(i)}
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: i < count ? '#fff' : 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'scale(1.1)',
              backgroundColor: i < count ? '#fff' : 'rgba(255,255,255,0.4)',
            },
          }}
        />
      ))}
    </Box>
  );
}

/**
 * Clickable baseball diamond for runner positions
 */
function ClickableDiamond({ runners, onChange }) {
  const toggleRunner = (base) => {
    const newRunners = [...runners];
    newRunners[base] = !newRunners[base];
    onChange(newRunners);
  };

  const baseStyle = (isOccupied) => ({
    width: 28,
    height: 28,
    backgroundColor: isOccupied ? '#fff' : 'rgba(255,255,255,0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: isOccupied ? '#fff' : 'rgba(255,255,255,0.4)',
    },
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      {/* Second base */}
      <Box onClick={() => toggleRunner(1)} sx={baseStyle(runners[1])} />

      {/* Third and First bases */}
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box onClick={() => toggleRunner(2)} sx={baseStyle(runners[2])} />
        <Box onClick={() => toggleRunner(0)} sx={baseStyle(runners[0])} />
      </Box>

      {/* Labels */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 140,
          mt: 1,
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.5 }}>
          3B
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.5 }}>
          2B
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.5 }}>
          1B
        </Typography>
      </Box>
    </Box>
  );
}

// Styles
const toggleButtonStyle = {
  color: 'rgba(255,255,255,0.7)',
  borderColor: 'rgba(255,255,255,0.2)',
  '&.Mui-selected': {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
  },
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
};

const textFieldStyle = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255,255,255,0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'white',
    },
  },
  '& input': {
    color: 'white',
  },
};

export default StateControls;

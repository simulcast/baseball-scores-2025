import React from 'react';
import { Box, Button, Grid } from '@mui/material';
import { useGameStore } from '../../store/gameStore';

/**
 * Preset buttons for loading pre-configured game states
 */
function Presets({ gameId }) {
  const updateGameState = useGameStore((state) => state.updateGameState);

  const loadPreset = (preset) => {
    updateGameState(gameId, preset);
  };

  const presets = [
    {
      name: 'Bases Loaded Drama',
      description: '9th, bottom, 2 outs, full count, bases loaded, tie',
      state: {
        inning: 9,
        isTopInning: false,
        inningState: 'Bottom',
        balls: 3,
        strikes: 2,
        outs: 2,
        runners: [true, true, true],
        homeScore: 4,
        awayScore: 4,
      },
    },
    {
      name: 'Perfect Game 9th',
      description: '9th, top, 2 outs, 0-0, no runners',
      state: {
        inning: 9,
        isTopInning: true,
        inningState: 'Top',
        balls: 0,
        strikes: 0,
        outs: 2,
        runners: [false, false, false],
        homeScore: 0,
        awayScore: 0,
      },
    },
    {
      name: 'Tie Game Extras',
      description: '11th, bottom, 1 out, runner on 2nd, tie',
      state: {
        inning: 11,
        isTopInning: false,
        inningState: 'Bottom',
        balls: 1,
        strikes: 1,
        outs: 1,
        runners: [false, true, false],
        homeScore: 3,
        awayScore: 3,
      },
    },
    {
      name: 'Blowout',
      description: '7th, top, 10-2, bases empty',
      state: {
        inning: 7,
        isTopInning: true,
        inningState: 'Top',
        balls: 0,
        strikes: 0,
        outs: 0,
        runners: [false, false, false],
        homeScore: 10,
        awayScore: 2,
      },
    },
  ];

  return (
    <Box>
      <Grid container spacing={1}>
        {presets.map(({ name, description, state }) => (
          <Grid item xs={12} sm={6} key={name}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => loadPreset(state)}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                textAlign: 'left',
                flexDirection: 'column',
                alignItems: 'flex-start',
                py: 1.5,
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              <Box sx={{ fontWeight: 'bold' }}>{name}</Box>
              <Box sx={{ fontSize: '0.7rem', opacity: 0.6 }}>{description}</Box>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Presets;

import React from 'react';
import { Box, Button, Grid } from '@mui/material';
import { useGameStore } from '../../store/gameStore';

/**
 * Event buttons for simulating game events
 */
function EventSimulator({ gameId }) {
  const simulateEvent = useGameStore((state) => state.simulateEvent);

  const handleEvent = (eventType) => {
    simulateEvent(gameId, eventType);
  };

  const events = [
    { type: 'strikeout', label: 'Strikeout', color: '#e74c3c' },
    { type: 'walk', label: 'Walk', color: '#3498db' },
    { type: 'hit', label: 'Hit', color: '#2ecc71' },
    { type: 'homeRun', label: 'Home Run', color: '#f39c12' },
    { type: 'out', label: 'Out', color: '#95a5a6' },
    { type: 'runScored', label: 'Run Scored', color: '#9b59b6' },
  ];

  return (
    <Box>
      <Grid container spacing={1}>
        {events.map(({ type, label, color }) => (
          <Grid item xs={6} sm={4} key={type}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => handleEvent(type)}
              sx={{
                backgroundColor: color,
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: color,
                  filter: 'brightness(1.2)',
                },
              }}
            >
              {label}
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default EventSimulator;

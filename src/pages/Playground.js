import React, { useEffect } from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
import { useGameStore } from '../store/gameStore';
import StateControls from '../components/playground/StateControls';
import EventSimulator from '../components/playground/EventSimulator';
import Presets from '../components/playground/Presets';

const PLAYGROUND_GAME_ID = 'playground';

/**
 * Playground page for testing game state and audio
 * Layout: controls on left, preview/debug on right
 */
function Playground() {
  const createPlaygroundGame = useGameStore((state) => state.createPlaygroundGame);
  const games = useGameStore((state) => state.games);
  const lastChange = useGameStore((state) => state.lastChange);

  // Create playground game on mount
  useEffect(() => {
    createPlaygroundGame(PLAYGROUND_GAME_ID);
  }, [createPlaygroundGame]);

  // Get game state from the games Map (triggers re-render when games changes)
  const gameState = games.get(PLAYGROUND_GAME_ID);

  if (!gameState) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading playground...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        color: 'white',
        p: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Game State Playground
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          Test game states and audio responses
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Controls */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              State Controls
            </Typography>
            <StateControls gameId={PLAYGROUND_GAME_ID} gameState={gameState} />

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="h6" sx={{ mb: 2 }}>
              Event Simulator
            </Typography>
            <EventSimulator gameId={PLAYGROUND_GAME_ID} />

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="h6" sx={{ mb: 2 }}>
              Presets
            </Typography>
            <Presets gameId={PLAYGROUND_GAME_ID} />
          </Paper>
        </Grid>

        {/* Right Column: Preview & Debug */}
        <Grid item xs={12} md={6}>
          {/* Game State Preview */}
          <Paper
            sx={{
              p: 3,
              mb: 3,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current State
            </Typography>
            <GameStatePreview gameState={gameState} />
          </Paper>

          {/* Debug Panel */}
          <Paper
            sx={{
              p: 3,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Debug
            </Typography>

            {/* Last Change */}
            <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>
              Last Change:
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 1,
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 150,
                mb: 2,
              }}
            >
              {lastChange ? JSON.stringify(lastChange, null, 2) : 'No changes yet'}
            </Box>

            {/* Raw State */}
            <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>
              Raw Game State:
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 1,
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: 300,
              }}
            >
              {JSON.stringify(gameState, null, 2)}
            </Box>

            {/* Audio Engine Status */}
            <Typography variant="subtitle2" sx={{ opacity: 0.7, mt: 2, mb: 1 }}>
              Audio Engine:
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}
            >
              Not connected (stub)
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * Visual preview of the game state
 */
function GameStatePreview({ gameState }) {
  const {
    inning,
    isTopInning,
    inningState,
    balls,
    strikes,
    outs,
    homeScore,
    awayScore,
    runners,
    homeTeam,
    awayTeam,
  } = gameState;

  return (
    <Box>
      {/* Inning Display */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {inningState} {inning}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          {isTopInning ? 'Top' : 'Bottom'} of the {inning}
          {inning === 1 ? 'st' : inning === 2 ? 'nd' : inning === 3 ? 'rd' : 'th'}
        </Typography>
      </Box>

      {/* Score */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          mb: 3,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {awayTeam.abbreviation || 'AWAY'}
          </Typography>
          <Typography variant="h3">{awayScore}</Typography>
        </Box>
        <Typography variant="h4" sx={{ alignSelf: 'center', opacity: 0.3 }}>
          -
        </Typography>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {homeTeam.abbreviation || 'HOME'}
          </Typography>
          <Typography variant="h3">{homeScore}</Typography>
        </Box>
      </Box>

      {/* Count and Runners */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {/* Diamond */}
        <Box
          sx={{
            position: 'relative',
            width: 60,
            height: 60,
            transform: 'rotate(-45deg)',
          }}
        >
          {/* Second */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 16,
              height: 16,
              backgroundColor: runners[1] ? '#fff' : 'rgba(255,255,255,0.2)',
            }}
          />
          {/* Third */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: 0,
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              backgroundColor: runners[2] ? '#fff' : 'rgba(255,255,255,0.2)',
            }}
          />
          {/* First */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              right: 0,
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              backgroundColor: runners[0] ? '#fff' : 'rgba(255,255,255,0.2)',
            }}
          />
        </Box>

        {/* Count */}
        <Box>
          <CountDisplay label="B" count={balls} max={4} />
          <CountDisplay label="S" count={strikes} max={3} />
          <CountDisplay label="O" count={outs} max={3} />
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Count display component (B/S/O)
 */
function CountDisplay({ label, count, max }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Typography variant="body2" sx={{ width: 16, opacity: 0.7 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {Array.from({ length: max }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: i < count ? '#fff' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default Playground;

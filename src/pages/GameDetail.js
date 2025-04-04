import React from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Snackbar,
  Badge,
} from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

// Import components
import Scoreboard from '../components/Scoreboard';

/**
 * GameDetail component that shows a single game's details
 */
const GameDetail = ({ 
  gameState, 
  gameLoading, 
  gameError, 
  gameEvents, 
  acknowledgeEvent, 
  refreshGameState,
  audioEnabled,
  audioMuted,
  toggleAudio
}) => {
  return (
    <>
      {/* Loading state */}
      {gameLoading && !gameState && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {gameError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {gameError}
        </Alert>
      )}

      {/* Game view */}
      {gameState && (
        <>
          {/* Main scoreboard */}
          <Box sx={{ mb: 3 }}>
            <Scoreboard gameState={gameState} />
          </Box>

          {/* Audio controls */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Badge
              color="secondary"
              variant="dot"
              invisible={!audioEnabled}
              overlap="circular"
            >
              <IconButton
                onClick={toggleAudio}
                color="inherit"
                aria-label={audioEnabled ? (audioMuted ? 'Unmute' : 'Mute') : 'Enable audio'}
                sx={{ mr: 1 }}
              >
                {audioEnabled && !audioMuted ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
            </Badge>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={refreshGameState}
              disabled={gameLoading}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Refresh
            </Button>
          </Box>
          
          {/* Audio status */}
          {!audioEnabled && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<MusicNoteIcon />}
                onClick={toggleAudio}
                fullWidth
                sx={{
                  border: '6px solid white',
                  borderRadius: 0,
                  '&:hover': {
                    backgroundColor: 'primary.light'
                  }
                }}
              >
                Enable Audio
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Game event notification */}
      <Snackbar
        open={gameEvents.length > 0}
        autoHideDuration={5000}
        onClose={() => acknowledgeEvent(0)}
        message={gameEvents[0]?.details || ''}
        action={
          <Button 
            color="secondary" 
            size="small" 
            onClick={() => acknowledgeEvent(0)}
          >
            OK
          </Button>
        }
      />
    </>
  );
};

export default GameDetail; 
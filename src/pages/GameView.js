import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Snackbar,
  Badge,
  Typography
} from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GridViewIcon from '@mui/icons-material/GridView';
import { format } from 'date-fns';

// Import components
import Scoreboard from '../components/Scoreboard';

// Import hooks
import useGameData from '../hooks/useGameData';

const GameView = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // Audio state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  
  // Get game data using our custom hook
  const {
    games,
    gamesLoading,
    gameState,
    gameLoading,
    gameError,
    gameEvents,
    acknowledgeEvent,
    refreshGameState
  } = useGameData({
    gamePk: gameId,
    refreshInterval: 10000
  });

  // Function to toggle audio
  const toggleAudio = () => {
    // If enabling audio for the first time
    if (!audioEnabled) {
      setAudioEnabled(true);
      setAudioMuted(false);
      // Audio initialization would happen here in Phase 2
      return;
    }
    
    // Otherwise just toggle mute state
    setAudioMuted(!audioMuted);
  };
  
  // Effect to auto-acknowledge events after 5 seconds
  useEffect(() => {
    if (gameEvents.length > 0) {
      const timer = setTimeout(() => {
        acknowledgeEvent(0);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [gameEvents, acknowledgeEvent]);

  // Redirect if game not found
  useEffect(() => {
    if (!gamesLoading && games.length > 0 && !games.find(g => String(g.gamePk) === gameId)) {
      navigate('/games');
    }
  }, [games, gamesLoading, gameId, navigate]);

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: 3, 
        mb: 5,
        '@media (min-width: 1200px)': {
          maxWidth: '95%'
        }
      }}
    >
      {/* Loading state */}
      {(gamesLoading || gameLoading) && !gameState && (
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
          {/* Header section with controls */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 3,
              backgroundColor: 'primary.main',
              padding: '16px 24px',
              border: '6px solid white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    color: 'white',
                    margin: 0,
                    cursor: 'pointer',
                    lineHeight: 1.2,
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                  onClick={() => navigate('/games')}
                >
                  Baseball Scores
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          </Box>

          {/* Main scoreboard */}
          <Box sx={{ mb: 3 }}>
            <Scoreboard gameState={gameState} />
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
    </Container>
  );
};

export default GameView;
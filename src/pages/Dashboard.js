import React, { useState } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Box, 
  CircularProgress,
  Alert,
  IconButton,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { format } from 'date-fns';

// Import components
import GameCard from '../components/GameCard';

// Import hooks
import useGameData from '../hooks/useGameData';

const Dashboard = () => {
  // State for audio preview
  const [previewGameId, setPreviewGameId] = useState(null);
  
  // State for global audio mute
  const [audioMuted, setAudioMuted] = useState(false);
  
  // Get game data using our custom hook
  const { 
    games, 
    gamesLoading, 
    gamesError, 
    refreshGames 
  } = useGameData({});

  // Sort games by status: Live > Final > Preview, and by start time within Live and Preview
  const sortedGames = React.useMemo(() => {
    if (!games) return [];
    
    const statusOrder = {
      'Live': 0,
      'Final': 1,
      'Preview': 2
    };
    
    return [...games].sort((a, b) => {
      // First sort by status
      const statusDiff = statusOrder[a.status.abstractGameState] - statusOrder[b.status.abstractGameState];
      if (statusDiff !== 0) return statusDiff;
      
      // For Live and Preview games, sort by start time
      if (a.status.abstractGameState === 'Live' || a.status.abstractGameState === 'Preview') {
        return new Date(a.gameDate) - new Date(b.gameDate);
      }
      
      // For Final games, keep original order
      return 0;
    });
  }, [games]);

  // Handle audio preview
  const handlePreviewClick = (gamePk) => {
    // If clicking the same game, toggle preview off
    if (previewGameId === gamePk) {
      setPreviewGameId(null);
    } else {
      setPreviewGameId(gamePk);
      // In Phase 2, this is where we would start playing audio
    }
  };

  // Toggle audio mute
  const toggleAudioMute = () => {
    setAudioMuted(!audioMuted);
  };

  // Check if there are live games
  const hasLiveGames = games.some(game => game.status.abstractGameState === 'Live');

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
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        border: '6px solid white',
        background: '#2d5a27',
        p: '16px 24px',
        mb: 4
      }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
          MLB Musical Scoreboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasLiveGames && (
            <>
              <IconButton 
                onClick={toggleAudioMute} 
                color="inherit"
                sx={{ 
                  border: '2px solid white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                {audioMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
              <IconButton 
                onClick={refreshGames} 
                color="inherit"
                sx={{ 
                  border: '2px solid white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* Loading state */}
      {gamesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {gamesError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {gamesError}
        </Alert>
      )}

      {/* Games grid */}
      <Grid container spacing={3}>
        {/* Active games */}
        {games.filter(game => game.status.abstractGameState === 'Live').length > 0 && (
          <>
            {games
              .filter(game => game.status.abstractGameState === 'Live')
              .map(game => (
                <Grid item xs={12} sm={6} md={4} key={game.gamePk}>
                  <GameCard game={game} />
                </Grid>
              ))
            }
            {(games.filter(game => game.status.abstractGameState === 'Final').length > 0 || 
              games.filter(game => game.status.abstractGameState === 'Preview').length > 0) && (
              <Grid item xs={12}>
                <Box sx={{ my: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }} />
              </Grid>
            )}
          </>
        )}

        {/* Final games */}
        {games.filter(game => game.status.abstractGameState === 'Final').length > 0 && (
          <>
            {games
              .filter(game => game.status.abstractGameState === 'Final')
              .map(game => (
                <Grid item xs={12} sm={6} md={4} key={game.gamePk}>
                  <GameCard game={game} />
                </Grid>
              ))
            }
            {games.filter(game => game.status.abstractGameState === 'Preview').length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ my: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }} />
              </Grid>
            )}
          </>
        )}

        {/* Upcoming games */}
        {games.filter(game => game.status.abstractGameState === 'Preview').length > 0 && (
          <>
            {games
              .filter(game => game.status.abstractGameState === 'Preview')
              .map(game => (
                <Grid item xs={12} sm={6} md={4} key={game.gamePk}>
                  <GameCard game={game} />
                </Grid>
              ))
            }
          </>
        )}

        {/* No games message */}
        {!gamesLoading && games.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">
              No games scheduled for today
            </Alert>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;
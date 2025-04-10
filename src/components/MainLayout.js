import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid } from '@mui/material';

// Import components
import Header from '../components/Header';
import GameList from '../pages/GameList';
import MusicVisualizer from '../audio/components/MusicVisualizer';

// Import hooks
import useGameData from '../hooks/useGameData';
import useBaseballAudio from '../hooks/useBaseballAudio';

/**
 * MainLayout component that handles game selection and data loading
 */
const MainLayout = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // State for selected game
  const [selectedGameId, setSelectedGameId] = useState(null);
  
  // Set selected game from URL parameter
  useEffect(() => {
    if (gameId) {
      setSelectedGameId(gameId);
    } else {
      setSelectedGameId(null);
    }
  }, [gameId]);
  
  // Get game data using our custom hook
  const { 
    games, 
    gamesLoading, 
    gamesError, 
    gameState,
    gameLoading,
    gameError,
    gameEvents,
    acknowledgeEvent,
    refreshGames,
    refreshGameState
  } = useGameData({
    gamePk: selectedGameId,
    refreshInterval: 1000
  });

  // Initialize the baseball audio system
  const { 
    isActive, 
    isAudioEnabled, 
    isBaseballAudioInitialized,
    initializeAudio 
  } = useBaseballAudio({
    gameId: selectedGameId,
    gameState,
    gameEvents
  });

  // Handle game selection
  const handleGameSelect = (id) => {
    // Find the game
    const game = games.find(g => String(g.gamePk) === id);
    
    // Only allow selection of in-progress games
    if (!game || game.status.abstractGameState !== 'Live') {
      return;
    }
    
    if (selectedGameId === id) {
      // Deselect if already selected
      setSelectedGameId(null);
      navigate('/', { replace: true });
    } else {
      // Select new game
      setSelectedGameId(id);
      navigate(`/${id}`, { replace: true });
      
      // Always initialize audio when selecting a game
      initializeAudio();
    }
  };
  
  // Check if selected game is still in progress
  useEffect(() => {
    if (selectedGameId && games.length > 0) {
      const selectedGame = games.find(g => String(g.gamePk) === selectedGameId);
      if (!selectedGame || selectedGame.status.abstractGameState !== 'Live') {
        // Clear selection if game is no longer in progress
        setSelectedGameId(null);
        navigate('/', { replace: true });
      }
    }
  }, [games, selectedGameId, navigate]);

  // Navigate to dashboard
  const goToDashboard = () => {
    setSelectedGameId(null);
    navigate('/');
  };
  
  // Handle click on container to deselect game
  const handleContainerClick = useCallback((e) => {
    // Only proceed if a game is selected
    if (!selectedGameId) return;
    
    // Check if click was on a game card
    const closestCard = e.target.closest('.MuiCard-root');
    const closestGameHeader = e.target.closest('h1');
    
    // If click was not on a card or the header (to avoid conflicting with navigation), deselect the game
    if (!closestCard && !closestGameHeader) {
      setSelectedGameId(null);
      navigate('/', { replace: true });
    }
  }, [selectedGameId, navigate]);

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: 6, 
        mb: 5,
        '@media (min-width: 768px) and (max-width: 1199px)': {
          maxWidth: '90%'
        },
        '@media (min-width: 1200px)': {
          maxWidth: '80%'
        },
        px: { xs: 4, sm: 5 }, // Increased padding for mobile and tablet
        cursor: 'default' // Ensure default cursor throughout container
      }}
      onClick={handleContainerClick}
    >
      {/* Header */}
      <Header 
        onTitleClick={goToDashboard}
        showAudioControls={!!selectedGameId}
      />

      <Grid container spacing={3}>
        {/* Main content */}
        <Grid item xs={12} md={selectedGameId ? 8 : 12}>
          {/* Games List */}
          <GameList 
            games={games}
            gamesLoading={gamesLoading}
            gamesError={gamesError}
            selectedGameId={selectedGameId}
            onGameSelect={handleGameSelect}
            gameEvents={gameEvents}
            acknowledgeEvent={acknowledgeEvent}
          />
        </Grid>

        {/* Music visualizer sidebar when a game is selected */}
        {selectedGameId && isAudioEnabled && (
          <Grid item xs={12} md={4}>
            <MusicVisualizer 
              gameId={selectedGameId}
              gameState={gameState}
              gameEvents={gameEvents}
            />
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default MainLayout;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@mui/material';

// Import components
import Header from './Header';
import GameList from '../pages/GameList';

// Import hooks
import useGameData from '../hooks/useGameData';

/**
 * MainLayout component that handles game selection and data loading
 */
const MainLayout = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // State for selected game
  const [selectedGameId, setSelectedGameId] = useState(null);
  
  // State for audio
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
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
    refreshGames,
    gameState,
    gameLoading,
    gameError,
    gameEvents,
    acknowledgeEvent,
    refreshGameState
  } = useGameData({
    gamePk: selectedGameId,
    refreshInterval: 10000
  });

  // Check if there are live games
  const hasLiveGames = games.some(game => game.status.abstractGameState === 'Live');

  // Toggle audio mute
  const toggleAudioMute = () => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      setAudioMuted(false);
      return;
    }
    setAudioMuted(!audioMuted);
  };

  // Handle game selection
  const handleGameSelect = (id) => {
    if (selectedGameId === id) {
      // Deselect if already selected
      setSelectedGameId(null);
      navigate('/', { replace: true });
    } else {
      // Select new game
      setSelectedGameId(id);
      navigate(`/${id}`, { replace: true });
    }
  };

  // Navigate to dashboard
  const goToDashboard = () => {
    setSelectedGameId(null);
    navigate('/');
  };

  // Handle refresh action based on context
  const handleRefresh = () => {
    if (selectedGameId) {
      refreshGameState();
    } else {
      refreshGames();
    }
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: 3, 
        mb: 5,
        '@media (min-width: 1200px)': {
          maxWidth: '95%'
        },
        px: { xs: 2, sm: 3 } // Consistent padding
      }}
    >
      {/* Header */}
      <Header 
        hasLiveGames={hasLiveGames}
        audioMuted={audioMuted}
        onTitleClick={goToDashboard}
        onAudioToggle={toggleAudioMute}
        onRefresh={handleRefresh}
      />

      {/* Games List */}
      <GameList 
        games={games}
        gamesLoading={gamesLoading}
        gamesError={gamesError}
        selectedGameId={selectedGameId}
        onGameSelect={handleGameSelect}
        audioMuted={audioMuted}
        gameEvents={gameEvents}
        acknowledgeEvent={acknowledgeEvent}
      />
    </Container>
  );
};

export default MainLayout; 
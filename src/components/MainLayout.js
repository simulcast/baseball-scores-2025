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
    gameError
  } = useGameData({
    gamePk: selectedGameId,
    refreshInterval: 10000
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
        onTitleClick={goToDashboard}
      />

      {/* Games List */}
      <GameList 
        games={games}
        gamesLoading={gamesLoading}
        gamesError={gamesError}
        selectedGameId={selectedGameId}
        onGameSelect={handleGameSelect}
      />
    </Container>
  );
};

export default MainLayout; 
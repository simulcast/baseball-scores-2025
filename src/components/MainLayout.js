import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from '@mui/material';

// Import components
import Header from './Header';
import GameList from '../pages/GameList';
import GameDetail from '../pages/GameDetail';

// Import hooks
import useGameData from '../hooks/useGameData';

/**
 * MainLayout component that handles conditional rendering based on URL params
 */
const MainLayout = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // State for audio
  const [audioMuted, setAudioMuted] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
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
    gamePk: gameId,
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

  // Navigate to dashboard
  const goToDashboard = () => {
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
        hasLiveGames={hasLiveGames}
        audioMuted={audioMuted}
        onTitleClick={goToDashboard}
        onAudioToggle={toggleAudioMute}
      />

      {/* Conditional Content */}
      {gameId ? (
        <GameDetail 
          gameId={gameId}
          games={games}
          gamesLoading={gamesLoading}
          gameState={gameState}
          gameLoading={gameLoading}
          gameError={gameError}
          gameEvents={gameEvents}
          audioEnabled={audioEnabled}
          audioMuted={audioMuted}
          acknowledgeEvent={acknowledgeEvent}
          toggleAudio={toggleAudioMute}
          refreshGameState={refreshGameState}
        />
      ) : (
        <GameList 
          games={games}
          gamesLoading={gamesLoading}
          gamesError={gamesError}
          audioMuted={audioMuted}
        />
      )}
    </Container>
  );
};

export default MainLayout; 
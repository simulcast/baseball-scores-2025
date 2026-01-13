import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid } from '@mui/material';

// Import components
import Header from '../components/Header';
import GameList from '../pages/GameList';

// Import store and hooks
import { useGameStore } from '../store/gameStore';
import { useGamePolling } from '../hooks/useGamePolling';

/**
 * MainLayout component that handles game selection and data loading
 * Refactored to use Zustand store for state management
 */
const MainLayout = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  // Get store state and actions
  const games = useGameStore((state) => state.games);
  const rawGames = useGameStore((state) => state.rawGames);
  const activeGameId = useGameStore((state) => state.activeGameId);
  const setActiveGame = useGameStore((state) => state.setActiveGame);
  const getGame = useGameStore((state) => state.getGame);

  // Start polling for game data
  useGamePolling({
    interval: 5000, // 5 second refresh interval
    enabled: true,
  });

  // Sync URL gameId with store's activeGameId
  useEffect(() => {
    if (gameId) {
      setActiveGame(gameId);
    } else {
      setActiveGame(null);
    }
  }, [gameId, setActiveGame]);

  // Check if loading (no games yet)
  const gamesLoading = rawGames.length === 0 && games.size === 0;

  // Handle game selection
  const handleGameSelect = useCallback((id) => {
    // Find the game in raw games to check status
    const game = rawGames.find((g) => String(g.gamePk) === String(id));

    // Only allow selection of in-progress games
    if (!game || game.status?.abstractGameState !== 'Live') {
      return;
    }

    if (activeGameId === String(id)) {
      // Deselect if already selected
      setActiveGame(null);
      navigate('/', { replace: true });
    } else {
      // Select new game
      setActiveGame(id);
      navigate(`/${id}`, { replace: true });
    }
  }, [activeGameId, rawGames, setActiveGame, navigate]);

  // Check if selected game is still in progress
  useEffect(() => {
    if (activeGameId && rawGames.length > 0) {
      const selectedGame = rawGames.find(
        (g) => String(g.gamePk) === activeGameId
      );
      if (!selectedGame || selectedGame.status?.abstractGameState !== 'Live') {
        // Clear selection if game is no longer in progress
        setActiveGame(null);
        navigate('/', { replace: true });
      }
    }
  }, [rawGames, activeGameId, setActiveGame, navigate]);

  // Navigate to dashboard
  const goToDashboard = useCallback(() => {
    setActiveGame(null);
    navigate('/');
  }, [setActiveGame, navigate]);

  // Handle click on container to deselect game
  const handleContainerClick = useCallback(
    (e) => {
      // Only proceed if a game is selected
      if (!activeGameId) return;

      // Check if click was on a game card
      const closestCard = e.target.closest('.MuiCard-root');
      const closestGameHeader = e.target.closest('h1');

      // If click was not on a card or the header, deselect the game
      if (!closestCard && !closestGameHeader) {
        setActiveGame(null);
        navigate('/', { replace: true });
      }
    },
    [activeGameId, setActiveGame, navigate]
  );

  // Helper to get game state for a specific game
  const getGameStateForCard = useCallback(
    (gamePk) => {
      return getGame(String(gamePk));
    },
    [getGame]
  );

  return (
    <Container
      maxWidth="xl"
      sx={{
        mt: 6,
        mb: 5,
        '@media (min-width: 768px) and (max-width: 1199px)': {
          maxWidth: '90%',
        },
        '@media (min-width: 1200px)': {
          maxWidth: '80%',
        },
        px: { xs: 4, sm: 5 },
        cursor: 'default',
      }}
      onClick={handleContainerClick}
    >
      {/* Header */}
      <Header onTitleClick={goToDashboard} activeGameId={activeGameId} />

      <Grid container spacing={3}>
        {/* Main content */}
        <Grid item xs={12}>
          {/* Games List */}
          <GameList
            games={rawGames}
            getGameState={getGameStateForCard}
            gamesLoading={gamesLoading}
            gamesError={null}
            selectedGameId={activeGameId}
            onGameSelect={handleGameSelect}
            getGameEvents={() => []}
            acknowledgeEvent={() => {}}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default MainLayout;

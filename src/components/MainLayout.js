import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Grid } from '@mui/material';

import Header from './Header';
import GameList from './GameList';

import { useGameStore } from '../store/gameStore';
import { useGamePolling } from '../hooks/useGamePolling';
import * as audio from '../audio';

const MainLayout = ({ gameId }) => {
  const router = useRouter();

  const games = useGameStore((s) => s.games);
  const activeGameId = useGameStore((s) => s.activeGameId);
  const setActiveGame = useGameStore((s) => s.setActiveGame);

  useGamePolling({ interval: 1000 });

  // Audio engine is a page-level singleton — survives component remounts (HMR, Strict Mode).
  // Cleanup happens on page unload, not component unmount.
  useEffect(() => {
    const cleanup = () => audio.disconnect();
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);

  // Sync URL gameId with store
  useEffect(() => {
    setActiveGame(gameId || null);
  }, [gameId, setActiveGame]);

  const gamesLoading = Object.keys(games).length === 0;

  const handleGameSelect = useCallback(async (id) => {
    if (games[id]?.status !== 'Live') return;

    // Connect audio on first interaction (user gesture satisfies AudioContext requirement)
    if (!audio.isConnected()) {
      await audio.connect(useGameStore);
    }

    if (activeGameId === String(id)) {
      setActiveGame(null);
      router.replace('/');
    } else {
      setActiveGame(id);
      router.replace(`/${id}`);
    }
  }, [activeGameId, games, setActiveGame, router]);

  // Auto-deselect if active game is no longer live
  useEffect(() => {
    if (activeGameId && games[activeGameId]?.status !== 'Live' && Object.keys(games).length > 0) {
      setActiveGame(null);
      router.replace('/');
    }
  }, [games, activeGameId, setActiveGame, router]);

  const goToDashboard = useCallback(() => {
    setActiveGame(null);
    router.push('/');
  }, [setActiveGame, router]);

  const handleContainerClick = useCallback((e) => {
    if (!activeGameId) return;
    const closestCard = e.target.closest('.MuiCard-root');
    const closestHeader = e.target.closest('h1');
    if (!closestCard && !closestHeader) {
      setActiveGame(null);
      router.replace('/');
    }
  }, [activeGameId, setActiveGame, router]);

  return (
    <Container
      maxWidth="xl"
      sx={{
        mt: 6, mb: 5,
        '@media (min-width: 768px) and (max-width: 1199px)': { maxWidth: '90%' },
        '@media (min-width: 1200px)': { maxWidth: '80%' },
        px: { xs: 4, sm: 5 },
        cursor: 'default',
      }}
      onClick={handleContainerClick}
    >
      <Header onTitleClick={goToDashboard} activeGameId={activeGameId} />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <GameList
            games={Object.values(games)}
            gamesLoading={gamesLoading}
            selectedGameId={activeGameId}
            onGameSelect={handleGameSelect}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default MainLayout;

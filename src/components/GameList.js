import React from 'react';
import { Grid, Box, CircularProgress, Alert } from '@mui/material';
import GameCard from '../components/GameCard';

const GameList = ({ games, gamesLoading, selectedGameId, onGameSelect }) => {
  const live = games.filter((g) => g.status === 'Live');
  const final = games.filter((g) => g.status === 'Final');
  const preview = games.filter((g) => g.status === 'Preview');

  return (
    <>
      {gamesLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {live.length > 0 && (
          <>
            {live.map((game) => (
              <Grid item xs={12} sm={6} md={4} key={game.gameId}>
                <GameCard
                  game={game}
                  isSelected={game.gameId === selectedGameId}
                  onSelect={() => onGameSelect(game.gameId)}
                />
              </Grid>
            ))}
            {(final.length > 0 || preview.length > 0) && (
              <Grid item xs={12}>
                <Box sx={{ my: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }} />
              </Grid>
            )}
          </>
        )}

        {final.length > 0 && (
          <>
            {final.map((game) => (
              <Grid item xs={12} sm={6} md={4} key={game.gameId}>
                <GameCard game={game} isSelected={false} />
              </Grid>
            ))}
            {preview.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ my: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }} />
              </Grid>
            )}
          </>
        )}

        {preview.length > 0 && (
          <>
            {preview.map((game) => (
              <Grid item xs={12} sm={6} md={4} key={game.gameId}>
                <GameCard game={game} isSelected={false} />
              </Grid>
            ))}
          </>
        )}

        {!gamesLoading && games.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">No games scheduled for today</Alert>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default GameList;

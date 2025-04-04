import React, { useEffect } from 'react';
import { 
  Grid, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';

// Import components
import GameCard from '../components/GameCard';

/**
 * GameList component that shows all games
 */
const GameList = ({ 
  games, 
  gamesLoading, 
  gamesError, 
  selectedGameId, 
  onGameSelect,
  gameEvents = [],
  acknowledgeEvent = () => {}
}) => {
  // Process game events for sound triggers
  useEffect(() => {
    if (gameEvents.length > 0) {
      const currentEvent = gameEvents[0];
      console.log('Processing game event for sound:', currentEvent);
      
      // Here you would trigger your sound based on the event type
      // For example:
      // if (currentEvent.type === 'RUN_SCORED') {
      //   playSoundEffect('run');
      // } else if (currentEvent.type === 'OUT_RECORDED') {
      //   playSoundEffect('out');
      // }
      
      // Acknowledge the event after processing
      setTimeout(() => {
        acknowledgeEvent(0);
      }, 500);
    }
  }, [gameEvents, acknowledgeEvent]);

  return (
    <>
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
                  <GameCard 
                    game={game} 
                    isSelected={String(game.gamePk) === selectedGameId}
                    onSelect={() => onGameSelect(String(game.gamePk))}
                  />
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
                  <GameCard 
                    game={game} 
                    isSelected={false}
                  />
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
                  <GameCard 
                    game={game} 
                    isSelected={false}
                  />
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
    </>
  );
};

export default GameList; 
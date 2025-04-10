import React from 'react';
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
  gameEvents,
  acknowledgeEvent,
  detailedGameState
}) => {
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
              .map(game => {
                // If this is the selected game and we have detailed state, enhance the game object
                const isSelected = String(game.gamePk) === selectedGameId;
                
                // Check if we need to use detailed game state data
                let enhancedGame = game;
                
                // If there are detailed game state, use it for the selected game only
                if (isSelected && detailedGameState && String(game.gamePk) === selectedGameId) {
                  console.log('Using detailed game state for selected game', detailedGameState);
                  console.log('Runner states in detailed data:', detailedGameState.runners);
                  console.log('Current linescore offense data:', game.linescore?.offense);
                  
                  // Determine which runner data to use (prioritize non-empty sources)
                  const useDetailedRunners = Array.isArray(detailedGameState.runners) && 
                                             detailedGameState.runners.some(Boolean);
                  
                  const apiHasRunners = !!(game.linescore?.offense?.first?.id || 
                                          game.linescore?.offense?.second?.id || 
                                          game.linescore?.offense?.third?.id);
                  
                  // Log which source we're using
                  console.log('Using runners from: ' + 
                             (useDetailedRunners ? 'detailed state' : 
                              apiHasRunners ? 'game linescore' : 'no runners available'));
                  
                  // Choose runner data source (prefer data with runners)
                  const finalRunners = apiHasRunners ? 
                                      [game.linescore?.offense?.first?.id !== undefined,
                                       game.linescore?.offense?.second?.id !== undefined,
                                       game.linescore?.offense?.third?.id !== undefined] :
                                      useDetailedRunners ? detailedGameState.runners :
                                      [false, false, false];
                  
                  console.log('Final runner state:', finalRunners);
                  
                  // Use the runners data to override the linescore
                  enhancedGame = {
                    ...game,
                    linescore: {
                      ...game.linescore,
                      offense: {
                        first: finalRunners[0] ? { id: 1 } : undefined,
                        second: finalRunners[1] ? { id: 1 } : undefined,
                        third: finalRunners[2] ? { id: 1 } : undefined
                      }
                    }
                  };
                }
                
                // Pass any events related to this game
                const gameSpecificEvents = gameEvents && gameEvents.length > 0 
                  ? gameEvents.filter(event => !event.acknowledged)
                  : [];
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={game.gamePk}>
                    <GameCard 
                      game={enhancedGame}
                      isSelected={isSelected}
                      onSelect={() => onGameSelect(String(game.gamePk))}
                      events={gameSpecificEvents}
                      onAcknowledgeEvent={acknowledgeEvent}
                      detailedGameState={isSelected ? detailedGameState : null}
                    />
                  </Grid>
                );
              })
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
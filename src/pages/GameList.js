import React, { useState } from 'react';
import { 
  Grid, 
  Box, 
  CircularProgress,
  Alert,
  Typography,
  Switch,
  FormControlLabel
} from '@mui/material';

// Import components
import GameCard from '../components/GameCard';
import TestGameCard from '../components/TestGameCard';

/**
 * GameList component that shows all games
 */
const GameList = ({ 
  games, 
  getGameState,
  gamesLoading, 
  gamesError, 
  selectedGameId, 
  onGameSelect,
  getGameEvents,
  acknowledgeEvent,
  registerTestGame
}) => {
  // State for controlling the test game visibility
  const [showTestGame, setShowTestGame] = useState(true);
  
  // State for test game
  const [testGameState, setTestGameState] = useState(null);
  
  // Handle selection of test game
  const handleTestGameSelect = (testGameId, gameState) => {
    // Register the test game with the parent component so audio can use it
    if (registerTestGame) {
      registerTestGame(testGameId, gameState);
    }
    
    // Store the state locally
    setTestGameState(gameState);
    
    // Call the normal game selection handler
    onGameSelect(testGameId);
  };
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

      {/* Test Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showTestGame}
              onChange={(e) => setShowTestGame(e.target.checked)}
              color="warning"
            />
          }
          label={
            <Typography variant="body2" sx={{ color: '#f5a623' }}>
              Test Mode
            </Typography>
          }
        />
      </Box>

      {/* Games grid */}
      <Grid container spacing={3}>
        {/* Test Game Card */}
        {showTestGame && (
          <Grid item xs={12} sm={6} md={4}>
            <TestGameCard 
              onSelect={handleTestGameSelect}
              isSelected={selectedGameId && selectedGameId.startsWith('test-')}
            />
          </Grid>
        )}
        
        {/* Divider after test game if there are live games */}
        {showTestGame && games.filter(game => game.status.abstractGameState === 'Live').length > 0 && (
          <Grid item xs={12}>
            <Box sx={{ my: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }} />
          </Grid>
        )}
        
        {/* Active games */}
        {games.filter(game => game.status.abstractGameState === 'Live').length > 0 && (
          <>
            {games
              .filter(game => game.status.abstractGameState === 'Live')
              .map(game => {
                const gameId = String(game.gamePk);
                const isSelected = gameId === selectedGameId;
                const gameState = getGameState(gameId);
                const gameSpecificEvents = getGameEvents(gameId);
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={game.gamePk}>
                    <GameCard 
                      game={game}
                      gameState={gameState}
                      isSelected={isSelected}
                      onSelect={() => onGameSelect(gameId)}
                      events={gameSpecificEvents}
                      onAcknowledgeEvent={acknowledgeEvent}
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
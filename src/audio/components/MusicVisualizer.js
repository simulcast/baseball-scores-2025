import React from 'react';
import { Box, Typography, LinearProgress, Chip, Stack, Tooltip } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import useBaseballAudio from '../../hooks/useBaseballAudio';

/**
 * Visual representation of the musical elements generated from game state
 */
const MusicVisualizer = ({ gameState, gameId, gameEvents, selectedGame }) => {
  const { 
    isActive, 
    isAudioEnabled, 
    isBaseballAudioInitialized 
  } = useBaseballAudio({ 
    gameId, 
    gameState, 
    gameEvents 
  });

  // If no active game, audio disabled, or component not initialized, show nothing
  if (!isActive || !isAudioEnabled || !isBaseballAudioInitialized || !gameState) {
    return null;
  }

  // The transformGameState function now handles ensuring consistent data between the visualizer and GameCard

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 1,
        bgcolor: 'rgba(0, 0, 0, 0.2)'
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        <MusicNoteIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
        Music Generation
      </Typography>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {/* Balls rhythm */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Balls Rhythm
            </Typography>
            <Chip
              label={`${gameState.balls}/4`}
              size="small"
              color={gameState.balls > 0 ? "primary" : "default"}
              sx={{ height: 20 }}
            />
          </Stack>
          <Tooltip title={`${gameState.balls} pulses in a 4-step pattern`}>
            <LinearProgress
              variant="determinate"
              value={(gameState.balls / 4) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme => theme.palette.primary.main
                }
              }}
            />
          </Tooltip>
        </Box>

        {/* Strikes rhythm */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Strikes Rhythm
            </Typography>
            <Chip
              label={`${gameState.strikes}/3`}
              size="small"
              color={gameState.strikes > 0 ? "error" : "default"}
              sx={{ height: 20 }}
            />
          </Stack>
          <Tooltip title={`${gameState.strikes} pulses in a 3-step pattern`}>
            <LinearProgress
              variant="determinate"
              value={(gameState.strikes / 3) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme => theme.palette.error.main
                }
              }}
            />
          </Tooltip>
        </Box>

        {/* Outs rhythm */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Outs Rhythm
            </Typography>
            <Chip
              label={`${gameState.outs}/3`}
              size="small"
              color={gameState.outs > 0 ? "warning" : "default"}
              sx={{ height: 20 }}
            />
          </Stack>
          <Tooltip title={`${gameState.outs} pulses in a 3-step pattern`}>
            <LinearProgress
              variant="determinate"
              value={(gameState.outs / 3) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme => theme.palette.warning.main
                }
              }}
            />
          </Tooltip>
        </Box>

        {/* Runners rhythm */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Runners Rhythm
            </Typography>
            <Chip
              label={`${gameState.runners.filter(Boolean).length}/3`}
              size="small"
              color={gameState.runners.filter(Boolean).length > 0 ? "success" : "default"}
              sx={{ height: 20 }}
            />
          </Stack>
          <Tooltip title={`${gameState.runners.filter(Boolean).length} pulses in a 3-step pattern`}>
            <LinearProgress
              variant="determinate"
              value={(gameState.runners.filter(Boolean).length / 3) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme => theme.palette.success.main
                }
              }}
            />
          </Tooltip>
        </Box>

        {/* Inning complexity */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Inning Complexity
            </Typography>
            <Chip
              label={`${gameState.inning}/9`}
              size="small"
              color={gameState.inning >= 7 ? "secondary" : "default"}
              sx={{ height: 20 }}
            />
          </Stack>
          <Tooltip title={`Rhythm complexity increases with inning number`}>
            <LinearProgress
              variant="determinate"
              value={(gameState.inning / 9) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme => theme.palette.secondary.main
                }
              }}
            />
          </Tooltip>
        </Box>

        {/* Score Influence */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Score Differential
            </Typography>
            <Chip
              label={Math.abs(gameState.homeScore - gameState.awayScore)}
              size="small"
              color={Math.abs(gameState.homeScore - gameState.awayScore) > 0 ? "info" : "default"}
              sx={{ height: 20 }}
            />
          </Stack>
          <Tooltip title={`Affects musical tonality (major/minor)`}>
            <LinearProgress
              variant="determinate"
              value={Math.min(Math.abs(gameState.homeScore - gameState.awayScore) / 10, 1) * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme => theme.palette.info.main
                }
              }}
            />
          </Tooltip>
        </Box>

        {/* Key indicator */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Chip
            label={gameState.homeScore > gameState.awayScore ? 
              "HOME LEADING - MAJOR KEY" : 
              (gameState.awayScore > gameState.homeScore ? 
                "AWAY LEADING - MINOR KEY" : 
                "TIED GAME - NEUTRAL KEY")}
            size="small"
            color={gameState.homeScore > gameState.awayScore ? 
              "success" : 
              (gameState.awayScore > gameState.homeScore ? 
                "error" : 
                "default")}
          />
        </Box>
        
        {/* Show data source info for debugging - can be removed in production */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 2, pt: 1, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
              Last updated: {new Date(gameState.lastUpdate).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default MusicVisualizer;
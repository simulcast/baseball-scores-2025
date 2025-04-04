import React from 'react';
import { 
  Box, 
  Typography, 
  IconButton
} from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

/**
 * Header component that contains the app title and control buttons
 */
const Header = ({ 
  hasLiveGames, 
  audioMuted, 
  onTitleClick, 
  onAudioToggle 
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      border: '6px solid white',
      background: '#2d5a27',
      p: '16px 24px',
      mb: 4,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Typography 
        variant="h4" 
        component="h1" 
        sx={{ 
          fontWeight: 900,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8
          }
        }}
        onClick={onTitleClick}
      >
        Baseball Scores
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {hasLiveGames && (
          <IconButton 
            onClick={onAudioToggle} 
            color="inherit"
            sx={{ 
              border: '2px solid white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {!audioMuted ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default Header; 
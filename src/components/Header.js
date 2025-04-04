import React from 'react';
import { 
  Box, 
  Typography
} from '@mui/material';

/**
 * Header component that contains the app title
 */
const Header = ({ onTitleClick }) => {
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
    </Box>
  );
};

export default Header; 
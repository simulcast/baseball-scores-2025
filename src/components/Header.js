import React from 'react';
import { 
  Box, 
  Typography,
  Stack
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
      <Stack spacing={0.5}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 900,
            cursor: 'pointer',
            lineHeight: 1.2,
            fontSize: { xs: '1.8rem', sm: '2.125rem' },
            '&:hover': {
              opacity: 0.8
            }
          }}
          onClick={onTitleClick}
        >
          Baseball Scores
        </Typography>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            opacity: 0.8,
            fontWeight: 400,
            fontStyle: 'italic'
          }}
        >
          generative music based the state of the game
        </Typography>
      </Stack>
    </Box>
  );
};

export default Header; 
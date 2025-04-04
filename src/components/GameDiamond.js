import React from 'react';
import { Box, Paper } from '@mui/material';

/**
 * Baseball diamond component showing baserunners
 * 
 * @param {Object} props Component props
 * @param {Array<boolean>} props.runners Array of booleans indicating if there's a runner on [first, second, third]
 * @returns {JSX.Element} Baseball diamond component
 */
const GameDiamond = ({ runners = [false, false, false] }) => {
  const [first, second, third] = runners;

  return (
    <Paper 
      className="baseball-field" 
      sx={{ 
        position: 'relative', 
        width: 200, 
        height: 200, 
        margin: '0 auto', 
        backgroundColor: 'var(--grass-color)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
        boxShadow: 3
      }}
    >
      {/* Infield dirt */}
      <Box 
        sx={{ 
          position: 'absolute',
          width: 120,
          height: 120,
          backgroundColor: 'var(--infield-color)',
          transform: 'rotate(45deg)',
        }}
      />

      {/* Home plate */}
      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 40,
          width: 20,
          height: 20,
          backgroundColor: 'var(--home-plate-color)',
          clipPath: 'polygon(0% 30%, 50% 0%, 100% 30%, 100% 100%, 0% 100%)',
          zIndex: 2,
        }}
      />

      {/* First base */}
      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 100,
          right: 40,
          width: 15,
          height: 15,
          backgroundColor: first ? 'var(--runner-color)' : 'var(--base-color)',
          transform: 'rotate(45deg)',
          border: '2px solid var(--base-outline)',
          zIndex: 2,
        }}
      />

      {/* Second base */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 40,
          width: 15,
          height: 15,
          backgroundColor: second ? 'var(--runner-color)' : 'var(--base-color)',
          transform: 'rotate(45deg)',
          border: '2px solid var(--base-outline)',
          zIndex: 2,
        }}
      />

      {/* Third base */}
      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 100,
          left: 40,
          width: 15,
          height: 15,
          backgroundColor: third ? 'var(--runner-color)' : 'var(--base-color)',
          transform: 'rotate(45deg)',
          border: '2px solid var(--base-outline)',
          zIndex: 2,
        }}
      />

      {/* Pitcher's mound */}
      <Box 
        sx={{ 
          position: 'absolute',
          width: 12,
          height: 12,
          backgroundColor: 'white',
          borderRadius: '50%',
          zIndex: 1,
        }}
      />

      {/* Base lines */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 48,
          width: 106,
          height: 106,
          border: '2px solid white',
          borderTopWidth: 0,
          borderRightWidth: 0,
          transform: 'rotate(-45deg)',
          transformOrigin: 'top left',
          zIndex: 1,
        }}
      />
    </Paper>
  );
};

export default GameDiamond;
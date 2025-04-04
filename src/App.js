import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import pages
import Dashboard from './pages/Dashboard';
import GameView from './pages/GameView';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2d5a27', // Grass green
      light: '#3d7a35',
      dark: '#1d3a19',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b4513', // Dirt brown
      light: '#a35c1f',
      dark: '#6d3609',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1a2f16', // Dark green
      paper: '#2d5a27', // Grass green
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    error: {
      main: '#ff5252',
    },
    warning: {
      main: '#ffb74d',
    },
    info: {
      main: '#64b5f6',
    },
    success: {
      main: '#81c784',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 900,
    },
    h2: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 900,
    },
    h3: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Space Mono", monospace',
      fontWeight: 700,
    },
    button: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, rgba(45, 90, 39, 0.8), rgba(26, 47, 22, 0.8))',
          filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.3))',
          '&.MuiCard-root:not(.static-card)': {
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
            }
          }
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          filter: 'drop-shadow(10px 5px 3px rgba(255, 255, 255, 0.3))',
          '&:hover': {
            filter: 'drop-shadow(15px 8px 5px rgba(255, 255, 255, 0.4))',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, rgba(45, 90, 39, 0.8), rgba(26, 47, 22, 0.8))',
          filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.3))',
        },
        elevation1: {
          filter: 'drop-shadow(10px 5px 3px rgba(255, 255, 255, 0.3))',
        },
        elevation2: {
          filter: 'drop-shadow(12px 7px 4px rgba(255, 255, 255, 0.3))',
        },
        elevation3: {
          filter: 'drop-shadow(15px 10px 5px rgba(255, 255, 255, 0.3))',
        },
        elevation4: {
          filter: 'drop-shadow(17px 12px 6px rgba(255, 255, 255, 0.3))',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          filter: 'drop-shadow(5px 3px 2px rgba(255, 255, 255, 0.2))',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h1: {
          WebkitFilter: 'drop-shadow(8px 6px 4px rgba(139, 69, 19, 0.4))',
          filter: 'drop-shadow(8px 6px 4px rgba(139, 69, 19, 0.4))',
        },
        h2: {
          WebkitFilter: 'drop-shadow(6px 4px 3px rgba(139, 69, 19, 0.4))',
          filter: 'drop-shadow(6px 4px 3px rgba(139, 69, 19, 0.4))',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/games" element={<Dashboard />} />
          <Route path="/games/:gameId" element={<GameView />} />
          <Route path="*" element={<Navigate to="/games" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
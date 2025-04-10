import React, { useContext } from 'react';
import { 
  Box, 
  IconButton, 
  Slider, 
  Stack,
  Tooltip
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { AudioContext } from '../contexts/AudioContextExtended';

const AudioControls = () => {
  const { 
    audioEnabled, 
    audioInitialized, 
    volume,
    setVolume: updateVolume,
    toggleAudio
  } = useContext(AudioContext);

  const handleVolumeChange = (event, newValue) => {
    updateVolume(newValue);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'flex-end',
      border: '1px solid rgba(255,255,255,0.2)', // More subtle border
      borderRadius: '4px',
      padding: '4px 8px',
      background: 'rgba(0,0,0,0.2)'
    }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title={audioInitialized ? (audioEnabled ? "Mute" : "Unmute") : "Start Audio"}>
          <IconButton 
            onClick={toggleAudio} 
            color="primary"
            size="medium"
            aria-label={audioInitialized ? (audioEnabled ? "mute audio" : "unmute audio") : "start audio"}
          >
            {!audioInitialized ? <MusicNoteIcon /> : 
              audioEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </IconButton>
        </Tooltip>
        
        {audioInitialized && audioEnabled && (
          <Slider
            aria-label="Volume"
            value={volume}
            onChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.01}
            sx={{ width: 80 }}
            size="small"
          />
        )}
      </Stack>
    </Box>
  );
};

export default AudioControls;
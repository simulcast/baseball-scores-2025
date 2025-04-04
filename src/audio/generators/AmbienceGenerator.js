import * as Tone from 'tone';

export const createAmbienceNoise = () => {
  // Create noise source
  const noise = new Tone.Noise('pink').start();
  
  // Create a filter for the noise
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 800,
    Q: 1
  });
  
  // Create volume control
  const volume = new Tone.Volume(-20);
  
  // Connect the noise through the filter to the master output
  noise.connect(filter);
  filter.connect(volume);
  volume.toDestination();
  
  // Initially stop the noise
  noise.stop();
  
  // Return controller object
  return {
    start: () => noise.start(),
    stop: () => noise.stop(),
    setVolume: (val) => volume.volume.value = Tone.gainToDb(val),
    dispose: () => {
      noise.dispose();
      filter.dispose();
      volume.dispose();
    }
  };
};
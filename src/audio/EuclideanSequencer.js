/**
 * EuclideanSequencer
 * 
 * Implementation of Bjorklund's algorithm for Euclidean rhythm generation.
 * This algorithm distributes a number of pulses as evenly as possible across a sequence of steps.
 * 
 * Used for mapping game states (balls, strikes, outs, runners) to rhythmic patterns.
 */

// Generates an array representing an Euclidean rhythm
const generateEuclideanPattern = (steps, pulses, rotation = 0) => {
    // Handle edge cases
    if (pulses > steps) pulses = steps;
    if (pulses === 0) return Array(steps).fill(0);
    if (pulses === steps) return Array(steps).fill(1);
  
    // Bjorklund's algorithm implementation
    let pattern = [];
    const pauses = steps - pulses;
    
    if (pauses < pulses) {
      // Build pattern by interleaving pulses and pauses
      const per_pulse = Math.floor(pauses / pulses);
      const remainder = pauses % pulses;
      
      for (let i = 0; i < pulses; i++) {
        pattern.push(1);
        for (let j = 0; j < (i < remainder ? per_pulse + 1 : per_pulse); j++) {
          pattern.push(0);
        }
      }
    } else {
      // Same approach when pauses >= pulses
      const per_pause = Math.floor(pulses / pauses);
      const remainder = pulses % pauses;
      
      for (let i = 0; i < pauses; i++) {
        pattern.push(0);
        for (let j = 0; j < (i < remainder ? per_pause + 1 : per_pause); j++) {
          pattern.push(1);
        }
      }
    }
    
    // Trim to exact length (in case of rounding errors)
    pattern = pattern.slice(0, steps);
    
    // Apply rotation if specified
    if (rotation !== 0) {
      const rot = rotation % steps;
      pattern = [...pattern.slice(rot), ...pattern.slice(0, rot)];
    }
    
    return pattern;
  };
  
  /**
   * Creates a Tone.js sequence based on Euclidean rhythm parameters
   * 
   * @param {Object} Tone - The Tone.js library
   * @param {Object} options - Sequencer options
   * @param {Number} options.steps - Total number of steps in the pattern
   * @param {Number} options.pulses - Number of active beats in the pattern
   * @param {Number} options.rotation - Rotation to apply to the pattern
   * @param {Function} options.callback - Function to call on each active step
   * @param {String} options.subdivision - Tone.js time value for each step
   * @returns {Object} Tone.Sequence object
   */
  const createEuclideanSequence = (Tone, options) => {
    const { 
      steps = 8, 
      pulses = 4, 
      rotation = 0, 
      callback = () => {}, 
      subdivision = "16n" 
    } = options;
    
    const pattern = generateEuclideanPattern(steps, pulses, rotation);
    
    // Create the Tone.js sequence
    const sequence = new Tone.Sequence(
      (time, index) => {
        if (pattern[index] === 1) {
          callback(time, index);
        }
      },
      [...Array(steps).keys()], // Create array [0, 1, 2, ..., steps-1]
      subdivision
    );
    
    return {
      sequence,
      pattern,
      start: () => sequence.start(),
      stop: () => sequence.stop(),
      update: (newOptions) => {
        // Update and return a new sequence with new parameters
        sequence.stop();
        return createEuclideanSequence(Tone, {
          ...options,
          ...newOptions
        });
      }
    };
  };
  
  export { generateEuclideanPattern, createEuclideanSequence };
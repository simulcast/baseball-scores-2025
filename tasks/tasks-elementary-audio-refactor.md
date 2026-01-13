## Relevant Files

- `src/contexts/AudioContextExtended.js` - Main audio context management, needs conversion from Tone.js transport to Elementary renderer
- `src/audio/BaseballAudioEngine.js` - Core synthesis engine using Tone.Synth, needs complete rewrite to Elementary signals
- `src/audio/BaseballAudioEngine.test.js` - Unit tests for BaseballAudioEngine
- `src/audio/utils/audioUtils.js` - Audio utilities using Tone.gainToDb, needs Elementary equivalents
- `src/audio/utils/audioUtils.test.js` - Unit tests for audio utilities
- `src/audio/generators/AmbienceGenerator.js` - Pink noise generator using Tone.Noise, needs Elementary noise implementation
- `src/audio/generators/AmbienceGenerator.test.js` - Unit tests for ambience generator
- `src/audio/EuclideanSequencer.js` - Rhythmic sequencer using Tone.Sequence, needs Elementary sequencing
- `src/audio/EuclideanSequencer.test.js` - Unit tests for Euclidean sequencer
- `src/audio/elementary/ElementaryRenderer.js` - New file for Elementary WebRenderer management
- `src/audio/elementary/voices.js` - New file for Elementary audio signal definitions
- `src/audio/elementary/sequencing.js` - New file for Elementary-based sequencing logic

### Notes

- Unit tests should be updated alongside each component migration to ensure functionality is preserved
- Use `npm run test -- --testPathPattern=path/to/test` to run specific tests during migration
- Elementary requires user interaction to initialize audio context, similar to Tone.js
- All Tone.js imports should be replaced with @elemaudio/core and @elemaudio/web-renderer
- Consider creating a migration shim temporarily to allow gradual refactoring

## Tasks

- [ ] 1.0 Set up Elementary Audio dependencies and project structure
  - [x] 1.1 Install @elemaudio/core and @elemaudio/web-renderer packages
  - [x] 1.2 Create src/audio/elementary directory structure for Elementary-specific code
  - [x] 1.3 Set up ElementaryRenderer.js with WebRenderer initialization logic
  - [x] 1.4 Create voices.js for all Elementary signal definitions (synths, effects)
  - [ ] 1.5 Create sequencing.js for Elementary-based timing and sequencing utilities
  - [ ] 1.6 Add Elementary Audio documentation references to the project

- [ ] 2.0 Create Elementary renderer management system
  - [ ] 2.1 Implement ElementaryRenderer class with initialize(), render(), and updateParameter() methods
  - [ ] 2.2 Handle user interaction requirements for audio context initialization
  - [ ] 2.3 Set up virtual file system (VFS) loading for any future sample playback
  - [ ] 2.4 Implement master volume control using Elementary's signal multiplication
  - [ ] 2.5 Create event emission system for parameter updates using el.const nodes
  - [ ] 2.6 Add error handling and fallback mechanisms for audio initialization
  - [ ] 2.7 Write unit tests for ElementaryRenderer initialization and basic operations

- [ ] 3.0 Migrate audio synthesis and effects
  - [ ] 3.1 Convert Tone.Synth instances to Elementary oscillator-based voices (el.cycle, el.blepsaw)
  - [ ] 3.2 Implement pitch mapping system using el.midi2hz for note conversion
  - [ ] 3.3 Replace Tone.Reverb with Elementary reverb implementation using delays
  - [ ] 3.4 Convert Tone.Filter to el.lowpass/el.highpass nodes
  - [ ] 3.5 Implement Tone.FeedbackDelay equivalent using el.delay with feedback
  - [ ] 3.6 Replace Tone.Distortion with Elementary waveshaping techniques
  - [ ] 3.7 Create master effects chain using Elementary signal routing
  - [ ] 3.8 Implement ADSR envelopes for note articulation using el.adsr
  - [ ] 3.9 Convert volume controls from Tone.Volume to el.mul operations
  - [ ] 3.10 Write unit tests for each synthesized voice and effect

- [ ] 4.0 Implement Elementary-based sequencing
  - [ ] 4.1 Replace Tone.Transport with Elementary metro/train-based timing
  - [ ] 4.2 Convert Tone.Sequence to el.seq for pattern playback
  - [ ] 4.3 Implement Euclidean rhythm generation compatible with Elementary
  - [ ] 4.4 Create trigger signals for balls, strikes, outs, and runner sequences
  - [ ] 4.5 Implement pattern rotation and subdivision using Elementary utilities
  - [ ] 4.6 Handle tempo/BPM changes by updating metro rate signals
  - [ ] 4.7 Create sequence start/stop logic without relying on Transport
  - [ ] 4.8 Implement sequence callbacks that trigger Elementary voices
  - [ ] 4.9 Write unit tests for Euclidean pattern generation and sequencing

- [ ] 5.0 Integrate Elementary with existing React components
  - [ ] 5.1 Update AudioContextExtended to use ElementaryRenderer instead of Tone
  - [ ] 5.2 Modify BaseballAudioEngine to use Elementary voices and sequencing
  - [ ] 5.3 Convert AmbienceGenerator to use el.pinknoise() and Elementary filtering
  - [ ] 5.4 Update audioUtils.js to use el.db2gain instead of Tone.gainToDb
  - [ ] 5.5 Ensure all React hooks and context providers work with Elementary
  - [ ] 5.6 Update component props to use Elementary parameter update patterns
  - [ ] 5.7 Test audio responsiveness to game state changes
  - [ ] 5.8 Verify volume controls and mute functionality
  - [ ] 5.9 Run full integration tests with live game data
  - [ ] 5.10 Remove all Tone.js dependencies and imports after verification
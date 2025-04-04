Product Requirements Document: Baseball Scores
Project Overview
Baseball Scores is a web application that transforms live baseball games into generative, ambient music. Each game generates a unique soundtrack based on its current state, with musical patterns changing in response to game events like strikes, balls, outs, and scoring plays.
The interface resembles a traditional baseball scoreboard, but the experience is enhanced through an algorithmically generated soundtrack that reflects the rhythm, tension, and flow of live games.
Core Features

Live Game Dashboard

Overview of all today's MLB games
Quick audio preview of each game's current musical state
Visual indication of game status (pre-game, in progress, final)


Individual Game View

Traditional scoreboard display (inning, score, count, outs, runners)
Current batter and pitcher information
Full ambient soundtrack generation
Visual indication of which game states are affecting the music


Audio Generation

Euclidean rhythm sequences mapped to game states
One-shot audio cues for significant events
Continuous ambient background elements
Mobile-friendly audio playback


Game Navigation

"Channel surfing" interface to move between games
Smooth audio transitions between games
Option to return to dashboard



Technical Architecture
Frontend
Framework: React

Creates responsive UI components for mobile and desktop
Manages application state and routing
Handles audio generation via Tone.js

Key Libraries:

Tone.js - Audio synthesis and sequencing
Axios - API requests
React Router - Navigation between games
Styled Components - Responsive UI styling

Backend
Serverless Functions (Netlify Functions)

Proxies requests to MLB Stats API
Caches responses to reduce API calls
Processes raw game data into format optimized for frontend

Technology: Node.js

Easier integration with Netlify's serverless architecture
Good compatibility with JavaScript frontend

Data Flow

Game Data Retrieval

Backend polls MLB Stats API at regular intervals (30 seconds)
Changes in game state are detected and flagged
Frontend polls backend for updates


Audio Generation

All audio synthesis happens client-side with Tone.js
Game state maps to musical parameters
Significant events trigger one-shot sounds



Trade-offs
Server vs. Client-Side Game State Processing:

Recommendation: Process game state on the server
Benefits: Reduces client-side complexity, enables caching, prevents excessive API calls
Drawbacks: Additional server costs, potential latency in updates

Update Frequency:

Recommendation: Poll MLB Stats API every 30 seconds, with frontend checking every 10 seconds
Benefits: Balance between real-time feel and API rate limits
Drawbacks: Short delay between actual game events and audio response

Game State to Music Mapping
Base Musical Elements

Euclidean Rhythmic Patterns:

Balls: 4-step sequence with n pulses (where n = current balls)
Strikes: 3-step sequence with n pulses (where n = current strikes)
Outs: 3-step sequence with n pulses (where n = current outs)
Innings: 18-step sequence (9 innings × 2 halves)
Runners: 3-step sequence with pulses on positions with runners


Tonal Elements:

Score Differential: Determines key (major for leading team, minor for trailing team)
Inning Number: Affects chord progression complexity (later innings = more complex)
Runners in Scoring Position: Increases harmonic tension


Timbre & Atmosphere:

Late innings with close scores trigger more "tense" timbres
Early innings use more atmospheric, ambient sounds
Home vs. away affects stereo field placement



Event-Based Audio Cues

Home Run: Ascending melody with reverb tail
Strikeout: Short percussive sequence
Run Scored: Bell-like sound with rising pitch
Out Recorded: Low impact percussive hit
Hit: Mid-range percussive element with delay

User Interface
Dashboard View

Grid of all today's games
Each game shows:

Teams and logos
Current score
Inning and game status
Small audio preview button



Individual Game View

Large scoreboard display at top
Traditional baseball diamond showing runners
Current count (balls/strikes/outs)
Current batter and pitcher
Inning and score prominently displayed
Navigation controls to switch games

Responsive Design

Desktop: Side-by-side layout for scoreboard and controls
Mobile: Stacked layout with collapsible sections
Touch-friendly controls for game navigation

Development Roadmap
Phase 1: Core Infrastructure

Set up React application structure
Implement Netlify serverless functions
Establish MLB Stats API connection
Build basic UI components

Phase 2: Audio Engine

Implement Tone.js integration
Create mapping between game states and musical parameters
Develop Euclidean sequencer patterns
Build audio transition system

Phase 3: Complete UI

Finalize scoreboard design
Implement responsive layouts
Add "channel surfing" navigation
Polish transitions and animations

Phase 4: Testing & Optimization

Performance optimization for mobile
Audio output testing across devices
User testing with baseball fans
API consumption optimization

Technical Specifications
MLB Stats API Integration
Key Endpoints to Use:
Copyschedule() - Get today's games
game() - Get detailed game data
game_linescore() - Get inning-by-inning score
boxscore() - Get detailed statistics
Game State Polling:

Get list of today's games using schedule()
For each active game, fetch detailed state using game()
Process raw data into simplified game state object
Compare with previous state to detect changes
Send updated state to frontend

Audio Generation System
Tone.js Components:

Tone.Sequence - For Euclidean rhythm patterns
Tone.Players - For one-shot event sounds
Tone.FeedbackDelay, Tone.Reverb - For atmospheric effects
Tone.Synth, Tone.AMSynth, Tone.FMSynth - For melodic elements

Euclidean Rhythm Generation:
javascriptCopyfunction createEuclideanSequence(steps, pulses, rotation = 0) {
  // Implementation based on Bjorklund's algorithm
  // Map to musical notes/sounds
}
Example Mapping:
javascriptCopy// Ball count as sequence
const ballSequence = createEuclideanSequence(4, gameState.balls);

// Strike count as sequence
const strikeSequence = createEuclideanSequence(3, gameState.strikes);

// Outs as sequence
const outSequence = createEuclideanSequence(3, gameState.outs);

// Combine sequences with different instruments
State Management
Game State Object:
typescriptCopyinterface GameState {
  gameId: string;
  homeTeam: Team;
  awayTeam: Team;
  inning: number;
  isTopInning: boolean;
  balls: number;
  strikes: number;
  outs: number;
  runners: boolean[]; // [first, second, third]
  homeScore: number;
  awayScore: number;
  currentPitcher: Player;
  currentBatter: Player;
  lastUpdate: Date;
}
Event Detection:
javascriptCopyfunction detectEvents(previousState, currentState) {
  // Detect significant changes between states
  // Return array of events (homerun, strikeout, etc.)
}
User Experience Considerations

Audio Autoplay Restrictions

Require user interaction before starting audio
Clear play/pause controls for all audio
Volume controls with reasonable defaults


Performance

Limit number of simultaneous audio sources
Optimize for mobile CPU/battery usage
Progressive loading of audio assets


Accessibility

Visual indicators of audio patterns
Text descriptions of game events
Keyboard navigation support



Conclusion
The Baseball Scores creates a novel way to experience baseball games through generative music. By mapping game states to musical parameters, it creates an ambient soundtrack that evolves with the game, adding an emotional and artistic dimension to following baseball.
This project combines real-time data, web audio technology, and baseball statistics to create an immersive, mobile-friendly experience that works both as a practical scoreboard and as an artistic interpretation of America's pastime.
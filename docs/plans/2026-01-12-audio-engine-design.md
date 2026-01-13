# Audio Engine Design

**Date:** 2026-01-12
**Status:** Approved
**Dependency:** Requires state management refactor (2026-01-12-state-management-refactor-design.md)

## Overview

A generative ambient audio engine that transforms live baseball game state into evolving music. The listener should feel the temporal experience of baseball—long stretches of tension, sudden releases, the slow build across innings.

**Aesthetic:** Brian Eno / Harold Budd (ambient, textural, patient) + Laurie Spiegel (algorithmic, evolving patterns)

## Core Principles

1. **Continuous evolution is primary** — Music parameters smoothly interpolate as game state changes
2. **Events are subtle punctuation** — Game events shift the texture, not interrupt it
3. **No perceivable pulse** — Euclidean math creates probability landscapes, not rhythmic grids
4. **Studio quality** — Lush, full-spectrum, carefully EQ'd and panned

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Elementary Audio | Declarative/functional, diff-based rendering, clean Zustand integration |
| Rhythm approach | Euclidean density curves | Probability-based events, no metronomic feel |
| Harmonic evolution | Slow drift + rapid modulation on lead change | Captures game's emotional arc |
| Voice count | 8-12 across all layers | Lush but CPU-friendly |
| Tension expression | Filter, register, density, reverb | Subtle, felt not heard |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Audio Engine                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Game State  │───▶│  Interpreter │───▶│  Voice Manager   │  │
│  │  Subscriber  │    │              │    │                  │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                   │                     │             │
│         │                   ▼                     ▼             │
│         │           ┌──────────────┐    ┌──────────────────┐   │
│         │           │  Euclidean   │    │  Layer Renderers │   │
│         │           │  Density     │    │  (6 layers)      │   │
│         │           │  Engine      │    └──────────────────┘   │
│         │           └──────────────┘             │              │
│         │                   │                    ▼              │
│         │                   └──────────▶┌──────────────────┐   │
│         │                               │  Effects Chain   │   │
│         │                               │  (per-layer +    │   │
│         │                               │   master bus)    │   │
│         │                               └──────────────────┘   │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Elementary Audio Renderer                   │   │
│  │              (declarative signal graph)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Game State → Musical Parameters

### Input (from Zustand store)

```javascript
{
  inning: 7,
  inningState: 'Bottom',
  balls: 2,
  strikes: 1,
  outs: 2,
  runners: [true, false, true],
  homeScore: 3,
  awayScore: 4,
  timeSinceLastChange: 12.5
}
```

### Output (musical parameters)

```javascript
{
  tonalCenter: 'D',
  mode: 'dorian',
  chordColor: [0, 3, 7, 10],
  tension: 0.78,

  drone: { pitch: 'D2', brightness: 0.6 },
  pad: { voicing: ['D3', 'F3', 'A3', 'C4'], filterCutoff: 2200 },
  bells: { densityProbability: 0.4, register: 'high' },
  air: { amount: 0.3 },
  shimmer: { intensity: 0.5 },
  ghostMelody: { noteProbability: 0.2, scalePosition: 4 },

  ambientActivity: 0.35,
  breathing: 'inhale',
  events: []
}
```

### Mapping Hierarchy

| Game State | Musical Effect | Priority |
|------------|----------------|----------|
| Inning | Macro texture, tempo of evolution | 1 |
| Score differential | Tonality (major/minor/modal color) | 2 |
| Runners + outs | Tension level | 3 |
| Count | Micro-density variations | 4 |
| Time since last change | Ambient activity probability | 5 |
| Inning state (Mid/End) | Breathing space | 6 |

### Tension Calculation

```javascript
tension = weighted average of:
  - outs (0-2) → 0, 0.3, 0.7
  - runners in scoring position → +0.2 per runner on 2nd/3rd
  - count pressure → strikes weighted higher than balls
  - inning (7+ = late) → +0.15
  - score differential (≤2 = close) → +0.2
```

## Euclidean Density Engine

**Probability landscapes, not pulse grids.**

Multiple Euclidean patterns run at different prime-number cycle lengths to avoid alignment:

```javascript
const patterns = [
  { pulses: 3, steps: 8, cycleDuration: 45 },
  { pulses: 5, steps: 13, cycleDuration: 73 },
  { pulses: 2, steps: 5, cycleDuration: 31 },
];
```

### Ambient Event Firing

```javascript
function shouldFireAmbientEvent(layer, currentTime, gameState) {
  const euclideanDensity = combinedDensityCurves.at(currentTime);

  const silenceFactor = Math.min(gameState.timeSinceLastChange / 30, 1);

  const breathingFactor = (gameState.inningState === 'Mid' || gameState.inningState === 'End')
    ? 0.3 : 1.0;

  const layerBase = layer.densityProbability;

  const probability = euclideanDensity * silenceFactor * breathingFactor * layerBase;

  return Math.random() < probability;
}
```

## Layer Specifications

### The Six Layers

| Layer | Voices | Frequency Range | Attack/Release | Game State Driver |
|-------|--------|-----------------|----------------|-------------------|
| **Drone** | 1-2 | 80-200 Hz | 4s / 6s | Tonal center, score differential |
| **Pad** | 3-4 | 150-800 Hz | 2s / 4s | Chord voicing, tension → filter |
| **Bell/Glass** | 2-3 | 400-4000 Hz | 0.01s / 3s | Euclidean probability, count/runners |
| **Air/Texture** | 1 | 2000-12000 Hz | 1s / 2s | Inning state, time since change |
| **Shimmer** | 1-2 | 1000-8000 Hz | 3s / 8s | Emotional peaks, lead changes |
| **Ghost Melody** | 1 | 300-1200 Hz | 0.5s / 2s | Inning arc, new batter |

### Synthesis Per Layer

```
Drone:    Layered sines (fundamental + sub-octave) + gentle saturation
Pad:      Filtered saw → low-pass filter modulated by tension → chorus
Bell:     2-operator FM (carrier:modulator ratio 1:2.4) → reverb send
Air:      Filtered pink noise → band-pass sweep → very wet reverb
Shimmer:  Octave-up pitch shift of pad → long diffuse reverb → high-pass
Ghost:    Sine + slight FM → subtle vibrato → delay + reverb
```

### Voice Stealing Priority

1. Steal from Air (least noticeable)
2. Steal from Shimmer (decorative)
3. Steal oldest Bell voice
4. Never steal Drone or active Pad voices

## Effects Chain

### Signal Flow

```
Layer Voices → Filter → Saturation → Reverb Send
                                          │
                                          ▼
                                    Reverb Bus (shared)
                                          │
┌─────────────────────────────────────────┼─────────────────────┐
│                   Master Bus            ▼                     │
│  Soft Clip → EQ → Compressor → Limiter (-1dB)                │
└───────────────────────────────────────────────────────────────┘
```

### Reverb Settings

```javascript
reverb: {
  preDelay: 30,
  decay: 4.5,
  damping: 0.4,
  diffusion: 0.9,
  modulation: 0.2,
  mix: 0.35
}
```

### Stereo Field (Panning)

| Layer | Stereo Treatment |
|-------|------------------|
| **Drone** | Mono center |
| **Pad** | Wide stereo (80-100%) |
| **Bell/Glass** | Placed across field: -70%, -25%, +25%, +70% |
| **Air/Texture** | Full stereo width (100%) |
| **Shimmer** | Wide stereo + subtle auto-pan |
| **Ghost Melody** | Slightly off-center (±15-30%) |

### EQ Per Layer

| Layer | Low Cut | Notable EQ | High Cut |
|-------|---------|------------|----------|
| **Drone** | — | -2dB @ 400Hz | 800 Hz |
| **Pad** | 100 Hz | +2dB @ 3kHz | 10 kHz |
| **Bell/Glass** | 300 Hz | +3dB @ 5kHz | 12 kHz |
| **Air/Texture** | 1.5 kHz | +2dB @ 8kHz | — |
| **Shimmer** | 800 Hz | -6dB @ 400Hz | — |
| **Ghost Melody** | 200 Hz | +1dB @ 800Hz | 6 kHz |

### Tension Modulates Effects

| Parameter | Low Tension | High Tension |
|-----------|-------------|--------------|
| Filter cutoff | Lower (darker) | Higher (brighter) |
| Reverb decay | Longer (spacious) | Shorter (present) |
| Saturation | Less | Slightly more |
| Compressor ratio | 1.5:1 | 2:1 (tighter) |
| Stereo width | Full (1.0) | Narrower (0.8) |

## Game Event Responses

**Subtle texture shifts, not sound effects.**

| Event | Musical Response | Duration |
|-------|------------------|----------|
| **Strike** | Bell in upper register, filter sweep up | 2-3s |
| **Ball** | Pad filter opens slightly, ghost melody nudge | 2s |
| **Out** | Density increase then release, pad chord shifts | 3-4s |
| **Hit** | Shimmer swell, bells cascade (2-3 notes) | 3-4s |
| **Run Scored** | Harmonic lift, shimmer peaks | 4-5s |
| **Home Run** | Full harmonic shift up, all layers brighten | 5-6s |
| **Strikeout** | Tension release—filter down, reverb opens | 4s |
| **Walk** | Gentle bell arpeggio (3 notes ascending) | 3s |
| **Lead Change** | **Immediate modulation** to new harmonic center | Sustains |
| **Inning End** | All layers fade, reverb extends, breathing | 6-8s |
| **Inning Start** | Subtle density increase, new chord establishes | 4-5s |

## Elementary Audio Integration

### Store Connection

```javascript
class AudioEngine {
  async initialize() {
    this.audioContext = new AudioContext();
    this.renderer = new WebRenderer();

    const node = await this.renderer.initialize(this.audioContext, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    node.connect(this.audioContext.destination);

    this.unsubscribe = useGameStore.subscribe(
      (state) => state.games.get(state.activeGameId),
      (gameState, prevGameState) => this.onGameStateChange(gameState, prevGameState)
    );
  }

  onGameStateChange(gameState, prevGameState) {
    const events = detectEvents(prevGameState, gameState);
    const params = interpret(gameState, events, this.currentParams);
    this.render(params);
    this.currentParams = params;
  }
}
```

### Keyed Nodes for Smooth Transitions

```javascript
function renderDrone(params) {
  return el.mul(
    el.const({ key: 'drone-amp', value: params.amplitude }),
    el.lowpass(
      el.const({ key: 'drone-cutoff', value: params.filterCutoff }),
      1.0,
      el.cycle({ key: 'drone-osc', freq: params.frequency })
    )
  );
}
```

Keys ensure Elementary morphs existing nodes rather than destroying/recreating.

## File Structure

```
src/audio/
├── index.js                 # Public API: connect(), disconnect()
├── engine.js                # AudioEngine class, Elementary renderer
├── interpreter.js           # Game state → musical parameters
├── euclidean.js             # Density curve generation
├── events.js                # Event detection and response mapping
├── harmony.js               # Scale/chord definitions, modulation
├── layers/
│   ├── index.js
│   ├── drone.js
│   ├── pad.js
│   ├── bells.js
│   ├── air.js
│   ├── shimmer.js
│   └── ghostMelody.js
├── effects/
│   ├── index.js
│   ├── reverb.js
│   ├── filter.js
│   ├── eq.js
│   └── dynamics.js
├── voices.js                # Voice allocation and stealing
└── constants.js             # Frequencies, timing, tuning
```

## Public API

```javascript
// src/audio/index.js

export async function connect()      // Initialize, subscribe to store
export function disconnect()         // Cleanup
export function setMasterVolume(v)   // 0-1
export function isConnected()        // Boolean
```

## Dependencies

```json
{
  "@elemaudio/core": "^4.0.x",
  "@elemaudio/web-renderer": "^4.0.x"
}
```

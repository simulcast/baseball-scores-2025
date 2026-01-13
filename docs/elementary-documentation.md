# Elementary Audio: Library Documentation

Welcome to the official documentation for Elementary Audio, a high-performance, declarative audio engine. This guide is designed for junior developers and provides everything you need to start building rich audio experiences.

## 1. Overview

Elementary is a JavaScript library for writing declarative, functional audio applications. It uses a highly optimized C++ audio engine under the hood, allowing you to describe complex audio signal processing graphs in a simple, expressive way. Instead of manually managing audio nodes and their connections, you describe *what* your audio should sound like, and Elementary handles the *how*.

**Key Benefits:**

* **Declarative:** Describe your audio signal chain with a functional API. No more manual node management.
* **High Performance:** The core processing is done in a lean, real-time-safe C++ engine.
* **Cross-Platform:** Run the same audio code in the browser, on the server with Node.js, or in native desktop applications.
* **Dynamic & Expressive:** Easily create complex, evolving sounds and musical patterns.

**Before and After Elementary:**

Here’s a simple example of creating a sine wave with a tremolo effect (a low-frequency oscillator modulating the amplitude).

**Before (Standard Web Audio API):**

```javascript
const audioContext = new AudioContext();

// Create nodes
const osc = audioContext.createOscillator();
const lfo = audioContext.createOscillator();
const gain = audioContext.createGain();

// Configure nodes
osc.type = 'sine';
osc.frequency.value = 440;
lfo.type = 'sine';
lfo.frequency.value = 5;

// Connect the graph
lfo.connect(gain.gain);
osc.connect(gain);
gain.connect(audioContext.destination);

// Start the oscillators
osc.start();
lfo.start();
```

**After (Elementary):**

```javascript
import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';

const core = new WebRenderer();

async function main() {
  const tremolo = el.mul(
    el.cycle(el.sm(el.const({key: 'lfo:freq', value: 5}))), // LFO
    el.sm(el.const({key: 'tremolo:depth', value: 0.5}))     // LFO depth
  );

  const signal = el.mul(
    el.cycle(el.sm(el.const({key: 'main:freq', value: 440}))), // Main oscillator
    el.add(1, tremolo)                                       // Apply tremolo
  );

  core.render(signal, signal);
}

main();
```

## 2. Quick Start

This guide will get you running with Elementary in the browser in under 5 minutes.

**1. Installation:**

Create a new project, and install the necessary Elementary packages.

```bash
npm init -y
npm install @elemaudio/core @elemaudio/web-renderer
```

**2. Minimal Working Example:**

Create an `index.html` file and an `index.js` file.

**`index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Elementary Quick Start</title>
</head>
<body>
  <h1>Elementary Quick Start</h1>
  <p>Click this page to start the audio.</p>
  <script type="module" src="index.js"></script>
</body>
</html>
```

**`index.js`:**
```javascript
import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';

// Create our core audio renderer
const core = new WebRenderer();

// Main async function to set up and run our audio
async function main() {
  // A simple event listener to start audio on user interaction
  document.body.addEventListener('click', async () => {
    console.log('Audio context starting');
    await core.initialize();

    // Create a sine wave oscillator at 440Hz
    const sineWave = el.cycle(440);

    // Render the sine wave to both the left and right channels
    core.render(sineWave, sineWave);
  });
}

main();
```

**3. Run it:**

You'll need a simple local server to run this due to browser security policies. If you have Node.js, you can use `http-server`.

```bash
# If you don't have it, install it globally
npm install -g http-server

# Run the server in your project directory
http-server
```

Now, open your browser to `http://localhost:8080`. Click anywhere on the page, and you should hear a pure 440Hz sine wave tone.

**Expected Output:**

You will hear a steady sine wave tone. In your browser's developer console, you will see the "Audio context starting" message when you click the page.

## 3. Installation & Setup

### For Web Projects

For browser-based projects, you need the core library and the web renderer.

```bash
npm install @elemaudio/core @elemaudio/web-renderer
```

**Configuration:**

The `WebRenderer` must be initialized after a user interaction (like a click or key press) to comply with browser autoplay policies.

```javascript
import WebRenderer from '@elemaudio/web-renderer';
const core = new WebRenderer();

document.body.addEventListener('click', async () => {
  await core.initialize();
  // Now you can render audio
});
```

### For Native/Node.js Projects

For running Elementary outside the browser (e.g., for offline rendering or in a desktop app), you'll use the native renderer.

```bash
npm install @elemaudio/core @elemaudio/node-renderer
```

You will also need a C++ compiler (`g++` or `clang`) and `cmake` installed on your system for the native dependencies to build correctly.

## 4. Core Concepts

* **Core:** The heart of Elementary. It's a reference to the underlying audio engine (either `WebRenderer` or `NodeRenderer`). You use it to initialize the audio context and render your signal.
* **Signals (`el.*`)**: Everything in Elementary is a signal. A number like `440` is a constant signal. A sine wave `el.cycle(440)` is a time-varying signal. You combine signals to create more complex signals.
* **Declarative Graph:** You don't create nodes and connect them. You write a single expression that *describes* the final output. Elementary analyzes this expression and builds the underlying audio graph for you.
* **Immutability:** When you want to change a sound, you don't modify the existing graph. You call `core.render()` again with a *new* expression. Elementary is smart enough to only update the parts of the graph that have changed.
* **Hot-Reloading:** Because of the declarative and immutable nature, Elementary is excellent for live coding environments. You can change your code, and the sound updates instantly without clicks or pops.

## 5. In-Depth Usage Guides

This section provides step-by-step guides for common, real-world tasks. We will cover how to build an effects chain, how to load and play audio files, and how to create a drum sequencer.

### Guide 1: Creating an Effects Chain

An effects chain processes a sound source sequentially through one or more effects. In Elementary, this is achieved by nesting function calls. The signal flows from the innermost function to the outermost.

Let's create a classic synthesizer sound: a sawtooth wave running through a resonant low-pass filter, and then into a stereo delay.

**Signal Flow:** `Sawtooth Wave` -> `Low-Pass Filter` -> `Stereo Delay` -> `Output`

**Code:**

```javascript
import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';

const core = new WebRenderer();

document.body.addEventListener('click', () => core.initialize());

// Let's define our synth voice
function synthVoice() {
  // STEP 1: The Sound Source
  // A band-limited sawtooth oscillator at Middle C (MIDI note 60).
  // We use el.blepsaw for a richer tone than el.saw with less aliasing.
  const source = el.blepsaw(el.midi2hz(60));

  // STEP 2: The Low-Pass Filter
  // We feed the `source` into a resonant low-pass filter.
  // The filter's cutoff frequency will sweep slowly, creating movement.
  const filteredSource = el.lowpass(
    {
      // Cutoff sweeps from 400Hz to 1200Hz every 3 seconds
      cutoff: el.add(800, el.mul(400, el.cycle(0.33))),
      // A high Q factor creates a resonant, "bubbly" sound
      Q: 10,
    },
    source
  );

  // STEP 3: The Stereo Delay Effect
  // We feed the `filteredSource` into a stereo delay. `el.delay` takes
  // an array of delay times for multichannel effects.
  const wetSignal = el.delay(
    {
      // Delay times for left and right channels
      size: 44100, // Max delay buffer size
      times: [el.ms2samps(300), el.ms2samps(500)]
    },
    el.mul(0.5, filteredSource) // Send a copy of the signal to the delay
  );

  // STEP 4: Mix and Output
  // We mix the original (dry) signal with the delayed (wet) signal.
  const drySignal = el.mul(0.4, filteredSource);

  // finalOutput is a stereo signal [left, right]
  const finalOutput = el.add(drySignal, wetSignal);

  return finalOutput;
}

// Render the output of our synth voice
const output = synthVoice();
core.render(output, output); // In a real stereo setup, you'd render output[0] and output[1]
```

### Guide 2: Playback and Manipulating Samples

Elementary can play back raw audio data (like `.wav` or `.mp3` files) using the `el.sample` node. This requires two steps:

1.  **Loading Audio Data:** You must first load your audio file and convert it into a `Float32Array`. Browsers have built-in tools for this.
2.  **Virtual File System (VFS):** You provide the audio data to Elementary via a "Virtual File System" during initialization. This is just a JavaScript object mapping a path name to your audio data.

**Code:**

```javascript
import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';

// This is a placeholder URL for a .wav file.
// Use a real URL to one of your own sound files.
const SAMPLE_URL = '[https://my-sounds.com/my-kick-drum.wav](https://my-sounds.com/my-kick-drum.wav)';
const VFS_PATH = '/kick.wav';

const core = new WebRenderer();

// Helper function to fetch and decode a sample
async function loadSample(audioContext, url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  // The browser's native audio decoder
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  // We want the raw channel data as a Float32Array
  return audioBuffer.getChannelData(0);
}

async function main() {
  // We need a temporary AudioContext just for decoding the sample
  const decodingContext = new AudioContext();
  const kickSampleData = await loadSample(decodingContext, SAMPLE_URL);
  decodingContext.close(); // We don't need it anymore

  // Now we can initialize the Elementary renderer with our sample
  await core.initialize({
    // The virtual file system
    virtualFileSystem: {
      [VFS_PATH]: kickSampleData,
    },
  });

  // A trigger signal that fires twice a second (120 BPM)
  const trigger = el.train(2);

  // The el.sample node plays back the audio data found at `path`
  // every time the `trigger` signal sends a pulse.
  const kickDrum = el.sample(
    {
      path: VFS_PATH,
      mode: 'gate', // Play the sample each time the gate is high
    },
    trigger
  );

  core.render(kickDrum, kickDrum);
}

// Wait for a click to start everything
document.body.addEventListener('click', main);
```

### Guide 3: Synchronizing Audio (A Drum Sequencer)

Now, let's combine sample playback and sequencing to build a simple 3-track, 8-step drum machine.

**Logic:**

1.  Load three samples: Kick, Snare, and Hi-hat.
2.  Create three arrays representing the 8-step pattern for each drum. `1` means play, `0` means rest.
3.  Use a master clock (`el.metro`) to drive a step counter.
4.  Use `el.seq` to read the pattern for each drum based on the current step.
5.  Use the output of each `el.seq` to trigger the corresponding `el.sample` node.
6.  Mix all three drum tracks together.

**Code:**

```javascript
import { el } from '@elemaudio/core';
import WebRenderer from '@elemaudio/web-renderer';

// Assumes you have these samples hosted somewhere
const KICK_URL = '[https://my-sounds.com/kick.wav](https://my-sounds.com/kick.wav)';
const SNARE_URL = '[https://my-sounds.com/snare.wav](https://my-sounds.com/snare.wav)';
const HAT_URL = '[https://my-sounds.com/hat.wav](https://my-sounds.com/hat.wav)';

const core = new WebRenderer();

// (loadSample helper function from previous example goes here)

async function main() {
  const audioContext = new AudioContext();
  // Load all three samples in parallel
  const [kickData, snareData, hatData] = await Promise.all([
    loadSample(audioContext, KICK_URL),
    loadSample(audioContext, SNARE_URL),
    loadSample(audioContext, HAT_URL),
  ]);
  audioContext.close();

  // Initialize with all three samples in the VFS
  await core.initialize({
    virtualFileSystem: {
      '/kick.wav': kickData,
      '/snare.wav': snareData,
      '/hat.wav': hatData,
    },
  });

  // Define our 8-step patterns
  const kickPattern = [1, 0, 0, 0, 1, 0, 0, 0];
  const snarePattern = [0, 0, 1, 0, 0, 0, 1, 0];
  const hatPattern = [1, 1, 1, 1, 1, 1, 1, 1];

  // The master clock: a metronome ticking 8 times per second (120BPM 8th notes)
  const masterClock = el.metro(8);

  // Create a trigger for each instrument
  const kickTrigger = el.seq({ seq: kickPattern }, masterClock);
  const snareTrigger = el.seq({ seq: snarePattern }, masterClock);
  const hatTrigger = el.seq({ seq: hatPattern }, masterClock);

  // Create the sample players
  const kick = el.sample({ path: '/kick.wav' }, kickTrigger);
  const snare = el.sample({ path: '/snare.wav' }, snareTrigger);
  const hat = el.mul(0.6, el.sample({ path: '/hat.wav' }, hatTrigger)); // Hat is a bit quieter

  // Mix them all together
  const mix = el.add(kick, snare, hat);

  // Render the final mix, scaled down to prevent clipping
  const finalOutput = el.mul(0.7, mix);
  core.render(finalOutput, finalOutput);
}

document.body.addEventListener('click', main);
```

## 6. API Reference (Expanded)

### `el.lowpass({cutoff, Q}, signal)`

**What it does:** A standard second-order resonant low-pass filter.

**When to use it:** For removing high frequencies from a signal, making sounds darker or more muted. Essential for subtractive synthesis.

**Parameters:**
- `props` (object):
    - `cutoff` (signal): The frequency in Hz above which the signal is attenuated.
    - `Q` (signal): Controls the resonance or "peak" at the cutoff frequency. Values from 1-20 are typical.
- `signal` (signal): The input signal to filter.

**Returns:** `signal` - The filtered audio signal.

**Example:**
```javascript
const noisySound = el.pinknoise();
// A filter with a fixed cutoff at 500Hz
const muffledSound = el.lowpass({cutoff: 500, Q: 2}, noisySound);
```

### `el.delay({size, times}, signal)`

**What it does:** A multi-tap delay line for creating echoes.

**When to use it:** For creating echo, chorus, or flanging effects. Can be mono or stereo.

**Parameters:**
- `props` (object):
    - `size` (number): The maximum delay time in samples. Must be larger than any value in `times`. 44100 is a safe bet for 1 second.
    - `times` (signal | array): A signal or array of signals representing the delay time(s) in samples. Use an array for stereo/multichannel delays.
- `feedback` (signal): A signal from 0-1 controlling how much of the delayed signal is fed back into the delay line.
- `signal` (signal): The input signal to delay.

**Returns:** `signal` - The wet (delayed) audio signal.

**Example:**
```javascript
// A simple mono echo
const voice = el.cycle(440);
const echo = el.delay({size: 44100, times: el.ms2samps(250), feedback: 0.5}, voice);
const wetDryMix = el.add(voice, echo);
```

### `el.sample({path, mode, start, end}, trigger)`

**What it does:** Plays back audio data from the Virtual File System.

**When to use it:** For playing drum hits, vocal clips, instrument one-shots, or any pre-recorded audio.

**Parameters:**
- `props` (object):
    - `path` (string): The path to the sample in the VFS (e.g., `/drums/kick.wav`).
    - `mode` (string, optional): How the sample is triggered. `'gate'` (default) plays while the trigger is > 0. `'trigger'` plays the full sample on a rising edge.
    - `start` (number, optional): Start offset in samples.
    - `end` (number, optional): End offset in samples.
- `trigger` (signal): A signal used to trigger playback.

**Returns:** `signal` - The audio from the sample.

**Example:**
```javascript
// Assumes a sample is loaded at '/piano.wav'
const trigger = el.train(1); // Play once per second
const pianoNote = el.sample({path: '/piano.wav', mode: 'trigger'}, trigger);
```
**Common Mistakes:**
- ❌ Forgetting to provide the sample data in the `virtualFileSystem` during `core.initialize()` will result in silence.

### `el.seq({seq, hold}, trigger)`

**What it does:** Steps through a sequence of values, advancing on each `trigger` pulse.

**When to use it:** The core of any step-sequencer. Use it to sequence notes, gate patterns, or parameter values.

**Parameters:**
- `props` (object):
    - `seq` (array): The array of values to sequence through.
    - `hold` (boolean, optional): If `true`, the last value is held after the sequence finishes. If `false` (default), it outputs 0.
- `trigger` (signal): A signal that advances the sequencer to the next step.

**Returns:** `signal` - The current value from the sequence.

**Example:**
```javascript
// A simple 4-note melody
const notes = [60, 62, 64, 65];
const clock = el.train(4); // 4 notes per second
const melodySeq = el.seq({seq: notes, hold: true}, clock);
const freq = el.midi2hz(melodySeq);
const osc = el.cycle(freq);
```

Of course. I have analyzed the core library files to compile a comprehensive list of primitives.

Here is the updated documentation with the expanded API reference section, categorized for clarity.

---

### `/docs/elementary-documentation.md` (Updated API Reference Section)

... (All previous sections remain the same) ...

## 6. Comprehensive API Reference

This section provides a detailed reference for the primitive nodes available in the `@elemaudio/core` library, accessible via the `el` object.

### Oscillators & Generators

These nodes are the primary sources of sound.

---

#### `el.cycle(freq)`

* **What it does:** Generates a sine wave oscillator.
* **When to use it:** For creating pure tones, LFOs, or as a building block for additive synthesis.
* **Parameters:**
    * `freq` (signal): The frequency of the wave in Hz.
* **Returns:** `signal` - A sine wave signal oscillating between -1 and 1.
* **Example:** `const vibrato = el.mul(5, el.cycle(6)); const tone = el.cycle(el.add(440, vibrato));`

---

#### `el.saw(freq)` / `el.blepsaw(freq)`

* **What it does:** Generates a sawtooth wave. `el.blepsaw` is a band-limited version that reduces aliasing at high frequencies.
* **When to use it:** For bright, harmonically rich sounds typical of subtractive synthesis. Prefer `blepsaw` for pitched sounds.
* **Parameters:**
    * `freq` (signal): The frequency of the wave in Hz.
* **Returns:** `signal` - A sawtooth wave signal rising from -1 to 1.
* **Example:** `const bassSound = el.blepsaw(110);`

---

#### `el.square(freq)` / `el.blepsquare(freq)`

* **What it does:** Generates a square wave. `el.blepsquare` is the band-limited version.
* **When to use it:** For hollow, reedy, or digital sounds. Used often in chiptune music.
* **Parameters:**
    * `freq` (signal): The frequency of the wave in Hz.
* **Returns:** `signal` - A square wave signal alternating between -1 and 1.
* **Example:** `const leadSynth = el.blepsquare(880);`

---

#### `el.triangle(freq)` / `el.bleptriangle(freq)`

* **What it does:** Generates a triangle wave. `el.bleptriangle` is the band-limited version.
* **When to use it:** For a mellow, flute-like tone with fewer harmonics than a saw or square wave.
* **Parameters:**
    * `freq` (signal): The frequency of the wave in Hz.
* **Returns:** `signal` - A triangle wave signal oscillating between -1 and 1.
* **Example:** `const padSound = el.bleptriangle(220);`

---

#### `el.noise()` / `el.pinknoise()` / `el.brownnoise()`

* **What it does:** Generates random noise signals.
* **When to use it:**
    * `el.noise()` (White Noise): For percussive sounds like snares and hi-hats, or wind effects.
    * `el.pinknoise()`: For more natural-sounding ambiance or for testing audio systems.
    * `el.brownnoise()`: For low-frequency rumbling effects like thunder or waterfalls.
* **Returns:** `signal` - A random signal between -1 and 1.
* **Example:** `const snareBody = el.mul(el.perc(0.001, 0.2), el.noise());`

---

#### `el.impulse()`

* **What it does:** Generates a single-sample impulse (value of 1), followed by silence.
* **When to use it:** For exciting filters to create percussive sounds, or as a sharp trigger.
* **Returns:** `signal` - An impulse signal.
* **Example:** `const ping = el.mul(el.train(2), el.impulse()); const resonate = el.lowpass({cutoff: 500, Q: 20}, ping);`

### Filters

These nodes shape the frequency content of a signal.

---

#### `el.lowpass({cutoff, Q}, signal)`

* **What it does:** A resonant low-pass filter that cuts frequencies *above* the cutoff.
* **When to use it:** To make sounds darker, remove harshness, or for classic synth filter sweeps.
* **Parameters:**
    * `props` (object):
        * `cutoff` (signal): The cutoff frequency in Hz.
        * `Q` (signal): The resonance, or peak, at the cutoff frequency.
    * `signal` (signal): The input signal to filter.
* **Returns:** `signal` - The filtered audio.
* **Example:** `el.lowpass({cutoff: el.cycle(1, 1500, 1000), Q: 5}, el.blepsaw(200))`

---

#### `el.highpass({cutoff, Q}, signal)`

* **What it does:** A resonant high-pass filter that cuts frequencies *below* the cutoff.
* **When to use it:** To remove low-end rumble, thin out a sound, or for "whoosh" effects.
* **Parameters:** Same as `el.lowpass`.
* **Returns:** `signal` - The filtered audio.
* **Example:** `el.highpass({cutoff: 1000, Q: 2}, el.pinknoise())`

---

#### `el.bandpass({cutoff, Q}, signal)`

* **What it does:** A resonant band-pass filter that cuts frequencies outside a specific band.
* **When to use it:** To isolate a specific frequency range, creating a telephone-like or wah-wah effect.
* **Parameters:** Same as `el.lowpass`.
* **Returns:** `signal` - The filtered audio.
* **Example:** `el.bandpass({cutoff: 1500, Q: 10}, el.blepsaw(200))`

---

#### `el.svf({mode, cutoff, Q}, signal)`

* **What it does:** A state-variable filter, which can act as a low-pass, high-pass, band-pass, or notch filter.
* **When to use it:** When you need to dynamically switch between filter types or need multiple filter outputs from one source.
* **Parameters:**
    * `props` (object):
        * `mode` (string): 'lp', 'hp', 'bp', or 'notch'.
        * `cutoff` (signal): The cutoff frequency in Hz.
        * `Q` (signal): The resonance or Q factor.
    * `signal` (signal): The input signal.
* **Returns:** `signal` - A filtered signal based on the selected mode.

### Envelopes & Control

These nodes shape the amplitude or other parameters of signals over time.

---

#### `el.adsr(a, d, s, r, gate)`

* **What it does:** Generates a standard Attack-Decay-Sustain-Release envelope.
* **When to use it:** For shaping the volume of notes triggered by a gate signal (e.g., from a keyboard or sequencer).
* **Parameters:**
    * `a, d, r` (number): Attack, Decay, and Release times in seconds.
    * `s` (number): Sustain level from 0.0 to 1.0.
    * `gate` (signal): A control signal that is > 0 when the note is on.
* **Returns:** `signal` - An envelope signal from 0 to 1.
* **Example:** `const gate = el.train(1); const env = el.adsr(0.01, 0.5, 0, 0.2, gate);`

---

#### `el.perc(a, r, gate)`

* **What it does:** A simpler percussive envelope with just attack and release.
* **When to use it:** For drum sounds or short, plucked notes where a sustain phase is not needed.
* **Parameters:**
    * `a, r` (number): Attack and Release times in seconds.
    * `gate` (signal): A control signal that triggers the envelope.
* **Returns:** `signal` - An envelope signal from 0 to 1.
* **Example:** `el.mul(el.perc(0.01, 0.3, el.train(4)), el.noise())`

### Math & Logic Operators

---

#### `el.add(a, b, ...)` & `el.sub(a, b)`

* **What it does:** Adds or subtracts signals.
* **When to use it:** For mixing audio sources (`add`) or for signal cancellation effects (`sub`).
* **Returns:** `signal` - The result of the operation.

---

#### `el.mul(a, b, ...)` & `el.div(a, b)`

* **What it does:** Multiplies or divides signals.
* **When to use it:** `mul` is essential for controlling amplitude (VCA), ring modulation, or scaling control signals. `div` is less common but useful for certain synthesis techniques.
* **Returns:** `signal` - The result of the operation.

---

#### `el.sin(x)`, `el.cos(x)`, `el.tan(x)`

* **What it does:** Trigonometric functions.
* **When to use it:** For waveshaping or creating complex, non-linear mappings of control signals.
* **Returns:** `signal` - The result of the trigonometric function.
* **Example:** `const foldedWave = el.sin(el.mul(el.cycle(110), 5));`

---

#### `el.pow(base, exp)`

* **What it does:** Raises a signal to the power of another.
* **When to use it:** For creating exponential curves, useful for envelopes or waveshaping.
* **Returns:** `signal` - The result of the power operation.
* **Example:** `const expEnv = el.pow(el.perc(0.01, 0.5, el.train(1)), 4);`

---

#### `el.le(a, b)` / `el.leq(a, b)` / `el.ge(a, b)` / `el.geq(a, b)`

* **What it does:** Comparison operators (less than, less than or equal, greater than, greater than or equal).
* **When to use it:** For creating conditional logic in your audio graph. For example, changing a sound when an LFO passes a certain threshold.
* **Returns:** `signal` - Outputs 1 when the condition is true, 0 when false.
* **Example:** `const highPart = el.ge(el.cycle(1), 0); const lowPart = el.le(el.cycle(1), 0);`

### Sequencing & Timing

---

#### `el.metro(rate)` & `el.train(rate)`

* **What it does:** Generates repeating trigger signals.
* **When to use it:**
    * `el.metro`: The "master clock" of a sequencer. Outputs a short pulse at a given rate.
    * `el.train`: Similar to `metro` but outputs a pulse train that can be used as a gate.
* **Parameters:**
    * `rate` (signal): The repetition rate in Hz.
* **Returns:** `signal` - A trigger signal.
* **Example:** `const clock = el.metro(8); // 120bpm 8th notes`

---

#### `el.seq({seq, hold}, trigger)`

* **What it does:** Steps through an array of values, advancing on each `trigger` pulse.
* **When to use it:** The core of any step-sequencer. For sequencing notes, gates, or parameter values.
* **Parameters:**
    * `props` (object):
        * `seq` (array): The array of values to sequence.
        * `hold` (boolean, optional): If `true`, holds the last value. Defaults to `false`.
    * `trigger` (signal): A signal to advance the sequencer.
* **Returns:** `signal` - The current value from the sequence.
* **Example:** `el.seq({seq: [60, 64, 67, 72]}, el.metro(4))`

---

#### `el.delay({size, times, feedback}, signal)`

* **What it does:** A multi-tap delay line for creating echoes.
* **When to use it:** For echo, chorus, or flanging effects.
* **Parameters:**
    * `props` (object):
        * `size` (number): The maximum delay buffer size in samples.
        * `times` (signal | array): Delay time(s) in samples. Use an array for stereo.
        * `feedback` (signal, optional): Feedback amount from 0 to 1.
    * `signal` (signal): The input signal to delay.
* **Returns:** `signal` - The delayed audio.

### Samples & Data

---

#### `el.sample({path, mode}, trigger)`

* **What it does:** Plays back audio from the Virtual File System.
* **When to use it:** For playing any pre-recorded audio.
* **Parameters:**
    * `props` (object):
        * `path` (string): The path to the sample in the VFS.
        * `mode` (string, optional): `'gate'` or `'trigger'`.
    * `trigger` (signal): A signal to trigger playback.
* **Returns:** `signal` - The audio from the sample.

---

#### `el.table({path}, signal)`

* **What it does:** Reads from a table of data in the Virtual File System, using the input signal to index into the table.
* **When to use it:** As a powerful building block for custom wavetable or granular synthesizers.
* **Parameters:**
    * `props` (object):
        * `path` (string): Path to the data in the VFS.
    * `signal` (signal): An index signal from 0 to 1.
* **Returns:** `signal` - The value from the table at the given index.
* **Example:** `// A simple wavetable oscillator\n const phase = el.phasor(110);\n const wave = el.table({path: '/myWavetable.wav'}, phase);`

### Conversion Utilities

These are helper functions, not audio nodes, but are used frequently when building graphs.

---

#### `el.ms2samps(ms)` / `el.samps2ms(samps)`

* **What it does:** Converts between milliseconds and samples.
* **When to use it:** Essential for setting time-based parameters like delay times or envelope segments.
* **Returns:** `signal` - The converted value.

---

#### `el.db2gain(db)` / `el.gain2db(gain)`

* **What it does:** Converts between decibels and linear gain.
* **When to use it:** When you want to specify amplitude in dB, which is more perceptually linear than raw gain.
* **Returns:** `signal` - The converted value.

---

#### `el.midi2hz(note)` / `el.hz2midi(hz)`

* **What it does:** Converts between MIDI note numbers and frequency in Hz.
* **When to use it:** The standard way to control oscillator pitch when working with sequencers or MIDI keyboards.
* **Returns:** `signal` - The converted value.


## 7. Examples & Recipes

The `elementary` codebase includes a great set of examples in the `/examples` directory. They are the best place to learn.

* **`00_HelloSine.js`**: The "Hello World" of Elementary. Shows how to make a basic tone.
* **`01_FMArp.js`**: The FM arpeggio we analyzed in the "Basic Usage" section.
* **`02_SequencedKick.js`**: Demonstrates how to create a simple drum machine, with a kick drum sound synthesized from scratch.
* **`04_Delay.js`**: Shows how to use `el.delay` to create an echo effect.

To run these examples, you can use the command-line interface:

```bash
# From the root of the elementary project
npm run el elementary/examples/path/to/example.js
```

## 8. Best Practices

* **Keep Audio Logic Separate:** Keep your audio synthesis code (your Elementary expressions) separate from your application logic (UI, state management).
* **Use Keys for Dynamic Values:** For values you want to change dynamically (like a filter cutoff), use `el.const({key: 'cutoff', value: 1000})`. You can then update this value later by sending events to the core renderer without re-rendering the whole graph.
* **Avoid Clicks:** When switching between sounds, use envelopes (`el.adsr`) or fades to ramp the volume up and down smoothly.
* **Manage Amplitude:** When adding many signals together, multiply the result by a constant factor (e.g., `el.mul(0.5, ...)` to prevent digital distortion (clipping).

## 9. Troubleshooting

* **Error: "Audio context was not allowed to start."**: You must call `core.initialize()` after a user interaction (like a click). This is a browser security feature.
* **No Sound:**
    * Check your browser's developer console for errors.
    * Make sure you are calling `core.render(leftChannel, rightChannel)`.
    * Ensure the signals you are rendering are not silent. You can test a signal by rendering it directly, e.g., `core.render(mySignal, mySignal)`.
* **Build issues with `node-renderer`**: Ensure you have a working C++ compiler (like `g++` or `clang`) and `cmake` installed and available in your system's PATH.

## 10. Advanced Topics

* **Custom Nodes:** For highly specialized needs, you can write your own audio nodes in C++ and integrate them into Elementary's engine.
* **Offline Rendering:** Use `@elemaudio/node-renderer` and the command-line tools to render your audio compositions to a `.wav` file, which is great for producing audio assets.
* **External Events:** You can send events from your application into the audio engine using `core.emit('event', { ... })`. These events can be received inside your audio graph with nodes like `el.meter` or `el.snapshot`, allowing for precise synchronization between your UI and the audio.

Excellent question. To bridge the gap from understanding the building blocks to architecting a complete application, a junior developer needs to grasp a few key concepts around state management, project structure, and debugging.

Here is the final, crucial section for the documentation, designed to give a developer the confidence to bootstrap a complex audio application in an afternoon.

-----

### `/docs/elementary-documentation.md` (Final Section Added)

... (All previous sections remain the same) ...

## 11\. Bootstrapping a Complex Application

You understand the API and how to build individual sounds. Now, how do you tie it all together into an interactive application? This section covers the essential patterns for managing state, structuring your code, and ensuring your application runs smoothly.

### Managing State and Dynamic Updates

A common challenge is how to change a sound *after* it's already playing. For example, how do you change a filter's cutoff frequency with a UI knob? The wrong way is to call `core.render()` on every single change, which is inefficient.

The **right way** is to use "keyed" nodes and events.

**The `el.const` Node: Your Bridge to the UI**

The `el.const` node creates a constant value that has a special `key` property. You can send updates to this node from your main application code without rebuilding the entire audio graph.

**Step 1: Define a keyed constant in your audio graph.**

```javascript
// in your audio logic
function mySynth(props) {
  // Instead of a fixed value like `el.blepsaw(440)`, we use a keyed const.
  // The `value` property sets the initial frequency.
  const freq = el.const({key: 'synth:freq', value: 440});
  const cutoff = el.const({key: 'filter:cutoff', value: 1200});

  const source = el.blepsaw(freq);
  const filtered = el.lowpass({cutoff, Q: 5}, source);

  return filtered;
}

// Initial render
core.render(mySynth(), mySynth());
```

**Step 2: Use `core.emit()` to send updates from your UI.**

Imagine you have an HTML slider for frequency. Your JavaScript event listener would look like this:

```javascript
// in your UI logic
const freqSlider = document.getElementById('freq-slider');

freqSlider.addEventListener('input', (e) => {
  const newFreq = parseFloat(e.target.value);

  // This sends an event to the audio engine, targeting the node
  // with the key 'synth:freq' and updating its value.
  // This is fast and real-time safe!
  core.emit('change', {
    key: 'synth:freq',
    value: newFreq,
  });
});
```

This pattern is fundamental. It decouples your audio rendering from your UI updates, leading to much better performance. Any parameter you want to control dynamically should be a `el.const` node.

### Recommended Project Structure

As your application grows, separating concerns is vital. Here is a simple but effective project structure:

```
my-audio-app/
├── public/
│   ├── index.html
│   └── samples/
│       ├── kick.wav
│       └── snare.wav
├── src/
│   ├── index.js         # Main entry point, initializes UI and Audio
│   ├── ui.js            # All DOM manipulation, event listeners, UI components
│   └── audio/
│       ├── engine.js    # Manages the Elementary core, loads samples, handles state
│       └── voices.js    # Definitions for your synths, effects, etc. (your el.* code)
└── package.json
```

  * **`audio/voices.js`**: Contains only pure audio logic. Functions here should take props and return an Elementary signal (e.g., `export function mySynth(props) { ... }`). This code should not know about the DOM.
  * **`audio/engine.js`**: A "manager" for Elementary. It initializes `WebRenderer`, loads samples into the VFS, and exposes methods like `engine.initialize()` or `engine.updateParameter('filter:cutoff', 1500)`.
  * **`ui.js`**: Handles all user interaction. When a knob turns, it calls a method from your audio engine, like `engine.updateParameter(...)`.
  * **`index.js`**: The orchestrator. It imports and initializes the UI and the audio engine, connecting them together.

This separation makes your code easier to debug, test, and reason about.

### Performance Considerations

  * **Avoid Expensive Calculations in the Graph:** The audio thread is sensitive. Complex JavaScript logic (e.g., `if/else`, complex loops) should not be part of your audio graph if it can be avoided. Prepare values ahead of time.
  * **Watch Your `el.seq` size:** Using very large arrays in `el.seq` can consume significant memory. For long, generative sequences, consider creating smaller, looping patterns that evolve over time.
  * **Use `el.meter` Sparingly:** The `el.meter` node sends data from the audio thread back to the main thread, which is great for visualization but has a performance cost. Only use it for the signals you absolutely need to "see."
  * **Sample Rate Matters:** In `core.initialize({ sampleRate: 44100 })`, you can specify the sample rate. Lower sample rates (e.g., 22050) use less CPU but result in lower audio fidelity. This can be a useful trade-off for performance-critical applications.

### Debugging Your Audio Graph

When you can't hear anything, or the sound is wrong, how do you debug a signal that's just a bunch of numbers?

**`el.meter` and `el.snapshot` are your best friends.**

  * **`el.meter`**: Provides a running stream of signal values, perfect for driving a UI level meter.

    ```javascript
    // In your audio graph
    const mySignal = el.cycle(440);
    // The meter will send 'meter' events with the signal's RMS and peak values
    core.render(el.meter(mySignal));

    // In your main code, listen for the events
    core.on('meter', (e) => {
      // e.g., update a progress bar with e.peak
      console.log('Signal peak:', e.peak);
    });
    ```

  * **`el.snapshot`**: Captures a single value from a signal precisely when triggered. This is invaluable for debugging sequencers or envelopes.

    ```javascript
    // In your audio graph
    const clock = el.train(1); // A trigger
    const myLFO = el.cycle(0.2);
    // When `clock` fires, snapshot will send an event with the LFO's current value
    const watcher = el.snapshot({name: 'lfo-watch'}, clock, myLFO);
    core.render(watcher); // Note: snapshot itself produces no sound

    // In your main code, listen for the snapshot event
    core.on('snapshot', (e) => {
      if (e.source === 'lfo-watch') {
        console.log('LFO value at trigger time:', e.data);
      }
    });
    ```

By using these tools, you can "see" inside your audio graph and verify that each part is behaving as you expect, which is the key to solving complex audio bugs quickly.
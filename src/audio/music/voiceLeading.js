/**
 * Voice leading: smooth transitions between chord voicings.
 * Pure function — zero Tone.js dependency.
 *
 * Given current voice positions (MIDI) and target chord tones (MIDI),
 * assigns each voice to the nearest available target tone,
 * minimizing total movement.
 */

/**
 * Assign voices to target chord tones, minimizing total movement.
 *
 * @param {number[]} currentMidi - Current voice MIDI positions
 * @param {number[]} targetMidi - Available target MIDI values (sorted)
 * @returns {number[]} New voice positions (same length as currentMidi)
 */
export function assignVoices(currentMidi, targetMidi) {
  if (!currentMidi || currentMidi.length === 0) return [];
  if (!targetMidi || targetMidi.length === 0) return currentMidi.slice();

  // For each current voice, find the nearest target tone
  // Use greedy nearest-neighbor (simple, good enough for 3 voices)
  return currentMidi.map(current => findNearest(current, targetMidi));
}

/**
 * Find the nearest value in a sorted array to the target.
 *
 * @param {number} target - Value to match
 * @param {number[]} sorted - Sorted array of candidates
 * @returns {number} Nearest candidate
 */
function findNearest(target, sorted) {
  let best = sorted[0];
  let bestDist = Math.abs(target - best);

  for (let i = 1; i < sorted.length; i++) {
    const dist = Math.abs(target - sorted[i]);
    if (dist < bestDist) {
      best = sorted[i];
      bestDist = dist;
    } else if (dist > bestDist) {
      // Since sorted, distances will only increase from here
      break;
    }
  }
  return best;
}

/**
 * Pick N initial voice positions spread across chord tones.
 * Used when starting fresh (no previous voicing to lead from).
 *
 * @param {number[]} chordTones - Available MIDI chord tones (sorted)
 * @param {number} count - Number of voices to assign
 * @param {number} centerMidi - Center of desired range (default: C4 = 60)
 * @returns {number[]} Initial voice positions
 */
export function pickInitialVoices(chordTones, count, centerMidi = 60) {
  if (!chordTones || chordTones.length === 0) return [];
  if (count <= 0) return [];

  // Find chord tones nearest to center, then spread
  const sorted = [...chordTones].sort((a, b) =>
    Math.abs(a - centerMidi) - Math.abs(b - centerMidi)
  );

  const voices = [];
  for (let i = 0; i < count; i++) {
    voices.push(sorted[i % sorted.length]);
  }
  return voices.sort((a, b) => a - b);
}

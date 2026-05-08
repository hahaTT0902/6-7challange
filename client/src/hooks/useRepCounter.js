import { useCallback, useRef, useState } from 'react';
import {
  COOLDOWN_MS,
  LANDMARKS,
  MIN_AMPLITUDE,
  MIN_CONFIDENCE,
  SMOOTHING_ALPHA,
  MAX_REASONABLE_SCORE,
} from '../utils/constants.js';

/**
 * Counts arm "reps" by tracking wrist y-coordinate oscillation per side.
 * State machine per side:
 *   - track exponentially smoothed wrist.y
 *   - track local extremes (max=down because y grows downward, min=up)
 *   - increment when amplitude (max-min) >= MIN_AMPLITUDE and direction reversed
 *   - cooldown to prevent jitter rapid-fire
 *
 * Returns { score, processFrame, reset }.
 */
export function useRepCounter({ enabled }) {
  const [score, setScore] = useState(0);

  // Per-side state. We mutate a ref to avoid React rerenders inside the loop.
  const stateRef = useRef({
    left: createSideState(),
    right: createSideState(),
  });

  const reset = useCallback(() => {
    stateRef.current = { left: createSideState(), right: createSideState() };
    setScore(0);
  }, []);

  const processFrame = useCallback(
    (landmarks, ts) => {
      if (!enabled || !landmarks) return;

      const lw = landmarks[LANDMARKS.LEFT_WRIST];
      const rw = landmarks[LANDMARKS.RIGHT_WRIST];

      let inc = 0;
      if (lw && (lw.visibility ?? 1) >= MIN_CONFIDENCE) {
        if (updateSide(stateRef.current.left, lw.y, ts)) inc += 1;
      }
      if (rw && (rw.visibility ?? 1) >= MIN_CONFIDENCE) {
        if (updateSide(stateRef.current.right, rw.y, ts)) inc += 1;
      }
      if (inc > 0) {
        setScore((s) => Math.min(MAX_REASONABLE_SCORE, s + inc));
      }
    },
    [enabled]
  );

  return { score, processFrame, reset };
}

function createSideState() {
  return {
    smoothed: null,
    // 'up' means moving up (y decreasing), 'down' means moving down (y increasing)
    direction: null,
    extremeY: null, // y at last direction reversal
    lastRepTs: 0,
  };
}

/**
 * Returns true if a rep was counted on this frame.
 * Detection: count 1 rep per full down->up swing (i.e. when direction reverses
 * from down to up after sufficient amplitude). This matches "raise your arm"
 * intuition: each upward stroke is one rep.
 */
function updateSide(side, rawY, ts) {
  // Exponential smoothing
  if (side.smoothed == null) {
    side.smoothed = rawY;
    side.extremeY = rawY;
    return false;
  }
  const prev = side.smoothed;
  const y = SMOOTHING_ALPHA * rawY + (1 - SMOOTHING_ALPHA) * prev;
  side.smoothed = y;

  const dy = y - prev;
  // Use a small deadband to ignore noise
  const noise = 0.0015;
  if (Math.abs(dy) < noise) return false;

  const newDir = dy > 0 ? 'down' : 'up';

  if (side.direction == null) {
    side.direction = newDir;
    side.extremeY = y;
    return false;
  }

  if (newDir === side.direction) {
    // Track running extreme
    if (newDir === 'down' && y > side.extremeY) side.extremeY = y;
    else if (newDir === 'up' && y < side.extremeY) side.extremeY = y;
    return false;
  }

  // Direction reversed — measure amplitude from previous extreme.
  const amplitude = Math.abs(y - side.extremeY);
  let counted = false;

  // Count one rep when wrist swings UP after going DOWN (down -> up reversal).
  if (
    side.direction === 'down' &&
    newDir === 'up' &&
    amplitude >= MIN_AMPLITUDE &&
    ts - side.lastRepTs >= COOLDOWN_MS
  ) {
    counted = true;
    side.lastRepTs = ts;
  }

  side.direction = newDir;
  side.extremeY = y;
  return counted;
}

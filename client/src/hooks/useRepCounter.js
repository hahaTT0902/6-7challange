import { useCallback, useRef, useState } from 'react';
import {
  COOLDOWN_MS,
  FULL_RANGE_RELATIVE_AMPLITUDE,
  HIGH_RELATIVE_AMPLITUDE,
  HUGE_RELATIVE_AMPLITUDE,
  LANDMARKS,
  LOW_RELATIVE_AMPLITUDE,
  MID_RELATIVE_AMPLITUDE,
  MIN_AMPLITUDE,
  MIN_BODY_SCALE,
  MIN_CONFIDENCE,
  MIN_RELATIVE_AMPLITUDE,
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
export function useRepCounter({ enabled, t }) {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [motionScale, setMotionScale] = useState(0);

  // Per-side state. We mutate a ref to avoid React rerenders inside the loop.
  const stateRef = useRef({
    left: createSideState(),
    right: createSideState(),
  });

  const reset = useCallback(() => {
    stateRef.current = { left: createSideState(), right: createSideState() };
    setScore(0);
    setFeedback('');
    setMotionScale(0);
  }, []);

  const processFrame = useCallback(
    (landmarks, ts) => {
      if (!enabled || !landmarks) return;

      const bodyScale = getBodyScale(landmarks);
      if (bodyScale < MIN_BODY_SCALE) {
        setFeedback(t ? t('game.statusStepBack') : 'Move back a bit so your shoulders stay clearly visible.');
        setMotionScale(0);
        return;
      }

      const lw = landmarks[LANDMARKS.LEFT_WRIST];
      const rw = landmarks[LANDMARKS.RIGHT_WRIST];

      let inc = 0;
      let strongestAmplitude = 0;
      if (lw && (lw.visibility ?? 1) >= MIN_CONFIDENCE) {
        const result = updateSide(stateRef.current.left, lw.y, ts, bodyScale);
        inc += result.points;
        strongestAmplitude = Math.max(strongestAmplitude, result.relativeAmplitude);
      }
      if (rw && (rw.visibility ?? 1) >= MIN_CONFIDENCE) {
        const result = updateSide(stateRef.current.right, rw.y, ts, bodyScale);
        inc += result.points;
        strongestAmplitude = Math.max(strongestAmplitude, result.relativeAmplitude);
      }
      setMotionScale(Math.min(1, strongestAmplitude / FULL_RANGE_RELATIVE_AMPLITUDE));
      if (inc > 0) {
        setScore((s) => Math.min(MAX_REASONABLE_SCORE, s + inc));
        setFeedback('');
      } else if (strongestAmplitude > 0 && strongestAmplitude < LOW_RELATIVE_AMPLITUDE) {
        setFeedback(t ? t('game.feedbackTooSmall') : 'Amplitude too small — raise your hands a bit higher to score.');
      } else {
        setFeedback('');
      }
    },
    [enabled, t]
  );

  return { score, processFrame, reset, feedback, motionScale };
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

function getBodyScale(landmarks) {
  const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[LANDMARKS.RIGHT_HIP];

  const shoulderWidth =
    leftShoulder && rightShoulder ? distance(leftShoulder, rightShoulder) : 0;
  const torsoHeight =
    leftShoulder && rightShoulder && leftHip && rightHip
      ? distance(midpoint(leftShoulder, rightShoulder), midpoint(leftHip, rightHip))
      : 0;

  return Math.max(shoulderWidth, torsoHeight, MIN_AMPLITUDE);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Returns true if a rep was counted on this frame.
 * Detection: count 1 rep per full down->up swing (i.e. when direction reverses
 * from down to up after sufficient amplitude). This matches "raise your arm"
 * intuition: each upward stroke is one rep.
 */
function updateSide(side, rawY, ts, bodyScale) {
  // Exponential smoothing
  if (side.smoothed == null) {
    side.smoothed = rawY;
    side.extremeY = rawY;
    return { points: 0, relativeAmplitude: 0 };
  }
  const prev = side.smoothed;
  const y = SMOOTHING_ALPHA * rawY + (1 - SMOOTHING_ALPHA) * prev;
  side.smoothed = y;

  const dy = y - prev;
  // Tiny deadband for camera noise only.
  const noise = 0.0005;
  if (Math.abs(dy) < noise) return { points: 0, relativeAmplitude: 0 };

  const newDir = dy > 0 ? 'down' : 'up';

  if (side.direction == null) {
    side.direction = newDir;
    side.extremeY = y;
    return { points: 0, relativeAmplitude: 0 };
  }

  if (newDir === side.direction) {
    // Track running extreme
    if (newDir === 'down' && y > side.extremeY) side.extremeY = y;
    else if (newDir === 'up' && y < side.extremeY) side.extremeY = y;
    return { points: 0, relativeAmplitude: 0 };
  }

  // Direction reversed — measure Y amplitude from previous extreme.
  const amplitude = Math.abs(y - side.extremeY);
  const relativeAmplitude = amplitude / Math.max(bodyScale, MIN_AMPLITUDE);
  let points = 0;

  // Award points only on down -> up reversal (each upward stroke = one rep).
  // Bigger amplitude = more points.
  if (
    side.direction === 'down' &&
    newDir === 'up' &&
    relativeAmplitude >= LOW_RELATIVE_AMPLITUDE &&
    ts - side.lastRepTs >= COOLDOWN_MS
  ) {
    if (relativeAmplitude >= HUGE_RELATIVE_AMPLITUDE) points = 4;
    else if (relativeAmplitude >= HIGH_RELATIVE_AMPLITUDE) points = 3;
    else if (relativeAmplitude >= MID_RELATIVE_AMPLITUDE) points = 2;
    else if (relativeAmplitude >= MIN_RELATIVE_AMPLITUDE) points = 1;
    else points = 1; // LOW..MIN still gives 1 point ("有 Y 偏差就算")
    side.lastRepTs = ts;
  }

  side.direction = newDir;
  side.extremeY = y;
  return { points, relativeAmplitude };
}

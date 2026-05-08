// Game-wide constants. Tweak with care; the server enforces a hard cap.
export const GAME_DURATION_MS = 20000;
export const COUNTDOWN_MS = 3000;
export const MIN_AMPLITUDE = 0.08; // normalized y-coordinate units
export const COOLDOWN_MS = 120;
export const SMOOTHING_ALPHA = 0.35;
export const MIN_CONFIDENCE = 0.5;
export const MAX_REASONABLE_SCORE = 350;
export const MIN_BODY_SCALE = 0.08;
export const MIN_RELATIVE_AMPLITUDE = 0.32;
export const LOW_RELATIVE_AMPLITUDE = 0.22;

// MediaPipe Pose Landmarker indices we care about
export const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

export const SHARE_URL = 'https://67.yutianfu.me';

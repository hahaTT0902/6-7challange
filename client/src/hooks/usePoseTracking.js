import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { MIN_CONFIDENCE } from '../utils/constants.js';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

/**
 * Loads the MediaPipe Pose Landmarker and runs detection on the given video.
 * Calls onLandmarks(landmarks, timestamp) for each detected frame while `active`.
 */
export function usePoseTracking({ videoRef, active, onLandmarks }) {
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const onLandmarksRef = useRef(onLandmarks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasPerson, setHasPerson] = useState(false);

  useEffect(() => {
    onLandmarksRef.current = onLandmarks;
  }, [onLandmarks]);

  // Lazy load model once.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (landmarkerRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const lm = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: MIN_CONFIDENCE,
          minPosePresenceConfidence: MIN_CONFIDENCE,
          minTrackingConfidence: MIN_CONFIDENCE,
        });
        if (cancelled) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
      } catch (err) {
        console.error('[usePoseTracking] load error:', err);
        if (!cancelled) setError(err?.message || 'Failed to load pose model');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Detection loop
  useEffect(() => {
    if (!active) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    let stopped = false;

    function loop() {
      if (stopped) return;
      const lm = landmarkerRef.current;
      if (!lm || video.readyState < 2 || video.paused || video.ended) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const now = performance.now();
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const result = lm.detectForVideo(video, now);
          const landmarks = result?.landmarks?.[0] || null;
          if (landmarks && landmarks.length > 0) {
            setHasPerson(true);
            onLandmarksRef.current?.(landmarks, now);
          } else {
            setHasPerson(false);
          }
        } catch (err) {
          // Single frame errors shouldn't kill the loop.
          // eslint-disable-next-line no-console
          console.warn('[usePoseTracking] detect error:', err);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, videoRef]);

  // Cleanup landmarker on unmount
  useEffect(() => {
    return () => {
      try {
        landmarkerRef.current?.close();
      } catch {
        /* ignore */
      }
      landmarkerRef.current = null;
    };
  }, []);

  return { loading, error, hasPerson };
}

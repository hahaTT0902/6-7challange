import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages getUserMedia camera lifecycle.
 * Returns { videoRef, ready, error, start, stop }.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Video element not mounted');
      }
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setReady(true);
      return true;
    } catch (err) {
      console.warn('[useCamera] start error:', err);
      const name = err?.name || '';
      let msg = err?.message || 'Camera error';
      if (name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access in your browser.';
      else if (name === 'NotFoundError') msg = 'No camera detected on this device.';
      else if (name === 'NotReadableError') msg = 'Camera is already in use by another application.';
      setError(msg);
      setReady(false);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        /* noop */
      }
    }
    setReady(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, ready, error, start, stop };
}

import { useEffect, useRef, useState } from 'react';
import CameraView from './CameraView.jsx';
import ScoreDisplay from './ScoreDisplay.jsx';
import Countdown from './Countdown.jsx';
import PermissionNotice from './PermissionNotice.jsx';
import { useCamera } from '../hooks/useCamera.js';
import { usePoseTracking } from '../hooks/usePoseTracking.js';
import { useRepCounter } from '../hooks/useRepCounter.js';
import { COUNTDOWN_MS, GAME_DURATION_MS } from '../utils/constants.js';

// Game phases:
// 'idle' | 'requesting' | 'positioning' | 'countdown' | 'playing' | 'finished'
export default function GameScreen({ onFinish, onBack }) {
  const { videoRef, ready: camReady, error: camError, start: startCam, stop: stopCam } = useCamera();
  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);

  const { score, processFrame, reset: resetCounter } = useRepCounter({
    enabled: phase === 'playing',
  });

  const { loading: modelLoading, error: modelError, hasPerson } = usePoseTracking({
    videoRef,
    active: camReady && (phase === 'positioning' || phase === 'countdown' || phase === 'playing'),
    onLandmarks: processFrame,
  });

  const finishedRef = useRef(false);

  // Auto-start: request camera when entering screen
  useEffect(() => {
    setPhase('requesting');
    startCam().then((ok) => {
      if (ok) setPhase('positioning');
    });
    return () => stopCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    const start = performance.now();
    let raf = 0;
    function tick() {
      const elapsed = performance.now() - start;
      const remaining = COUNTDOWN_MS - elapsed;
      if (remaining <= 0) {
        setCountdown('GO');
        // Brief GO display, then play
        setTimeout(() => {
          setPhase('playing');
        }, 400);
        return;
      }
      const n = Math.ceil(remaining / 1000);
      setCountdown(n);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    finishedRef.current = false;
    const start = performance.now();
    let raf = 0;
    function tick() {
      const elapsed = performance.now() - start;
      const remaining = GAME_DURATION_MS - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        if (!finishedRef.current) {
          finishedRef.current = true;
          setPhase('finished');
        }
        return;
      }
      setTimeLeft(remaining);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // When finished, hand off to parent
  useEffect(() => {
    if (phase === 'finished') {
      onFinish?.(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function beginCountdown() {
    resetCounter();
    setTimeLeft(GAME_DURATION_MS);
    setCountdown(3);
    setPhase('countdown');
  }

  function statusText() {
    if (phase === 'requesting') return 'Waiting for camera…';
    if (camError) return camError;
    if (modelError) return `Pose model error: ${modelError}`;
    if (modelLoading) return 'Loading pose model…';
    if (phase === 'positioning') {
      if (!hasPerson) return 'Step back and keep your upper body visible.';
      return 'Ready! Tap Start when you are set.';
    }
    if (phase === 'countdown') return null;
    if (phase === 'playing') return null;
    return null;
  }

  const overlay = (() => {
    if (camError) {
      return <PermissionNotice error={camError} onRetry={() => startCam().then((ok) => ok && setPhase('positioning'))} />;
    }
    if (phase === 'countdown') {
      return <Countdown value={countdown} />;
    }
    if (phase === 'positioning' && !hasPerson) {
      return (
        <div className="rounded-xl bg-black/60 px-4 py-3 text-sm">
          Step back and keep your upper body visible.
        </div>
      );
    }
    return null;
  })();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/70 hover:text-white">← Back</button>
        <div className="text-sm text-white/60">67 Challenge</div>
        <div className="w-12" />
      </div>

      <div className="mt-4">
        <CameraView ref={videoRef} overlay={overlay} />
      </div>

      <div className="mt-4">
        <ScoreDisplay score={score} timeLeftMs={timeLeft} />
      </div>

      <div className="mt-3 min-h-[1.5rem] text-center text-sm text-white/70">
        {statusText()}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {phase === 'positioning' && !camError && (
          <button onClick={beginCountdown} className="btn-neon" disabled={modelLoading}>
            {modelLoading ? 'Loading…' : 'Start'}
          </button>
        )}
        {(phase === 'countdown' || phase === 'playing') && (
          <button
            onClick={() => {
              setPhase('positioning');
              setTimeLeft(GAME_DURATION_MS);
              resetCounter();
            }}
            className="btn-ghost"
          >
            Cancel
          </button>
        )}
      </div>
    </main>
  );
}

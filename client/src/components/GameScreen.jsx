import { useEffect, useRef, useState } from 'react';
import CameraView from './CameraView.jsx';
import ScoreDisplay from './ScoreDisplay.jsx';
import Countdown from './Countdown.jsx';
import PermissionNotice from './PermissionNotice.jsx';
import { useCamera } from '../hooks/useCamera.js';
import { usePoseTracking } from '../hooks/usePoseTracking.js';
import { useRepCounter } from '../hooks/useRepCounter.js';
import { COUNTDOWN_MS, GAME_DURATION_MS, LANDMARKS, MIN_CONFIDENCE } from '../utils/constants.js';

// Game phases:
// 'idle' | 'requesting' | 'positioning' | 'countdown' | 'playing' | 'finished'
export default function GameScreen({ onFinish, onBack }) {
  const { videoRef, ready: camReady, error: camError, start: startCam, stop: stopCam } = useCamera();
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS);
  const [poseLandmarks, setPoseLandmarks] = useState(null);

  const { score, processFrame, reset: resetCounter, feedback, motionScale } = useRepCounter({
    enabled: phase === 'playing',
  });

  const { loading: modelLoading, error: modelError, hasPerson } = usePoseTracking({
    videoRef,
    active: camReady && (phase === 'positioning' || phase === 'countdown' || phase === 'playing'),
    onLandmarks: (landmarks, ts) => {
      setPoseLandmarks(landmarks);
      processFrame(landmarks, ts);
    },
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!poseLandmarks || !hasPerson) return;

    drawPoseOverlay(ctx, poseLandmarks, width, height);
  }, [poseLandmarks, hasPerson, videoRef]);

  function statusText() {
    if (phase === 'requesting') return 'Waiting for camera…';
    if (camError) return camError;
    if (modelError) return `Pose model error: ${modelError}`;
    if (modelLoading) return 'Loading pose model…';
    if (phase === 'positioning') {
      if (!hasPerson) return 'Step back and keep your upper body visible.';
      if (feedback) return feedback;
      return 'Ready! Tap Start when you are set.';
    }
    if (phase === 'countdown') return null;
    if (phase === 'playing') return feedback || null;
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
        <CameraView ref={videoRef} canvasRef={canvasRef} overlay={overlay} />
      </div>

      <div className="mt-4">
        <ScoreDisplay score={score} timeLeftMs={timeLeft} />
      </div>

      <div className="mt-3 card">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/55">
          <span>Motion Range</span>
          <span>{Math.round(motionScale * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 transition-[width] duration-150"
            style={{ width: `${Math.max(6, Math.min(100, motionScale * 100))}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-white/55">
          Counted reps need a clear up-down swing relative to your shoulder width.
        </div>
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

function drawPoseOverlay(ctx, landmarks, width, height) {
  const visible = (index) => {
    const point = landmarks[index];
    return point && (point.visibility ?? 1) >= MIN_CONFIDENCE ? point : null;
  };

  const segments = [
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
    [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
    [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
    [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
    [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
  ];

  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.92)';

  segments.forEach(([fromIndex, toIndex]) => {
    const from = visible(fromIndex);
    const to = visible(toIndex);
    if (!from || !to) return;
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.stroke();
  });

  [
    LANDMARKS.LEFT_SHOULDER,
    LANDMARKS.RIGHT_SHOULDER,
    LANDMARKS.LEFT_ELBOW,
    LANDMARKS.RIGHT_ELBOW,
  ].forEach((index) => {
    const point = visible(index);
    if (!point) return;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.arc(point.x * width, point.y * height, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  [LANDMARKS.LEFT_WRIST, LANDMARKS.RIGHT_WRIST].forEach((index) => {
    const point = visible(index);
    if (!point) return;
    const x = point.x * width;
    const y = point.y * height;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(244, 114, 182, 0.98)';
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-white/70 hover:text-white">← Back</button>
        <div className="text-sm text-white/60">67 Challenge</div>
        <div className="w-12" />
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1 min-w-0">
          <CameraView ref={videoRef} canvasRef={canvasRef} overlay={overlay} />
        </div>
        <MotionMeter value={motionScale} active={phase === 'playing'} />
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

function MotionMeter({ value, active }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  // Threshold marker positions (must match constants tiers normalized to FULL_RANGE).
  // LOW=0.12, MIN=0.18, MID=0.32, HIGH(=full)=0.5
  const tiers = [
    { label: '1x', pos: (0.18 / 0.5) * 100 },
    { label: '2x', pos: (0.32 / 0.5) * 100 },
    { label: '3x', pos: 100 },
  ];
  return (
    <div className="flex w-20 flex-col items-stretch sm:w-24">
      <div className="text-center text-[10px] uppercase tracking-wider text-white/60">
        Range
      </div>
      <div className="relative mt-1 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
        {/* Fill grows from bottom up */}
        <div
          className="absolute inset-x-0 bottom-0 rounded-2xl bg-gradient-to-t from-cyan-400 via-violet-400 to-pink-400 transition-[height] duration-100"
          style={{ height: `${pct}%`, opacity: active ? 1 : 0.55 }}
        />
        {/* Tier marker lines + labels */}
        {tiers.map((t) => (
          <div
            key={t.label}
            className="pointer-events-none absolute inset-x-0 flex items-center justify-end pr-1"
            style={{ bottom: `${t.pos}%` }}
          >
            <div className="absolute inset-x-1 h-px bg-white/40" />
            <span className="relative z-10 rounded bg-black/60 px-1 text-[9px] font-semibold text-white/85">
              {t.label}
            </span>
          </div>
        ))}
        {/* Live percent in middle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white shadow">
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="mt-1 text-center text-[10px] leading-tight text-white/55">
        手抬越高<br/>分数越高
      </div>
    </div>
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

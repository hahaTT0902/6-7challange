import { forwardRef } from 'react';

const CameraView = forwardRef(function CameraView({ mirrored = true, overlay, canvasRef }, ref) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-glow">
      <video
        ref={ref}
        className="h-full w-full object-cover"
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
      />
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
          {overlay}
        </div>
      ) : null}
    </div>
  );
});

export default CameraView;

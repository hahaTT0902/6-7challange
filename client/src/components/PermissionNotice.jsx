export default function PermissionNotice({ error, onRetry }) {
  return (
    <div className="card text-center">
      <div className="text-3xl">📷</div>
      <h2 className="mt-2 text-xl font-bold">Camera required</h2>
      <p className="mt-2 text-sm text-white/70">
        {error ||
          'Please allow camera access. Frames are processed locally and never uploaded.'}
      </p>
      <button onClick={onRetry} className="btn-neon mt-4">
        Allow Camera
      </button>
    </div>
  );
}

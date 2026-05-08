export default function HowItWorks({ onBack }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-white">
      <button onClick={onBack} className="text-white/70 hover:text-white">
        ← Back
      </button>
      <h1 className="mt-4 text-3xl font-extrabold gradient-text">How It Works</h1>

      <section className="mt-6 space-y-4 text-white/85 leading-relaxed">
        <p>
          67 Challenge is a 20-second arm-speed game. Your browser uses on-device
          pose detection (MediaPipe) to track your wrists. Every full up-down
          swing of either arm counts as <strong>1 point</strong>.
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Click <em>Start Challenge</em> on the home screen.</li>
          <li>Grant camera permission. Frames stay on your device.</li>
          <li>Step back so your shoulders, elbows, and wrists are visible.</li>
          <li>Get ready — the countdown 3, 2, 1, GO! starts the timer.</li>
          <li>Pump both arms up and down as fast as you can for 20 seconds.</li>
          <li>Submit your nickname and score to the global leaderboard.</li>
        </ol>

        <h2 className="mt-8 text-xl font-bold">Tips</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Bright, even lighting works best.</li>
          <li>Stand 1.5–2m from the camera.</li>
          <li>Keep your upper body centered in the frame.</li>
          <li>Big motions count better than tiny twitches — and avoid jitter.</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold">Privacy</h2>
        <p>
          Video frames never leave your device. Only your nickname and score
          are sent when you submit a result.
        </p>
      </section>
    </main>
  );
}

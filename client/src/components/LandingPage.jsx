import { motion } from 'framer-motion';

const features = [
  {
    title: '20s Challenge',
    desc: 'Sprint your arms for 20 seconds. Every rep counts.',
    icon: '⏱️',
  },
  {
    title: 'Camera Tracking',
    desc: 'On-device pose AI tracks each wrist movement in real time.',
    icon: '🎥',
  },
  {
    title: 'Global Leaderboard',
    desc: 'Submit your score and climb the worldwide ranks.',
    icon: '🏆',
  },
];

export default function LandingPage({ onStart, onLeaderboard, onHowItWorks }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-12 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-5xl font-extrabold leading-tight gradient-text sm:text-6xl"
      >
        67 Challenge
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-4 text-lg text-white/80 sm:text-xl"
      >
        20 seconds. Move fast. Beat the leaderboard.
      </motion.p>

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <button onClick={onStart} className="btn-neon col-span-1 sm:col-span-2">
          Start Challenge
        </button>
        <button onClick={onLeaderboard} className="btn-ghost">
          Leaderboard
        </button>
        <button onClick={onHowItWorks} className="btn-ghost">
          How It Works
        </button>
      </div>

      <p className="mt-6 max-w-md text-sm text-white/60">
        Camera frames are processed locally in your browser. We do not upload or store your video.
      </p>

      <section className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <motion.div
            key={f.title}
            whileHover={{ y: -4 }}
            className="card text-left"
          >
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-white/70">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-12 w-full text-left">
        <h2 className="text-xl font-bold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-6 text-white/80">
          <li>Allow camera access. Stand back so your upper body is visible.</li>
          <li>The countdown starts: 3, 2, 1, GO!</li>
          <li>Pump your arms up and down as fast as you can for 20 seconds.</li>
          <li>Submit your score and check the leaderboard.</li>
        </ol>
      </section>

      <footer className="mt-16 text-xs text-white/40">
        Original project — not affiliated with any other site.
      </footer>
    </main>
  );
}

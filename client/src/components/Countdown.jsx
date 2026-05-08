import { motion, AnimatePresence } from 'framer-motion';

export default function Countdown({ value }) {
  // value: 3 | 2 | 1 | 'GO'
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={String(value)}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="text-7xl font-black gradient-text drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]"
      >
        {value}
      </motion.div>
    </AnimatePresence>
  );
}

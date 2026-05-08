// Returns rating key (mapped to i18n via 'rating.<key>') + tailwind color.
export function getRating(score) {
  if (score <= 30) return { key: 'beginner', color: 'text-slate-300' };
  if (score <= 66) return { key: 'warming', color: 'text-cyan-300' };
  if (score <= 100) return { key: 'fast', color: 'text-violet-300' };
  if (score <= 150) return { key: 'insane', color: 'text-pink-300' };
  return { key: 'monster', color: 'text-rose-400' };
}

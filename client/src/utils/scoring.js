export function getRating(score) {
  if (score <= 30) return { label: 'Beginner', color: 'text-slate-300' };
  if (score <= 66) return { label: 'Warming Up', color: 'text-cyan-300' };
  if (score <= 100) return { label: 'Fast', color: 'text-violet-300' };
  if (score <= 150) return { label: 'Insane', color: 'text-pink-300' };
  return { label: 'Monster', color: 'text-rose-400' };
}

import { useEffect, useState } from 'react';

export function useLocalBestScore() {
  const [best, setBest] = useState(0);
  const [last, setLast] = useState(0);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    try {
      const b = parseInt(localStorage.getItem('bestScore') || '0', 10);
      const l = parseInt(localStorage.getItem('lastScore') || '0', 10);
      const n = localStorage.getItem('playerNickname') || '';
      if (Number.isFinite(b)) setBest(b);
      if (Number.isFinite(l)) setLast(l);
      if (n) setNickname(n);
    } catch {
      /* ignore */
    }
  }, []);

  function recordScore(score) {
    try {
      localStorage.setItem('lastScore', String(score));
      setLast(score);
      const prevBest = parseInt(localStorage.getItem('bestScore') || '0', 10) || 0;
      if (score > prevBest) {
        localStorage.setItem('bestScore', String(score));
        setBest(score);
      }
    } catch {
      /* ignore */
    }
  }

  function recordNickname(n) {
    try {
      localStorage.setItem('playerNickname', n);
      setNickname(n);
    } catch {
      /* ignore */
    }
  }

  return { best, last, nickname, recordScore, recordNickname };
}

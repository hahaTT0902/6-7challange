import { SHARE_URL } from './constants.js';

export async function shareResult(score, text) {
  const body = text || `I scored ${score} in 67 Challenge. Can you beat me? ${SHARE_URL}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: '67 Challenge', text: body, url: SHARE_URL });
      return { ok: true, method: 'share' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, method: 'share', aborted: true };
      // fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(body);
    return { ok: true, method: 'clipboard' };
  } catch {
    return { ok: false, method: 'none' };
  }
}

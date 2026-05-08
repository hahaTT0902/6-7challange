// Thin fetch wrapper for the same-origin /api endpoints.
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export function submitScore({ nickname, score }) {
  return request('/api/scores', {
    method: 'POST',
    body: JSON.stringify({ nickname, score }),
  });
}

export function fetchLeaderboard({ period = 'all', limit = 100 } = {}) {
  const qs = new URLSearchParams({ period, limit: String(limit) }).toString();
  return request(`/api/leaderboard?${qs}`);
}

export function fetchScoreRank(id) {
  return request(`/api/scores/${id}/rank`);
}

export function health() {
  return request('/api/health');
}

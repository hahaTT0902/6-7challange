// Thin fetch wrapper for the same-origin /api endpoints.
const TOKEN_KEY = 'sixtyseven.token';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getAuthToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...options, headers });
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

export function fetchHypotheticalRank(score) {
  const qs = new URLSearchParams({ score: String(score) }).toString();
  return request(`/api/scores/rank?${qs}`);
}

export function health() {
  return request('/api/health');
}

// --- Auth ---
export function authRegister({ username, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function authLogin({ username, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function authMe() {
  return request('/api/auth/me');
}

// --- Duels ---
export function createDuel() {
  return request('/api/duels', { method: 'POST' });
}

export function joinDuel(code) {
  return request(`/api/duels/${encodeURIComponent(code)}/join`, { method: 'POST' });
}

export function getDuel(code) {
  return request(`/api/duels/${encodeURIComponent(code)}`);
}

export function submitDuelScore(code, score) {
  return request(`/api/duels/${encodeURIComponent(code)}/score`, {
    method: 'POST',
    body: JSON.stringify({ score }),
  });
}

export function listMyDuels() {
  return request('/api/duels');
}

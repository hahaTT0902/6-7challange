# 67 Challenge

A 20-second arm-speed web game. The browser uses MediaPipe Pose Landmarker to count
wrist up/down reps from your camera. Submit your nickname and score to a real
MySQL-backed global leaderboard.

> Original project. Not affiliated with, nor a copy of, any other site. Only the
> high-level concept (camera-based 20s challenge + leaderboard) was used as
> inspiration.

## Tech stack

- **Frontend** — React 18, Vite, Tailwind CSS, Framer Motion, `@mediapipe/tasks-vision`
- **Backend** — Node.js + Express, Prisma ORM, MySQL, helmet, express-rate-limit, zod
- **Deploy** — Nginx reverse proxy (`/api/` → Node `:3007`), PM2, HTTPS via 宝塔/Cloudflare

## Project structure

```
67-challenge/
  client/          # React + Vite frontend
  server/          # Express API + Prisma schema
  deploy/
    nginx.conf     # Example Nginx config
  README.md
```

---

## 1. Local development

### 1.1 Create the MySQL database

```sql
CREATE DATABASE sixtyseven_challenge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optionally create a dedicated user
CREATE USER 'sixtyseven'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON sixtyseven_challenge.* TO 'sixtyseven'@'localhost';
FLUSH PRIVILEGES;
```

### 1.2 Configure server `.env`

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```
DATABASE_URL="mysql://sixtyseven:a-strong-password@localhost:3306/sixtyseven_challenge"
PORT=3007
NODE_ENV=development
PUBLIC_ORIGIN="http://localhost:5173"
IP_HASH_SECRET="put-a-long-random-string-here"
```

### 1.3 Install + migrate + run server

```bash
cd server
npm install
npx prisma migrate dev --name init
npm run dev
```

The API listens on `http://localhost:3007`. Verify:

```bash
curl http://localhost:3007/api/health
# {"ok":true}
```

### 1.4 Run the client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to `http://localhost:3007`.

---

## 2. Production build & deploy

### 2.1 Build the frontend

```bash
cd client
npm install
npm run build
# Output: client/dist/
```

### 2.2 Set up the backend on the server

```bash
cd server
npm install --omit=dev
# Make sure server/.env exists and DATABASE_URL points to your production DB.
npx prisma generate
npx prisma migrate deploy
```

`server/.env` for production:

```
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/sixtyseven_challenge"
PORT=3007
NODE_ENV=production
PUBLIC_ORIGIN="https://67.yutianfu.me"
IP_HASH_SECRET="long-random-secret-keep-this-private"
```

### 2.3 Run with PM2

```bash
npm install -g pm2
cd server
pm2 start src/index.js --name 67-challenge-api
pm2 save
pm2 startup   # follow the command it prints to enable boot autostart
```

Logs:

```bash
pm2 logs 67-challenge-api
```

### 2.4 Nginx

Copy `deploy/nginx.conf` and adjust the `root` path so it points at your
deployed `client/dist` directory (e.g. `/www/wwwroot/67.yutianfu.me/client/dist`).

Reload Nginx:

```bash
nginx -t && nginx -s reload
```

HTTPS:

- **宝塔面板**: in the site settings, click *SSL* → *Let's Encrypt* → apply.
- **Cloudflare**: set DNS A record to your server, set SSL mode to *Full*
  (or *Full (strict)* if your origin certificate is valid).

After SSL is active, the site works at `https://67.yutianfu.me` and the API at
`https://67.yutianfu.me/api/...`. The frontend uses **same-origin relative
paths** (`fetch('/api/scores')`) so there is **no CORS** to deal with.

---

## 3. API reference

All endpoints are JSON. Base path: `/api`.

### `GET /api/health`
```json
{ "ok": true }
```

### `POST /api/scores`
Request:
```json
{ "nickname": "TT", "score": 128 }
```
Validation:
- `nickname` trimmed length 2–20, allowed chars: latin letters, digits, CJK, space, `_`, `-`
- `score` integer, 0 ≤ score ≤ 350
- Rate limit: 5/min per IP hash

Response (201):
```json
{
  "success": true,
  "score": { "id": 1, "nickname": "TT", "score": 128, "createdAt": "..." },
  "rank": 12
}
```

### `GET /api/leaderboard?period=all|today|week&limit=100`
Sorted by `score DESC, createdAt ASC`.
```json
{
  "period": "all",
  "items": [
    { "rank": 1, "id": 7, "nickname": "Player", "score": 180, "createdAt": "..." }
  ]
}
```

### `GET /api/scores/:id/rank`
```json
{
  "success": true,
  "score": { "id": 7, "nickname": "Player", "score": 180, "createdAt": "..." },
  "rank": 1
}
```

---

## 4. Security notes

- `helmet` security headers
- Body size capped at 10kb
- IP addresses are stored only as **HMAC-SHA256 hashes** using `IP_HASH_SECRET`
- Rate limiting (5/min for `POST /api/scores`, 120/min general)
- Nicknames are validated server-side and rendered as React text (auto-escaped — no XSS)
- Server-side score bounds enforced (`0 ≤ score ≤ 350`)
- `trust proxy = 1` so the real client IP is read from `X-Forwarded-For` behind Nginx

## 5. Privacy

- Camera frames are processed entirely in the browser (MediaPipe + WASM/GPU).
- Only `nickname` + `score` are sent to the server when a user submits.
- No video, audio, or images are uploaded or stored.

---

## 6. Tweakable game constants

Defined in `client/src/utils/constants.js`:

| Constant | Default | Meaning |
| --- | --- | --- |
| `GAME_DURATION_MS` | `20000` | Length of one challenge |
| `COUNTDOWN_MS` | `3000` | Pre-game countdown |
| `MIN_AMPLITUDE` | `0.08` | Min wrist y-swing to count one rep |
| `COOLDOWN_MS` | `120` | Anti-jitter cooldown between reps per side |
| `SMOOTHING_ALPHA` | `0.35` | EMA factor on wrist y |
| `MIN_CONFIDENCE` | `0.5` | Required pose / landmark visibility |
| `MAX_REASONABLE_SCORE` | `350` | Front + back hard cap |

If you change `MAX_REASONABLE_SCORE`, also update `server/src/utils/validation.js`.

# X Trend Tracker – Emerging software, books & ideas

Scrapes tweets from creators you add, then uses Claude to **discover** software, books, and ideas from the **context** of each post (no predefined list). Surfaces emerging things people are just starting to talk about.

**Self-hosted:** no Supabase. Run the app with Node + SQLite and host it anywhere (Railway, Render, Fly, VPS, etc.).

---

## Quick start

1. **Install and run the server** (creates `data/app.db` automatically):

   ```bash
   npm install
   npm run server
   ```

   API runs at `http://localhost:3001`.

2. **Run the frontend** (in another terminal; proxies `/api` to the server):

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`.

3. **Production:** build and serve from one process:

   ```bash
   npm run start
   ```

   Serves the built frontend and API on `PORT` (default 3001). Set `NODE_ENV=production`.

---

## Environment (server)

Create a `.env` file in the project root (or set env vars where you host). **Do not commit `.env`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For AI | Claude API key from [Anthropic](https://console.anthropic.com/). Without it, scrapes run but no trending items are extracted. |
| `X_API_BEARER_TOKEN` | For scrape | X (Twitter) API Bearer Token from [X Developer Portal](https://developer.x.com/). Without it, scrape fails. |
| `PORT` | No | Server port (default `3001`). |
| `DATABASE_PATH` | No | Path to SQLite file (default `./data/app.db`). |

No keys in the frontend; the browser only talks to your server.

---


## X API usage

You're charged by X for **every tweet you fetch**—so we use **every** tweet in the AI context (no pool/keep). Default **25 per creator** (env `X_TWEETS_PER_CREATOR`). **Cheaper:** use the **Paste timeline** tab—scroll X in your browser, copy tweet text, paste here. Same extraction, no X API cost.


---

## Get it live

Easiest: deploy to **Railway** or **Render** (both have free tiers). Your app is one Node server that serves the frontend and API.

### Option A: Railway

1. Push your code to **GitHub** (if you haven’t already).
2. Go to [railway.app](https://railway.app) and sign in with GitHub.
3. **New Project** → **Deploy from GitHub repo** → choose this repo.
4. In the service **Settings**:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Variables:** Add `NODE_ENV` = `production`, `ANTHROPIC_API_KEY` (your Claude key), and optionally `X_API_BEARER_TOKEN`. Railway sets `PORT` for you.
5. Under **Settings → Networking**, click **Generate Domain**. You’ll get a URL like `https://your-app.up.railway.app`.

### Option B: Render

1. Push your code to **GitHub**.
2. Go to [render.com](https://render.com) → **New** → **Web Service**.
3. Connect the repo. Then:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Environment:** Add `ANTHROPIC_API_KEY`, and optionally `X_API_BEARER_TOKEN`. Add `NODE_ENV` = `production`. Render sets `PORT`.
4. Create Web Service. Render gives you a URL like `https://your-app.onrender.com`.

**Note:** On the free tier the app may sleep after inactivity; first load after sleep can be slow. SQLite data may not persist across deploys unless you use a persistent disk (Render paid feature).

### After deploy

- Open the URL. Use the **Paste timeline** tab: paste tweet text, click Summarize. You only need `ANTHROPIC_API_KEY` for that (no X API).
- To use **Trending** (X API scrape) and **Manage Creators**, add `X_API_BEARER_TOKEN` in the host’s environment variables and redeploy if needed.

---

## Local development

- **Frontend:** `npm run dev` — Vite dev server proxies `/api` to `http://localhost:3001`. No `VITE_*` env needed for the API.
- **Server:** `npm run server` — reads `.env` for `ANTHROPIC_API_KEY` and `X_API_BEARER_TOKEN`. SQLite DB is at `./data/app.db`.

Run both (e.g. two terminals) to develop locally.

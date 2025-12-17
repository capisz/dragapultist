<!-- Copilot / AI agent guidance for Dragapultist -->
# Dragapultist — Copilot Instructions

Purpose: give an AI coding agent the concrete, repo-specific knowledge needed to be productive quickly.

Big picture
- Next.js (app router) frontend written in TypeScript. Entry points and layouts live under `app/` (server components by default). See `app/layout.tsx` and `app/account/layout.tsx` for structure.
- UI primitives are under `components/ui/` and reusable views under `components/` (e.g. `components/prize-mapper-panel.tsx`).
- Lightweight server/API helpers use Next server routes under `app/api/*/route.ts` and server actions in `app/actions.ts`.
- Optional Electron wrapper lives in `/electron` (desktop clipboard + file watchers) and loads the dev URL (see `electron/main.js`).
- MongoDB client is centralized in `lib/mongodb.ts` and expects `MONGODB_URI` in `.env.local`.

Key workflows & commands
- Dev (web): `npm run dev` (root). Next starts at http://localhost:3000.
- Build: `npm run build` and `npm start` to run built server.
- Electron: `cd electron && npm start` to run the desktop wrapper (it expects the web app at `http://localhost:3000` or set `DRAGAPULTIST_URL`).

Project-specific conventions
- App router + server components: files under `app/` are server components by default; add "use client" at the top of a file that must run in the browser (examples: `components/prize-mapper-panel.tsx`).
- UI primitives: use the `components/ui/` directory for building-block components. Reuse these instead of adding duplicate markup.
- Data flow: parsing of pasted game logs happens client-side (look in `utils/game-analyzer.ts` and `components/pokemon-tcg-analyzer.tsx`); persistent storage and API routes are minimal and often in-memory for dev.
- Auth: simple cookie-based demo helpers live in `app/actions.ts` (in-memory `users` array). Treat as examples rather than production auth.

Integration points & gotchas
- MongoDB: `lib/mongodb.ts` throws when `MONGODB_URI` is missing. For any server route that accesses the DB, ensure the env var is provided in `.env.local`.
- Next config: `next.config.mjs` sets `typescript.ignoreBuildErrors = true`. Type errors may be present but build succeeds — be cautious when modifying types.
- Images: `images.unoptimized = true` in `next.config.mjs` — image optimization is intentionally disabled.
- Electron clipboard watcher: `electron/main.js` watches the clipboard and sends `log-detected` events to the web UI. Use `DRAGAPULTIST_URL` or start the frontend dev server first.

Files to read first (examples)
- `README.md` — project overview and dev commands
- `package.json` — scripts and dependencies
- `app/actions.ts` — server actions and cookie usage
- `app/api/games/route.ts` — example server route returning game data
- `lib/mongodb.ts` — MongoDB client pattern and env requirement
- `components/prize-mapper-panel.tsx` — representative complex client component and fetch to `/api/games`
- `electron/main.js` — how desktop integration discovers pasted logs

How to contribute code (short tips)
- Preserve server/client boundaries: prefer server components for data fetching unless interactivity requires client-side state.
- Follow existing styling: Tailwind utility classes are used project-wide (see `tailwind.config.js`).
- When adding backend behavior, prefer `app/api/*/route.ts` consistent patterns and re-use `lib/mongodb.ts`.

If you need more context
- Ask for the specific area you plan to change (UI, parser, server, electron). Point to the file you intend to edit and request a walkthrough.

Please confirm any missing integrations (CI, external secrets, deployment) before making production-affecting changes.

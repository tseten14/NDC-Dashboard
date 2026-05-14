# Backend

This repository is a **static SPA**; the live backend is your **Supabase project** (Postgres, Auth, Row Level Security, Storage, and optional **Edge Functions**).

Use this folder for **server-side code you add later**, for example:

- `functions/` — Supabase Edge Functions (TypeScript), if you introduce them with the Supabase CLI  
- Small Node scripts for migrations or data jobs (keep secrets out of git)

The browser app in `frontend/` talks to Supabase using the keys in `.env` (`VITE_SUPABASE_*`).

## Node API (Climate TRACE)

The **Express** app for emissions JSON is at the repository root: `server.js`, with routes under `routes/` and services under `services/`. Run `npm run start:api` (see main README). It uses **`SUPABASE_SERVICE_ROLE_KEY`** to read/write `climatetrace_emissions` and calls the Climate TRACE HTTP API only for the cached “live snapshot” and health checks — not on every timeseries request.

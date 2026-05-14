# Backend

This repository is a **static SPA**; the live backend is your **Supabase project** (Postgres, Auth, Row Level Security, Storage, and optional **Edge Functions**).

Use this folder for **server-side code you add later**, for example:

- `functions/` — Supabase Edge Functions (TypeScript), if you introduce them with the Supabase CLI  
- Small Node scripts for migrations or data jobs (keep secrets out of git)

The browser app in `frontend/` talks to Supabase using the keys in `.env` (`VITE_SUPABASE_*`).

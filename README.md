# Uganda NDC Data Explorer

Web application for exploring and managing Uganda’s Nationally Determined Contribution (NDC) data: decision-support cockpit, strategy library, climate risk views, and role-based delivery tools.

## Repository layout

| Layer | Folder | What lives here |
| ----- | ------ | ---------------- |
| **1. Frontend** | `frontend/` | Vite + React app (`src/`, `public/`, `index.html`, `vite.config.ts`, Tailwind under `frontend/config/`) |
| **2. Backend** | `backend/` | Notes on hosted Supabase + optional future Edge Functions — see `backend/README.md`. The **Express emissions API** for Climate TRACE lives at the **repo root** (`server.js`, `routes/`, `services/`). |
| **3. Database** | `database/` | Postgres migrations and `config.toml` for the Supabase CLI — see `database/README.md`. |

Repo-wide tooling: **`config/`** (ESLint, Playwright). Root **`package.json`** drives install and scripts. Add shadcn components from the **`frontend/`** directory (`cd frontend` then `npx shadcn@latest add …`).

## Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/) (Auth + Postgres)

## Local development

Prerequisites: [Node.js](https://nodejs.org/) (LTS recommended) and npm.

```sh
git clone <YOUR_GIT_URL>
cd ndc-data-explorer-e051f914
cp .env.example .env
# Edit .env: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from Supabase → Project Settings → API
npm install
npm run dev
```

The dev server runs at [http://localhost:8080](http://localhost:8080) (see `frontend/vite.config.ts`).

Apply database migrations from **`database/migrations/`** in the Supabase SQL Editor (oldest file first) or via the [Supabase CLI](https://supabase.com/docs/guides/cli) using the `database/` directory as your project folder. Include **`20260514000000_climatetrace_emissions.sql`** before seeding Climate TRACE data.

## Climate TRACE API (emissions)

Root **`server.js`** exposes JSON under **`/api/v1`** (default port **`8787`**, override with `API_PORT`).

- Set **`SUPABASE_SERVICE_ROLE_KEY`** and **`SUPABASE_URL`** (or reuse `VITE_SUPABASE_URL` as `SUPABASE_URL`) in `.env` for DB access.
- **`USE_MOCK_DATA=true`**: serves the same routes from fixtures; **`/api/v1/mock/**`** is always available for mock responses even when mock mode is off.
- **Seed** (300 ms between upstream calls): `npm run seed:climatetrace:dry` then `npm run seed:climatetrace` after migrations are applied.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run start:api` | Start Express API |
| `npm run seed:climatetrace` | Fetch Climate TRACE and upsert into `climatetrace_emissions` |
| `npm run seed:climatetrace:dry` | Dry run (summary table only) |
| `npm run seed:climatetrace:year` | Example: seed one filter (`--year=2022 --sector=afolu`) |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build (output: `frontend/dist`) |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest |
| `npm run test:e2e` | Run Playwright (`config/playwright.config.ts`) |
| `npm run lint` | Run ESLint (`frontend/` + API JS) |

## Deploy

Build with `npm run build`, then host **`frontend/dist/`** on your static host. Configure the same `VITE_*` environment variables on your host.

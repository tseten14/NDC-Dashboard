# Uganda NDC Data Explorer

Web application for exploring and managing Uganda’s Nationally Determined Contribution (NDC) data: decision-support cockpit, strategy library, climate risk views, and role-based delivery tools.

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

The dev server runs at [http://localhost:8080](http://localhost:8080) (see `vite.config.ts`).

Apply database migrations from `supabase/migrations/` in the Supabase SQL Editor (oldest file first) or via the [Supabase CLI](https://supabase.com/docs/guides/cli).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest               |
| `npm run lint` | Run ESLint               |

## Deploy

Build static assets with `npm run build` and host the `dist/` folder on any static host (e.g. Netlify, Vercel, Cloudflare Pages). Configure the same `VITE_*` environment variables in the host’s dashboard.

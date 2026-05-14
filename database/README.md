# Database

SQL migrations for the Supabase-hosted **Postgres** database live here.

## Apply migrations

**Option A — Supabase Dashboard**  
Open **SQL Editor**, run each file in `migrations/` in chronological order (by filename).

**Option B — Supabase CLI**  
From the repository root, point the CLI at this directory (exact flag depends on your CLI version), or run commands after `cd database` if your CLI expects `config.toml` in the current working directory.

## Layout

- `config.toml` — local Supabase CLI / project metadata  
- `migrations/` — versioned SQL changes

Update `project_id` in `config.toml` if you use the Supabase CLI against a different hosted project.

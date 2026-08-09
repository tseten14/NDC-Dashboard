# Security

This document describes how the Uganda NDC Data Explorer protects data, credentials, and users. It is written for developers and operators deploying the application.

---

## 1. Application security architecture

```
Browser (React/Vite SPA)
    │  same-origin /api/v1/*  (credentials: include for writes)
    ▼
Express API  (local: backend/server.js  |  Vercel: api/index.js)
    │  helmet, CORS, rate limits, body-size cap, operator auth
    ├── Climate TRACE v7  (public, no key)
    ├── OpenAI Chat Completions  (server-side key only)
    └── Postgres  (Drizzle ORM, parameterized queries)
         └── JSON file fallback  (local dev when DATABASE_URL unset)
```

**Trust boundaries**

| Layer | Trusts | Does not trust |
|-------|--------|----------------|
| Browser | Its own UI state | Anything from the user without validation |
| API | Validated input, allow-listed origins | Client role labels, client-side “Admin” flags |
| Database | Parameterized queries from the API | Raw user strings in SQL |

There is **no Supabase SDK** in this application. Postgres may be hosted on Supabase, Neon, or any provider via `DATABASE_URL` only.

---

## 2. Authentication model

### Public read access

All `GET /api/v1/*` endpoints are **public** unless noted. They serve Climate TRACE aggregates, bundled policy documents, risk reference data, and NDC catalog data. Rate limiting applies (200 requests / 15 min / IP).

### Operator authentication (write access)

Endpoints that **change data** or expose operational detail require operator authority:

| Method | What proves authority |
|--------|----------------------|
| Browser session | HttpOnly cookie `ndc_ops_session` issued after passphrase entry |
| Machine / script | Header `x-api-key: <INGEST_API_KEY>` |

**Session flow**

1. Operator opens **Data Ingestion** and enters the passphrase once.
2. `POST /api/v1/auth/session` validates it and sets an HttpOnly, SameSite=Strict cookie scoped to `/api`.
3. Subsequent import requests send the cookie automatically (`credentials: "include"`).
4. Session expires after **8 hours** or when the operator clicks **Lock now** (`DELETE /api/v1/auth/session`).

**Why not `VITE_INGEST_API_KEY`?**

Any variable prefixed `VITE_` is compiled into the JavaScript bundle and readable by anyone who opens the page. The previous design exposed the write passphrase in the public bundle. **Do not reintroduce a `VITE_` mirror of `INGEST_API_KEY`.**

### End-user authentication

There is **no end-user login**. The role switcher in the UI is a **presentation aid only** — it does not authenticate anyone. Do not rely on it for security decisions.

---

## 3. Authorization model

| Resource | Server enforcement |
|----------|-------------------|
| Climate TRACE / policy reads | Public |
| AI analysis (`POST …/analyze`) | Public but rate-limited; costs OpenAI quota |
| Policy forecast (`POST …/forecast`) | Public, rate-limited, Zod-validated |
| Ingest writes | Operator session or `x-api-key` |
| Ingest job list | Operator session or `x-api-key` |
| Admin UI page | **Client-side only** — no server admin role |

**Cross-site request forgery (CSRF)**

Cookie-authenticated writes require a matching `Origin` or `Referer` from an allow-listed front-end origin. Foreign sites cannot trigger imports using a logged-in operator’s browser.

---

## 4. Database security

### Access pattern

- **Single connection string** (`DATABASE_URL`) used only on the server.
- **Drizzle ORM** with bound parameters — no string-concatenated SQL from user input.
- **SSL required** automatically for non-localhost hosts (`DATABASE_SSL=require` to override).
- **Pool capped** at 5 connections per serverless instance (`DATABASE_POOL_MAX`).
- **Statement timeout** 15 s to prevent runaway queries.

### Schema integrity

Migration `0002_core_tables_and_constraints.sql` adds:

- Core tables (`targets`, `observations`, `ingest_jobs`, `audit_log`) if missing
- `CHECK` constraints on observation years (1900–2100) and `qaqc_status` values
- Indexes on `(target_id, year)` and ingest job timestamps

### Ingest overwrite rules

- **`validated`** observations are never silently overwritten by uploads.
- **`ingested`** rows may be replaced only in **overwrite** mode, inside a **transaction**.
- Maximum **50 000 rows** per import.

### Recommended database role (production)

Create a dedicated application user — not the superuser:

```sql
CREATE USER ndc_app WITH PASSWORD '<strong-random-password>';
GRANT CONNECT ON DATABASE ndc_explorer TO ndc_app;
GRANT USAGE ON SCHEMA public TO ndc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ndc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ndc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ndc_app;
```

Do **not** grant `SUPERUSER`, `CREATEDB`, or `BYPASSRLS`.

Row Level Security is **not used** — this app has a single service account and no per-user rows. If multi-tenant user data is added later, RLS must be designed for that model.

---

## 5. RLS policies

**Not applicable.** The application does not use Supabase client libraries or Postgres RLS. All access is through the API service account.

---

## 6. API security

| Control | Implementation |
|---------|----------------|
| Input validation | Zod on AI routes; shared `queryParams` for years/limits; sector allow-list |
| Body size | 1 MB JSON cap |
| Rate limiting | Reads 200/15 min; writes 60/15 min; ingest writes 20/15 min; AI 20/15 min; auth attempts 10/15 min |
| Error responses | Generic messages + `request_id`; no stack traces or driver errors to clients |
| SSRF (policy PDF) | HTTPS only; host allow-list (`cdn.climatepolicyradar.org`); no redirects; 25 MB cap |
| File upload | MIME sniffing; extension allow-list; size limits; filename sanitization |
| Subprocess (Python) | Fixed script paths; user data on stdin JSON only; disabled on Vercel |
| 404 | JSON `{ error: "not_found" }` — never HTML stack traces |

---

## 7. Environment variable rules

### Safe in the browser (`VITE_*` only)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Optional API host override (usually unset — same-origin) |

**Never** prefix secrets with `VITE_`.

### Server-side only

| Variable | Purpose |
|----------|---------|
| `INGEST_API_KEY` | Operator passphrase / machine API key |
| `SESSION_SECRET` | Signs session cookies (optional; derived from ingest key if unset) |
| `OPENAI_API_KEY` | AI analysis |
| `ANTHROPIC_API_KEY` | Legacy/unused in current routes |
| `DATABASE_URL` | Postgres connection |
| `DATABASE_SSL` | `require` / `no-verify` / `disable` |
| `FRONTEND_ORIGIN` | CORS allow-list (comma-separated) |
| `SEED_DB` | Reference seed on boot — keep `false` in production |
| `ALLOW_PRODUCTION_SEED` | Extra gate for production seeding |
| `TRUST_PROXY_HOPS` | Rate-limit IP extraction (1 on Vercel) |
| `CLIMATE_TRACE_TIMEOUT_MS` | Upstream timeout (default 15000) |

See `.env.example` for the full list.

---

## 8. Secret management

1. Copy `.env.example` → `.env` locally. **Never commit `.env`.**
2. Set production secrets in the Vercel project dashboard (or your host’s secret store).
3. Run `npm run scan:secrets` after every production build — it fails if server secrets appear in `frontend/dist`.
4. Rotate credentials if they ever appeared in git history (see SECURITY_AUDIT.md).

`.gitignore` blocks `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, credential JSON files, and database dumps.

---

## 9. Security headers

**API responses** (Helmet in `backend/server/middleware/security.js`):

- Content-Security-Policy with `frame-ancestors 'none'`
- Strict-Transport-Security (2 years, preload)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (camera, mic, geolocation disabled)

**Static HTML/JS** (`vercel.json`):

- Matching CSP, HSTS, frame denial, Permissions-Policy on all routes
- Long cache for hashed assets; no-store for `/api/*`

---

## 10. Rate limiting

All limits are **per client IP** (requires correct `trust proxy` on Vercel).

| Limiter | Scope | Limit |
|---------|-------|-------|
| Read | `GET /api/v1/*` | 200 / 15 min |
| Write | non-GET `/api/v1/*` | 60 / 15 min |
| Ingest write | `/api/v1/ingest/*` writes | 20 / 15 min |
| AI | `POST …/analyze` | 20 / 15 min |
| Compute | `POST …/forecast` | 60 / 15 min |
| Auth | `POST /auth/session` | 10 failures / 15 min |
| Client errors | `POST /client-errors` | 50 / hour |

Over-limit responses: `{ error: "rate_limited", retry_after_seconds: N }`.

---

## 11. Data ingestion security

- **Authentication** required for all writes and job listing.
- **Content validation** via magic-byte sniffing (upload + scan).
- **Row validation** before Postgres insert; conflict detection for append/overwrite.
- **Transactional** overwrite of prior `ingested` rows.
- **No shell** invocation with user-controlled strings.
- **Audit snapshots** written to `data/ingest-imports/` (local) or `/tmp/ingest-imports/` (Vercel).

---

## 12. External API security

| Service | Key location | Timeout | Notes |
|---------|--------------|---------|-------|
| Climate TRACE v7 | None (public) | 15 s | Responses validated with Zod |
| OpenAI | `OPENAI_API_KEY` server-side | 55 s | Rate-limited; input length capped |
| CPR PDF CDN | None | 20 s | Host allow-list; redirect blocked |

---

## 13. Deployment security

**Vercel**

- Set `FRONTEND_ORIGIN` to your production URL.
- Set `INGEST_API_KEY`, `SESSION_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL` in project env (not in repo).
- `TRUST_PROXY_HOPS=1` (default when `VERCEL` is set).
- `SEED_DB=false`; do not set `ALLOW_PRODUCTION_SEED` unless doing a one-off seed.
- Serverless function bundles backend code only — no `.env` file in the artifact.

**Local development**

- Use `.env` with dev placeholders from `.env.example`.
- `USE_MOCK_DATA=true` avoids live Climate TRACE during offline work.

---

## 14. Dependency security

Run regularly:

```bash
npm audit --audit-level=high
npm run audit:security   # lint + types + tests + build + secret scan + audit
```

**Known accepted risks (as of audit):**

- `xlsx` — high severity, no upstream fix; used only for **client-side export generation** from app data, not for parsing untrusted uploads. Monitor for replacement (`sheetjs-ce` or CSV-only export).
- `drizzle-kit` / `@esbuild-kit/*` — dev-only migration tooling.
- `react-router` moderate — open-redirect class; mitigated because all `<Link to>` targets use fixed in-app paths.

---

## 15. Incident response basics

1. **Rotate** compromised credentials immediately (`INGEST_API_KEY`, `SESSION_SECRET`, `OPENAI_API_KEY`, database password).
2. **Revoke** sessions by rotating `SESSION_SECRET` or `INGEST_API_KEY` (both invalidate existing cookies).
3. **Review** server logs for `write_auth_failed`, `csrf_blocked`, `cors_rejected`, `operator_unlock_failed`.
4. **Check** ingest audit files under `data/ingest-imports/` for unauthorized imports.
5. **Redeploy** after env changes.

---

## 16. How to rotate credentials

| Secret | Steps |
|--------|-------|
| `INGEST_API_KEY` | Generate new value → update Vercel env + local `.env` → redeploy → inform operators → old sessions invalid immediately |
| `SESSION_SECRET` | Generate new → update env → redeploy → all sessions invalid |
| `OPENAI_API_KEY` | Rotate in OpenAI dashboard → update env → redeploy |
| `DATABASE_URL` | Change password in Postgres → update connection string → redeploy |
| Historical git leak | Rotate the leaked credential even if removed from current tree; consider `git filter-repo` for public repos |

---

## 17. How developers should safely add new APIs

1. **Classify** the route: public read, authenticated write, or expensive (AI/compute).
2. **Mount** under `/v1` in `createApp.js` so global middleware applies.
3. **Validate** all query/body/path input with Zod or shared helpers.
4. **Never** return `err.message` from caught exceptions — use `sendServerError()`.
5. **Never** put secrets in `VITE_*` variables.
6. **Add** a test to `backend/server/security.test.js` if the route is write-protected or accepts hostile input shapes.
7. **Document** new env vars in `.env.example` and this file.

---

## 18. Security checklist for future development

- [ ] Is this endpoint public, operator-only, or machine-only?
- [ ] Are all inputs validated (type, length, allow-list)?
- [ ] Does the error response leak internals?
- [ ] Could this be abused for cost (AI) or load (DB/external API)?
- [ ] Is rate limiting appropriate?
- [ ] Does a new secret need to stay server-side?
- [ ] Did `npm run scan:secrets` pass after frontend changes?
- [ ] Did `backend/server/security.test.js` get updated?
- [ ] Is there a migration if schema constraints change?

---

## Running security checks locally

```bash
npm run audit:security    # full pipeline
npm test                  # includes 34+ server security regression tests
npm run test:e2e          # includes browser security + smoke tests
npm run scan:secrets      # after npm run build
```

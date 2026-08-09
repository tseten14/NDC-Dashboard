# Security Audit Report

**Application:** Uganda NDC Data Explorer  
**Audit date:** August 2026  
**Scope:** Full codebase — frontend, backend, database, deployment, dependencies, git history  
**Method:** Architecture mapping, manual code review, automated tests, live endpoint probing, build-output secret scanning, `npm audit`

> No actual secret values appear in this document.

---

## Executive summary

| Metric | Before | After |
|--------|--------|-------|
| Approximate security posture | **4 / 10** | **7.5 / 10** |
| Critical issues (open) | 2 | 0 (fixed; 1 requires credential rotation) |
| High issues (open) | 6 | 1 (xlsx — accepted risk) |
| Automated security tests | 0 | 34 server + 5 browser |

The largest gap before the audit was **defense in depth without real authentication**: a write passphrase was embedded in the public JavaScript bundle, AI endpoints were unauthenticated and unbounded, and CORS allowed any origin on Vercel. Those are fixed. Remaining gaps are mostly **operational** (credential rotation, production env configuration, dedicated DB role) and **architectural** (no end-user auth by design).

---

## Critical

### C-1: Write API key compiled into browser bundle

| | |
|---|---|
| **Severity** | Critical |
| **Cause** | `VITE_INGEST_API_KEY` duplicated `INGEST_API_KEY` and was read in `frontend/src/lib/api.ts`, embedding the literal passphrase in every production JS bundle |
| **Impact** | Any visitor could extract the key and call all ingest write endpoints |
| **Fix** | Removed all `VITE_INGEST_API_KEY` usage. Implemented HttpOnly session cookies (`backend/server/auth/operatorSession.js`, `backend/routes/authSession.js`) with operator unlock UI |
| **Files** | `frontend/src/lib/api.ts`, `frontend/src/lib/operator-session.ts`, `frontend/src/hooks/use-operator-session.tsx`, `frontend/src/components/ingest/OperatorUnlock.tsx`, `frontend/src/pages/DataIngestion.tsx`, `backend/server/middleware/apiKeyAuth.js`, `.env.example` |
| **Verification** | `npm run scan:secrets` — 9 server-side `.env` values checked, none in bundle; mutation-tested scanner |

### C-2: Supabase anon JWT committed to git history

| | |
|---|---|
| **Severity** | Critical (historical) |
| **Cause** | `.env` committed in early commit `a9d3bbb`, removed later but **still reachable in git history** on `origin/main` |
| **Impact** | JWT usable against former Supabase project if still active |
| **Fix in repo** | `.env` untracked; `.gitignore` strengthened |
| **Manual action required** | **Rotate/revoke** the historical Supabase anon key. Consider `git filter-repo` if repository is public |

---

## High

### H-1: CORS allowed all origins on Vercel

| | |
|---|---|
| **Severity** | High |
| **Cause** | `createCorsMiddleware()` returned `true` for any origin when `process.env.VERCEL` was set |
| **Impact** | Any website could read API responses from a visitor's browser |
| **Fix** | Explicit allow-list via `FRONTEND_ORIGIN` + auto-detected Vercel deployment URLs (`backend/server/middleware/allowedOrigins.js`, `cors.js`) |
| **Files** | `backend/server/middleware/cors.js`, `backend/server/middleware/allowedOrigins.js` |

### H-2: Unauthenticated AI endpoints (cost abuse)

| | |
|---|---|
| **Severity** | High |
| **Cause** | `POST /dashboard/analyze` and `POST /policy/analyze` had no auth or rate limit |
| **Impact** | Unlimited OpenAI spend; prompt injection surface |
| **Fix** | AI rate limiter (20/15 min/IP); Zod input validation; safe error responses |
| **Files** | `backend/routes/dashboardAi.js`, `backend/routes/policyAi.js`, `backend/server/createApp.js`, `backend/server/middleware/rateLimit.js` |

### H-3: Unauthenticated ingest job listing

| | |
|---|---|
| **Severity** | High |
| **Cause** | `GET /api/v1/ingest/jobs` was public |
| **Impact** | Filenames and error messages from all imports exposed |
| **Fix** | Requires operator session or `x-api-key` |
| **Files** | `backend/routes/ingest.js` |

### H-4: Internal errors leaked to clients (~38 endpoints)

| | |
|---|---|
| **Severity** | High |
| **Cause** | `res.status(500).json({ error: err.message })` pattern; DB health returned driver connection strings |
| **Impact** | Hostnames, paths, SQL hints, upstream URLs exposed |
| **Fix** | Central `sendServerError()` / `sendClientError()`; sanitized health endpoints |
| **Files** | `backend/server/errors.js`, all route files under `backend/routes/` |

### H-5: Missing core database tables in migrations

| | |
|---|---|
| **Severity** | High (integrity) |
| **Cause** | `targets`, `observations`, `ingest_jobs`, `audit_log` in Drizzle schema but never created by SQL migrations |
| **Impact** | Fresh migrate left DB without core tables; app silently fell back |
| **Fix** | `database/migrations/0002_core_tables_and_constraints.sql` |
| **Files** | `database/migrations/0002_core_tables_and_constraints.sql`, `database/schema.ts` |

### H-6: Non-transactional ingest overwrite

| | |
|---|---|
| **Severity** | High (data integrity) |
| **Cause** | Delete-then-insert for overwrite mode without transaction |
| **Impact** | Partial failure could delete observations without replacement |
| **Fix** | Wrapped in `db.transaction()` with batched inserts |
| **Files** | `backend/services/persistence.js` |

### H-7: xlsx prototype pollution / ReDoS (dependency)

| | |
|---|---|
| **Severity** | High |
| **Cause** | `xlsx` package has known unfixed advisories |
| **Impact** | Theoretically exploitable if parsing hostile files; **actual use is client-side export only** |
| **Fix** | No code change — accepted risk documented; not used for upload parsing |
| **Remaining** | Plan migration to maintained fork or CSV-only export |

---

## Medium

### M-1: Prototype pollution bypass on sector validation

| | |
|---|---|
| **Severity** | Medium |
| **Cause** | `NDC_TARGETS[sector]` truthy for inherited keys like `"constructor"` |
| **Fix** | `Object.setPrototypeOf(NDC_TARGETS, null)` + `Object.freeze()` |
| **Files** | `config/ndcTargets.js` |

### M-2: No rate limit on general POST routes

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | `writeRateLimiter` (60/15 min) on all non-GET `/api/v1/*` |
| **Files** | `backend/server/middleware/rateLimit.js`, `createApp.js` |

### M-3: Climate TRACE fetch without timeout

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | `fetchUpstream()` with 15 s abort + response size cap |
| **Files** | `config/climateTrace.js`, `backend/services/climatetrace.js` |

### M-4: PDF fetch SSRF hardening incomplete

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | `redirect: "error"`, streaming size cap 25 MB |
| **Files** | `backend/routes/policyAi.js` |

### M-5: Scan endpoint lacked content MIME validation

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | `validateScanContent()` on scan uploads |
| **Files** | `backend/server/middleware/uploadValidation.js`, `backend/routes/ingest.js` |

### M-6: Sensitive values in HTTP logs

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | Pino redaction + minimal request serializer (no headers logged) |
| **Files** | `backend/server/logger.js` |

### M-7: Missing security headers on static assets

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | CSP, HSTS, X-Frame-Options, Permissions-Policy in `vercel.json` |
| **Files** | `vercel.json` |

### M-8: Database connection without SSL/pooling/timeout

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | Auto SSL for remote hosts; pool max 5; statement timeout 15 s |
| **Files** | `database/index.ts` |

### M-9: Production seed could run accidentally

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | Requires `ALLOW_PRODUCTION_SEED=true` on Vercel/production |
| **Files** | `database/bootstrap.ts` |

### M-10: Concurrent migration race on serverless cold start

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | `pg_advisory_lock` + per-file transactions |
| **Files** | `database/migrate.ts` |

### M-11: Weak `.gitignore` for env variants

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | `.env.*` pattern with `!.env.example`; credential file patterns |
| **Files** | `.gitignore` |

### M-12: CSRF on cookie-authenticated writes

| | |
|---|---|
| **Severity** | Medium |
| **Fix** | Origin/Referer check in `requireWriteApiKey` for session auth |
| **Files** | `backend/server/middleware/apiKeyAuth.js` |

---

## Low

### L-1: `X-Powered-By: Express` advertised

**Fix:** `app.disable("x-powered-by")` in `createApp.js`

### L-2: Ingest health leaked Python interpreter paths

**Fix:** Removed `python_error` from public response

### L-3: JSON body limit 2 MB (reduced to 1 MB)

**Fix:** `JSON_BODY_LIMIT = "1mb"`

### L-4: Filename path traversal in ingest metadata

**Fix:** `sanitizeFilename()` strips separators and control chars

### L-5: No import row count cap

**Fix:** `MAX_OBSERVATIONS_PER_IMPORT = 50_000`

### L-6: Client-side role switcher grants Admin freely

**Not fixed by design** — documented; server does not implement user roles

### L-7: FastAPI/SQLite stack in `backend/fastapi/` unused but present

**Not removed** — not mounted by production server; documented as dead code risk if accidentally deployed

### L-8: PII (emails) in tracked policy CSV

**Not removed** — `data/sources/Uganda_key_docs_*.csv`; review whether public release is intended

---

## Dependency audit results

| Action | Result |
|--------|--------|
| `npm audit fix` | 33 → 8 vulnerabilities |
| Vite upgraded 5 → 6 | Fixed high-severity dev-server path issues |
| Remaining 8 | 6 moderate (dev-only drizzle-kit/esbuild, react-router), 1 high (xlsx), 0 critical |

---

## Tests added

| Suite | Count | Location |
|-------|-------|----------|
| Server security regression | 34 | `backend/server/security.test.js` |
| Browser security e2e | 5 | `frontend/tests/e2e/security.spec.ts` |
| Build secret scanner | — | `scripts/scan_build_secrets.mjs` |
| Full audit script | — | `npm run audit:security` |

All **174 unit tests** and **10 e2e tests** pass after changes.

---

## Manual actions required

1. **Rotate** the Supabase anon JWT found in git history (commit era `a9d3bbb`).
2. **Remove** `VITE_INGEST_API_KEY` from your local `.env` if still present — it is no longer used and should not exist.
3. **Remove** unused Supabase keys from `.env` if the project no longer uses Supabase (`VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`).
4. **Set production env** on Vercel:
   - `INGEST_API_KEY` — strong random (32+ bytes)
   - `SESSION_SECRET` — separate strong random
   - `FRONTEND_ORIGIN` — your production URL
   - `DATABASE_URL` — dedicated `ndc_app` user (see SECURITY.md GRANT example)
   - `SEED_DB=false`
   - `OPENAI_API_KEY` — if AI features desired
5. **Rotate** any credentials that were ever in git or in the old `VITE_INGEST_API_KEY` bundle (assume compromised if app was publicly deployed).
6. **Review** PII in `data/sources/Uganda_key_docs_*.csv` for public repo suitability.
7. **Plan** replacement for `xlsx` export library.
8. **Consider** `git filter-repo` to purge historical `.env` from public remotes.

---

## Remaining risks (honest assessment)

| Risk | Why it remains |
|------|----------------|
| No end-user authentication | By product design — public climate data dashboard |
| Client-side Admin role | UI-only; no server admin API today |
| Single DB service account | No RLS; acceptable for single-tenant deployment |
| xlsx advisory | No fix available; export-only usage |
| AI endpoints still public | Intentional for dashboard UX; mitigated by rate limit + cost monitoring |
| Cannot verify production Vercel env from repo | Operator must configure secrets manually |
| FastAPI dead code | Could be deployed accidentally if misconfigured |
| Email PII in tracked CSV | Policy decision not made during audit |
| Session auth is shared passphrase | Not per-user audit trail; suitable for small trusted teams only |

---

## Files created or substantially changed

<details>
<summary>Security infrastructure (new)</summary>

- `backend/server/auth/operatorSession.js`
- `backend/server/middleware/allowedOrigins.js`
- `backend/server/errors.js`
- `backend/routes/authSession.js`
- `backend/server/security.test.js`
- `frontend/src/lib/operator-session.ts`
- `frontend/src/hooks/use-operator-session.tsx`
- `frontend/src/components/ingest/OperatorUnlock.tsx`
- `frontend/tests/e2e/security.spec.ts`
- `scripts/scan_build_secrets.mjs`
- `database/migrations/0002_core_tables_and_constraints.sql`
- `SECURITY.md`
- `SECURITY_AUDIT.md`

</details>

<details>
<summary>Hardened existing files</summary>

- `backend/server/createApp.js`
- `backend/server/middleware/apiKeyAuth.js`
- `backend/server/middleware/cors.js`
- `backend/server/middleware/security.js`
- `backend/server/middleware/rateLimit.js`
- `backend/server/middleware/uploadValidation.js`
- `backend/server/logger.js`
- `backend/routes/*` (all route files)
- `backend/services/persistence.js`
- `config/climateTrace.js`
- `config/ndcTargets.js`
- `database/index.ts`
- `database/migrate.ts`
- `database/bootstrap.ts`
- `database/schema.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/DataIngestion.tsx`
- `vercel.json`
- `.env.example`
- `.gitignore`
- `package.json`

</details>

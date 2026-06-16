# Documentation index

```
docs/
  guide/   For users          user-guide.md · data.md
  dev/     For developers      architecture.md · system-design.md · deploy.md · policy-engine.md · ct-data-gaps.txt
  demo/    For presenting      script.txt · notes.txt · deck.pptx · screenshots/
  samples/ Example payloads
```

## Primary reference

| Document | Audience | Purpose |
| -------- | -------- | ------- |
| [PROJECT_DOCUMENTATION.txt](./PROJECT_DOCUMENTATION.txt) | **Everyone (primary)** | Full non-technical feature guide (Part A) + technical API/config reference (Part B) |
| [../README.md](../README.md) | Developers | Quick start, stack, NDC targets, navigation |

## guide/ — for users

| Document | Purpose |
| -------- | ------- |
| [guide/user-guide.md](./guide/user-guide.md) | Short feature index; points to PROJECT_DOCUMENTATION.txt for detail |
| [guide/data.md](./guide/data.md) | Live vs indicative vs localStorage — data honesty tables |

## dev/ — for developers

| Document | Purpose |
| -------- | ------- |
| [dev/architecture.md](./dev/architecture.md) | Repo layout, routes, state, dev proxy |
| [dev/system-design.md](./dev/system-design.md) | End-to-end workflows, diagrams, data flows |
| [dev/deploy.md](./dev/deploy.md) | Vercel deployment, env vars, Postgres |
| [dev/policy-engine.md](./dev/policy-engine.md) | Policy Impact / KCI matching detail |
| [dev/ct-data-gaps.txt](./dev/ct-data-gaps.txt) | Climate TRACE known gaps and upstream requests |

## demo/ — for presenting

| Document | Purpose |
| -------- | ------- |
| [demo/script.txt](./demo/script.txt) | Demo quick start + suggested walkthrough |
| [demo/notes.txt](./demo/notes.txt) | 5-minute timed speaker notes (print this) |
| demo/deck.pptx | Slide deck (regenerate: `python3 scripts/build_demo_deck.py`) |
| demo/screenshots/ | Deck screenshots (`node scripts/capture_demo_screenshots.mjs`) |

## In-app user guide

The `/docs` tab has two views: **User guide** (`frontend/src/data/user-guide-content.ts`, aligned with **PROJECT_DOCUMENTATION.txt** Part A § A7) and **System design** (bundled from `docs/dev/system-design.md` at build time).

## Keeping docs in sync

When adding a **primary** sidebar route or API:

1. `frontend/src/App.tsx`, `AppSidebar.tsx`
2. `PROJECT_DOCUMENTATION.txt` (A6a routes, A7 feature entry, Part B API)
3. `docs/dev/system-design.md`, `docs/dev/architecture.md`, `README.md`
4. `frontend/src/data/user-guide-content.ts` (in-app /docs)
5. `docs/guide/data.md` if data honesty changes

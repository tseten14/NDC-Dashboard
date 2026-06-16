# NDC Data Explorer — Demo Scripts

**Primary script (5 minutes):** see **[DEMO_SPEAKER_NOTES.md](./DEMO_SPEAKER_NOTES.md)** — timed lines, clicks, and fallbacks.

**Live site:** https://ndc-data-explorer-e051f914.vercel.app

---

## Quick start

**Pre-flight (fastest):** Select Uganda → on **Home**, click **Start 5-minute demo**. This enables presenter mode, sets **Senior Decision-Maker**, and opens:

```
/dashboard?demo=1&sector=transport
```

**Manual bookmark:** Same URL as above. Demo mode persists in the session if you navigate away from `?demo=1`.

**Presenter UI:** Bottom-left toolbar — **Demo script** (timed steps), **Fullscreen** (or F11), **Nav** (temporarily show top navigation), **Exit demo**. Nav strip is hidden automatically during demo for a cleaner stage.

**Before stage:** Pre-warm production URL 2 minutes early; open `/map` in a background tab. Do **not** set `USE_MOCK_DATA=true` — it breaks map and dashboard routes.

---

## PowerPoint deck

Generate with:

```bash
pip install python-pptx
python3 scripts/build_demo_deck.py
```

Output: `docs/Uganda-NDC-Data-Explorer-Demo-June-17-2026.pptx` (11 slides — flowcharts, Climate TRACE pipeline, NDC AI, 3D GIS, screenshots).

Add screenshots to `docs/demo-screenshots/` before regenerating:

- `dashboard-transport.png`
- `map-uganda.png`
- `ai-2030.png`
- `documents-pathway.png`
- `climate-finance.png`

---

## Health check

Before presenting, confirm API is warm:

```
/api/v1/health/full
```

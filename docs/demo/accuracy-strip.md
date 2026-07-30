# Accuracy strip (demo cue)

On `/dashboard`, call out:

1. **Live Climate TRACE** strip at the top — health latency, country total, slug-sum Δ.
2. **Accuracy details** — opens the Accuracy audit drawer (slug breakdown, reconciliation JSON).
3. **How to read these numbers** — TRACE vs NDC inventory / BAU-ceiling framing; amber framework gap when baselines diverge.
4. District mode — page pill: “Observed context only — NDC targets are national.”
5. Observed Data — lineage chips + QA status; Source modal includes a **This request (live)** snapshot.

Pre-release check: `npm run verify:climatetrace` (network) and `npm test -- accuracy-chrome emissions-accuracy`.

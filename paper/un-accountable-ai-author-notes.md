# Author notes for the accountable climate AI Perspective

Draft prepared 24 September 2026. These notes are separate from the manuscript and are not intended for journal submission.

## Positioning

The draft follows the agreed institutional argument: the UN could mediate accountable use of LLMs for national climate-policy work, with the Uganda NDC Data Explorer as the concrete case. It is written toward an npj Climate Action Perspective, with a roughly 3,000-word main text and an abstract of no more than 70 words. It is a working manuscript, not a completed empirical effectiveness study or an official UN position.

Current venue guidance: [npj Climate Action content types](https://www.nature.com/npjclimataction/content-types). The previous outline verified the Perspective limits; the page was intermittently unavailable during draft preparation. Check the current guidance before submission. A longer translational version could target [Data & Policy](https://www.cambridge.org/core/journals/data-and-policy/information/author-instructions).

## Details to confirm in the next writing round

1. **Uganda approval.** Identify the approving body, date, scope, intended users, and supporting record. The draft accepts your report that use has been approved; it does not infer a Ugandan ministry endorsement, national rollout, or regular operational use. Replace the explicit confirmation sentence in section 3 when the details are available.
2. **Planet data.** Specify product, dates, geographic coverage, access terms, processing, and integration status. Your latest account establishes access to Planet data. Existing `docs/demo/trace-planet-notes.docx` describes the Planet component as a proposed AFOLU implementation-monitoring layer. Data access and product integration are different facts. The draft therefore includes the available-data context while treating the land-change workflow as proposed and reporting no Planet result.
3. **System version.** Choose the release the paper describes. The case is based on the supplied paper and development documentation, not an audit of today's production application. Check whether progress scoring, citation resolution, or document processing has changed since that description.
4. **Institutional scope.** Confirm the affiliation wording, responsible UNFCCC unit, and how the development and approval process should be described. The draft proposes a broader UN role; it does not claim a UN-wide service, formal safe-harbor designation, or affiliation with AI4ClimateAction.
5. **Author and disclosure statements.** Finalize authorship, contributions, acknowledgements, funding, data permissions, competing interests, and any applicable institutional disclaimer. Do not automatically carry forward the original draft's statement that a named person reviewed a draft as though they reviewed this new manuscript.

## What is already concrete and what still needs evidence

The paper contains a checkable transport arithmetic illustration based on published NDC values. The 7.5 MtCO2e observation is explicitly hypothetical. No query benchmark, live inventory extract, Planet analysis, interview study, or policymaker experiment was conducted for this draft. The three task walkthroughs describe workflows and reasoning boundaries, not measured success rates.

To add a real worked demonstration without waiting for future emissions, select a dated Climate TRACE extract, archive request parameters and response, identify the portal release and model, save the exact query and generated answer, and obtain an expert check. Include a difficult or failed example using a stated selection rule. Do not select only favorable outputs and then report them as representative accuracy.

The retrospective evaluation in section 6 is a proposal. Dashboard-only and deterministic briefing baselines are important because they distinguish the benefit of data integration from the incremental benefit of an LLM. User time and decision-quality claims require observed task performance; historical emissions alone cannot establish them.

## Corrections and editorial decisions incorporated

- Uses the official annual transport baseline and mitigation values from Uganda NDC Figure 3-6 rather than asserting that annual trajectories are unavailable.
- Treats accounting comparability as a prerequisite for a meaningful score, not something established by source links or matching units.
- Describes exact/contextual claim verification as proposed assurance, with the original near-match citation behavior as a design failure motivating it.
- Corrects the Climate TRACE paper's lead author to Brittany V. Lancellotti and cites a specific preprint version.
- Removes the unverified FAO equation attribution and unverified Zenodo record from this manuscript.
- Uses existing source data to motivate historical analysis and reserves causal policy-impact claims for later evaluation.
- Keeps institutional responsibilities central; compresses implementation details and omits executive recognition as evidence of effectiveness.
- Defines safe harbor as a proposed operating model, without implying legal immunity, official designation, or demonstrated safety.
- Draws on the user's original manuscript, especially its fragmented-evidence problem, fact ledger, data distinctions, and district non-scoring principle.

## Suggested display items for the next revision

**Figure 1: Responsibilities in an institutionally supported climate AI service.** Show national institutions defining questions and retaining decision authority; data providers supplying versioned evidence; a bounded assistant supporting analysis; and an intermediary coordinating stewardship, evaluation, maintenance, and correction. Include a visible challenge-and-correction path. Distinguish actual case arrangements from proposed responsibilities.

**Box 1: A source-grounded transport comparison.** Show the official 2024 and 2030 NDC values and the hypothetical observation. Explain that an annual pathway comparison requires compatible accounting, and that a current-year alignment measure is not a forecast or a causal estimate.

**Optional Figure 2 after data confirmation: Three layers of AFOLU evidence.** Distinguish independent emissions estimates, Earth-observation implementation indicators, and national accounting/field verification. Include an actual Planet-derived output only after the product, method, permissions, and interpretation are confirmed.

## Files

- `un-accountable-ai-perspective.md`: original text draft.
- `un-accountable-ai-perspective.docx`: Word review copy.
- `un-accountable-ai-perspective.tex`: current editable LaTeX manuscript, with embedded bibliography and linked citations.
- `un-accountable-ai-perspective.pdf`: reading copy.
- `un-accountable-ai-author-notes.md`: this editorial checklist.

The original `ndc_data_explorer.tex` is preserved. Following the request to work in LaTeX, continue revisions in `un-accountable-ai-perspective.tex`. Compile with pdfLaTeX twice; no external bibliography or journal style file is required. The Word and Markdown copies retain the earlier text draft and are not automatically synchronized.

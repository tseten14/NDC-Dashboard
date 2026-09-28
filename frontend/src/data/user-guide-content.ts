/**
 * Plain-language user guide content (in-app Documentation tab at /docs → User guide).
 * System design lives in docs/dev/system-design.md (rendered on the System design tab).
 * Keep in sync with PROJECT_DOCUMENTATION.txt Part A (especially § A7).
 */

export interface FeatureGuide {
  title: string;
  to: string;
  who: string;
  purpose: string;
  steps: string[];
  howItWorks: string;
  result: string;
  limitations: string;
  youWillSee: string[];
}

export const GETTING_STARTED = [
  {
    step: "1",
    title: "Pick your country",
    text: "No site account is needed right now. On first visit choose Uganda — the only country with a full data cockpit today. Use Change country in the top bar to return to the country screen.",
  },
  {
    step: "2",
    title: "Choose your role",
    text: "Use the role selector in the top bar (for example, MRV Officer or Senior Decision-Maker). It changes visible tools and workflow actions, not national statistics. It is a browser preference, not an account or security credential.",
  },
  {
    step: "3",
    title: "Navigate by decision question",
    text: "The top bar shows shortcuts. Open All tools for Explore, Plan & deliver, and Manage & learn pages. The Home page links to decision paths, and this guide links to additional pages.",
  },
  {
    step: "4",
    title: "Start on the Dashboard for emissions",
    text: "Select a sector (e.g. Transport), click one NDC target on the left, and read the centre chart (what we measure) and right column (are we on track). Use other menu items when you need maps, documents, or the sourced finance register.",
  },
  {
    step: "5",
    title: "Return here when stuck",
    text: "This guide explains each screen, where numbers come from, and what you can safely tell ministers vs what still needs verification.",
  },
];

export const BASIC_FEATURES: FeatureGuide[] = [
  {
    title: "Home",
    to: "/",
    who: "Everyone — first stop after choosing a country",
    purpose: "Orient new users, surface NDC delivery gaps, and jump to the right decision tool fast.",
    steps: [
      "Read the Decision Cockpit section at the top — three cards route you to Q1, Q3, or Q5 instantly.",
      "Review the NDC gap priorities panel — sectors ranked by distance to 2030 goals.",
      "Click a gap row or feature card (e.g. Dashboard, Policy Impact) to go straight there.",
      "Use Change country in the header if you need to re-select Uganda.",
    ],
    howItWorks:
      "Home loads a gap summary from live Climate TRACE predictions where available; indicator-only targets are labelled Indicative. The Decision Cockpit links to /dashboard, /delivery, and /ownership. Feature cards link to all modules. Old ?target= URLs forward to Dashboard.",
    result: "You see which sectors need attention and immediately know which tool to open.",
    limitations: "Gap panel is a briefing aid — open Dashboard for full target detail.",
    youWillSee: ["Decision Cockpit with three Q1/Q3/Q5 quick-links", "NDC gap priorities panel", "Feature cards with Live/Indicative chips", "Country name in the header"],
  },
  {
    title: "Dashboard",
    to: "/dashboard",
    who: "Planners, MRV teams, ministry staff, partners, executive briefings",
    purpose:
      "Compare Uganda’s official NDC pledges (2022 update) to observed greenhouse-gas trends and see delivery gaps at a glance.",
    steps: [
      "Choose Sector at the top (AFOLU, Energy, Transport, etc.) or Economy-wide.",
      "Click one target card in the left column once — centre and right panels update.",
      "Optional: switch Geography to District and pick a district for local context.",
      "Optional: open NDC AI (sparkle button) for Perplexity-style cited analysis of the current target.",
      "Optional: Historical vs Projection for time view.",
      "Use Export for Excel, PDF, or CRT/BTR-style CSV.",
      "Optional: open Accuracy details (banner) or Data & insights → Accuracy audit for slug-level TRACE reconciliation.",
      "Optional: expand How to read these numbers for TRACE vs NDC inventory framing.",
      "Open buttons under the right column for activities, top emitters, spatial certainty, mitigation options, and official policy sources.",
    ],
    howItWorks:
      "Targets and activity catalogues are stored in the app from Uganda’s NDC. Observed emissions are fetched live from Climate TRACE (satellite and model-based inventory), converted to million tonnes (MtCO₂e), and compared to each target’s baseline and 2030 goal. Progress colours use rules: how close the latest year is to the ceiling, whether catalogue activities exist, and data quality flags. An accuracy strip shows live TRACE health and country-vs-slug reconciliation Δ.",
    result:
      "For the selected target you see: a time-series chart, a progress judgement (on track / at risk / off track), summary counts for all targets in that sector, and optional drill-downs. District view shows observed emissions for one district but does not score districts against national NDC targets.",
    limitations:
      "Not official UNFCCC submission software. Climate TRACE and national inventory methods can differ — warnings appear when they diverge. District mode is contextual only.",
    youWillSee: [
      "Live Climate TRACE accuracy strip (health, slug-sum Δ, Accuracy details)",
      "How to read these numbers callout + framework-gap note when TRACE ≪ NDC baseline",
      "District pill: Observed context only — NDC targets are national",
      "NDC target cards with badges (Unconditional, Conditional, etc.)",
      "Observed vs target chart with baseline and 2030 markers — click any bar to trace its data source",
      "Data lineage chips + QA status on Observed Data",
      "Data Provenance panel (appears below chart after clicking a bar): methodology, uncertainty, primary sources, Climate TRACE link",
      "Source button (</> icon) in Observed Data header → lineage modal with live request snapshot + methodology notes",
      "Accuracy audit drawer (slug breakdown, reconciliation, copy JSON)",
      "NDC Ceiling and No-Policy Level legend items with info (ⓘ) tooltips explaining BAU and NDC commitments",
      "Progress % and status colour",
      "Strip of ON-TRACK / OFF-TRACK / IMPL. GAPS / MRV GAPS counts",
      "CT Verified / Estimated badges on Top Emitting Sources rows (with tooltip explaining the difference)",
      "Compact NDC gap priorities strip (click a sector to filter)",
      "NDC AI dialog — quick analysis + chat with per-paragraph citations to Climate TRACE API and UNFCCC NDC PDF",
      "Ingested provenance badge on indicator targets when ministry data is uploaded",
    ],
  },
  {
    title: "Policy Impact",
    to: "/policy-impact",
    who: "Socio-economic planners, gender/equity teams, policy designers",
    purpose:
      "Check whether reviewed quantitative evidence is available for a socio-economic policy forecast.",
    steps: [
      "Open Policy Impact from the menu (or from Dashboard Mitigation Options).",
      "Read the evidence-availability notice.",
      "Use Policy Documents to inspect the underlying policy sources.",
      "Wait for reviewed cases with page-level quantitative evidence before using forecast results.",
    ],
    howItWorks:
      "The API fails closed while no approved quantitative case series is connected. Earlier demonstration cases were removed because their documents did not support the numerical effects shown.",
    result:
      "A clear unavailable state and a description of the evidence needed to enable the feature.",
    limitations:
      "No socio-economic forecast, causal attribution, or confidence score is currently produced.",
    youWillSee: [
      "Verified evidence required notice",
      "Explanation of removed demonstration estimates",
      "Link to the policy evidence library",
    ],
  },
  {
    title: "Data Ingestion",
    to: "/ingest",
    who: "Data officers, GIS teams, MRV units uploading files",
    purpose: "Profile ad-hoc files (quick scan) or import structured observation rows into the database (mapped import).",
    steps: [
      "Open Data Ingestion from the menu.",
      "Unlock the operator session for either import path. Quick scan opens first; use Data Pipeline for mapped CSV or JSON import, review auto-mapping, then confirm.",
      "After confirm, read the success panel — it states how many rows were stored and which dashboard targets they affect.",
      "Quick scan: switch tab to upload CSV, JSON, PDF, or text for profiling only (no database write).",
      "GIS upload and live connectors remain work in progress.",
    ],
    howItWorks:
      "Mapped import parses on the server, maps columns to observation fields, and writes rows to the Postgres observations table when DATABASE_URL is configured. Ingested points appear on the Dashboard Observed Data column for indicator targets (forest cover, electricity access, CSA adoption, wetlands, capacity) — not Climate TRACE MtCO₂e sectors yet. Quick scan profiles files (optionally with pandas) and never persists.",
    result:
      "Mapped import: stored observation rows plus an audit JSON under data/ingest-imports. Quick scan: a triage report in the browser.",
    limitations:
      "Both paths require an operator unlock. Mapped import requires Postgres for persistence. Ingested data is unverified until MRV sign-off and does not replace Climate TRACE emissions on MtCO₂e targets. PDF mapped import is analysis-only unless exported to CSV/JSON.",
    youWillSee: [
      "Mapped import drop zone and column mapper",
      "Post-import summary (storage location, target keys, dashboard link)",
      "Quick scan tab for profiling",
      "Ingested badge on Dashboard when DB observations exist",
    ],
  },
  {
    title: "AI 2030 Projection",
    to: "/ai-2030",
    who: "Policy planners, strategy teams, briefing officers",
    purpose: "Show where sector emissions might land in 2030 if recent trends continue — compared to NDC goals.",
    steps: [
      "Open AI 2030 Projection.",
      "Review the chart for each sector with a Climate TRACE history.",
      "Read the shaded band as uncertainty, not a government forecast.",
      "Compare the 2030 point to the NDC target line where shown.",
    ],
    howItWorks:
      "The server fits a simple trend on historical Climate TRACE annual totals per sector (national or district). It projects forward to 2030 and adds an uncertainty range from historical variability. NDC target values come from the bundled 2022 NDC configuration.",
    result: "A directional “if current trends continue” picture plus gap to target — useful for meetings, not for legal commitments.",
    limitations: "Not a climate model. Does not include new policies unless they already appear in observed data. Extreme years can skew trends.",
    youWillSee: ["Sector charts with history, projection, and uncertainty band", "2030 vs NDC reference", "Labels marking data as indicative"],
  },
  {
    title: "Climate Finance",
    to: "/climate-finance",
    who: "Investment officers, carbon-market teams, programme managers",
    purpose:
      "Review the small set of climate-finance commitments whose amounts and source pages have been checked.",
    steps: [
      "Open Climate Finance.",
      "Read the partial-coverage notice before using any total.",
      "Open each provider link to confirm the commitment and project scope.",
      "Treat commitment amounts separately from disbursement or expenditure.",
      "Export the sourced records if you need a working table.",
    ],
    howItWorks:
      "The register currently contains only exact, sourced commitments for GCF FP034 and World Bank EASP P166685. It does not fill gaps with approximate programme values or modelled finance needs.",
    result:
      "A traceable partial register for checking two official finance commitments.",
    limitations: "This is not Uganda's complete climate-finance total, a disbursement ledger, or investment advice.",
    youWillSee: [
      "Partial-coverage notice",
      "Sourced commitment records",
      "Provider links and commitment type",
      "CSV export",
    ],
  },
  {
    title: "Policy documents",
    to: "/documents",
    who: "Policy officers, legal teams, MRV staff, Bonn/COP briefing leads",
    purpose:
      "Browse Uganda’s national policy evidence — laws, executive plans, UN submissions, and multilateral fund projects — and analyse individual documents with an AI assistant.",
    steps: [
      "Open Policy documents.",
      "Tab Document library: filter by category (UN Submissions, Executive, MCF, Legislative) or search by title.",
      "Tab Key documents (CPR): search passages or pick a topic — results group by document.",
      "Tab Climate fund projects: search multilateral fund projects linked to Uganda.",
      "Click Analyse on any library row to open the split-pane AI Policy Assistant for that document.",
      "In the AI panel, use quick-action buttons (Executive Summary, Key Items, Targets, Actions) or type a free-form question in Ask the document.",
      "Click CPR to open Climate Policy Radar or PDF for the hosted file.",
      "Tab Intervention pathway: read the urban transport logic model (interventions → behaviour → outcomes).",
    ],
    howItWorks:
      "Document library: CPR export (~207 Uganda documents) as searchable metadata. Key documents tab: passage corpus from npm run build:passages — topic search with deduplicated labels. MCF tab: ~167 fund projects from npm run build:mcf. Document AI fetches the actual PDF (contentUrl resolved via catalogId when needed), sends up to 8,000 characters to the configured OpenAI model, and returns structured analysis with page citations [p.N].",
    result:
      "Fast access to 200+ document titles with official links, plus AI-generated structured briefs grounded in the real PDF — helping users digest dense policy documents in minutes.",
    limitations: "AI reads up to 8,000 characters of the PDF (first 70% + last 20% — very long documents may miss the middle). Always verify AI responses against the original document. Intervention pathway is illustrative, not attribution of CO₂ reductions.",
    youWillSee: [
      "Category chips and search bar (library tab)",
      "Key documents (CPR) — topic search and grouped passage results",
      "Climate fund projects tab with sector-aware search",
      "Document rows with Analyse, CPR, and PDF buttons",
      "Stacked view: document metadata preview on top, AI Policy Assistant below with draggable divider",
      "Four quick-action buttons: Executive Summary, Key Items, Targets, Actions",
      "Ask the document chat input — responses grounded in the actual PDF",
      "Six-column intervention pathway diagram",
    ],
  },
  {
    title: "Marketplace",
    to: "/mwp-marketplace",
    who: "Ministry project leads, NDC focal points, investment officers, fund programme managers",
    purpose:
      "Create and manage user-authored NDC-aligned project pitches with explicit provenance.",
    steps: [
      "Open Marketplace from the top bar (to the right of Policy Documents).",
      "Review records saved by authorised users in the connected database.",
      "If no database is connected, the page reports that the marketplace is unavailable.",
      "Create a project record with a source URL or mark it clearly as user supplied.",
      "Click a card to open the deal room for that project.",
      "Use the pitch, evaluation, and delivery tabs as a workflow record rather than external funder approval.",
    ],
    howItWorks:
      "Marketplace records come from the connected database. The earlier bundled example portfolio is filtered from production reads; custom and edited records are preserved.",
    result:
      "A structured working record for a project pitch, its evidence, review notes, and delivery milestones.",
    limitations:
      "No live submission or funder accounts. User entries are not official until reviewed through the responsible institution.",
    youWillSee: [
      "Database-backed project records, or an unavailable state",
      "Deal room with three tabs: Pitch (brief + facts + readiness checklist), Evaluation (scorecard + decision), Delivery (milestone timeline)",
      "Source and record-origin labels",
    ],
  },
  {
    title: "Emissions Map",
    to: "/map",
    who: "Anyone who needs a geographic picture of sources",
    purpose: "See where major emission sources are located in Uganda and how sectors compare for a chosen year.",
    steps: [
      "Open Emissions Map from the top bar. Dashboard is the first item after Home.",
      "Select year and sector filters as offered on screen.",
      "Pan, zoom, and tilt the 3D satellite map; hover bubbles for a tooltip.",
      "Click a bubble for a compact pinned popup with source name, sector, and MtCO₂e.",
      "Read the side panels for sector breakdown and national total for that year.",
    ],
    howItWorks:
      "MapLibre GL JS with Esri World Imagery and AWS terrain relief. District boundaries overlay Uganda. Each Climate TRACE source is a colour-coded GPU bubble sized by emissions. Data from GET /api/v1/emissions/map. Click popups show verified source metadata only — no generic footer text.",
    result: "A map-based briefing aid: which regions and source types dominate visually for the selected year.",
    limitations: "Mapped source records and the overall Climate TRACE estimate have different coverage, so their totals are not expected to match. District boundaries are for context.",
    youWillSee: ["3D satellite map of Uganda with sized/coloured bubbles", "Hover tooltip and click popup per source", "Sector legend", "Year and total summary"],
  },
  {
    title: "District Translator",
    to: "/district-translator",
    who: "District planners, GIS and MRV teams",
    purpose: "Inspect mapped Climate TRACE source records within a selected Uganda district.",
    steps: [
      "Open District Translator from Explore in All tools.",
      "Choose a district by name or click its boundary on the map.",
      "Select a year and optional sector filters, then read the area insights and coverage notes.",
      "Download CSV or GeoJSON when you need the selected source records and provenance.",
    ],
    howItWorks: "The server resolves the selected 2020 UBOS district boundary and filters paginated Climate TRACE v7 source centroids for that year. It reports mapped records, not a complete territorial inventory. Drawing custom polygons is temporarily hidden.",
    result: "A district-level source view with sector breakdown, annual trend, coverage, and exports.",
    limitations: "These 135 UBOS boundaries differ from the dashboard's 56 Climate TRACE GADM districts. Administrative centroids can represent a larger area; their whole source value is included when the centroid is inside. Missing-location sources are excluded. Do not compare this mapped total directly with the dashboard aggregate.",
    youWillSee: ["District picker and clickable boundaries", "Year and sector filters", "Mapped source totals and coverage", "CSV and GeoJSON exports"],
  },
  {
    title: "Documentation",
    to: "/docs",
    who: "Anyone who needs definitions or process clarity",
    purpose: "This page — detailed guide, glossary, and FAQ in plain English.",
    steps: ["Keep this tab open while exploring other screens.", "Use the Technical toggle under emissions sources for slightly more detail."],
    howItWorks: "Static help text maintained with the app release.",
    result: "Shared language across ministries and partners.",
    limitations: "Does not change live data.",
    youWillSee: ["Feature guides", "Dashboard walkthrough", "Glossary accordion", "FAQ"],
  },
];

export const ADVANCED_FEATURES: FeatureGuide[] = [
  {
    title: "Financial Flows",
    to: "/financial-flow",
    who: "Programme managers, finance officers — Q3: Where are the bottlenecks?",
    purpose: "Check whether verified commitment, payment, and expenditure records are connected.",
    steps: [
      "Open Financial Flows from this guide's Q3 decision pages.",
      "Read the data-availability statement.",
      "Connect dated institutional finance records before using this view for analysis.",
    ],
    howItWorks:
      "The page remains unavailable until dated commitments, payments, expenditures, currencies, and source references are provided by the responsible institution.",
    result: "A clear statement that finance flow evidence is not yet connected.",
    limitations: "No project payment or expenditure figures are currently available.",
    youWillSee: ["Financial records unavailable", "Required source fields"],
  },
  {
    title: "Cost Effectiveness",
    to: "/cost-effectiveness",
    who: "Investment planners, MRV teams — Q2: Which interventions work?",
    purpose: "Check whether audited cost and mitigation evidence is available for comparing interventions.",
    steps: [
      "Open Cost Effectiveness from this guide's Q2 decision pages.",
      "Read the data-availability statement.",
      "Provide audited costs and compatible emissions-effect evidence before ranking interventions.",
    ],
    howItWorks:
      "The page does not calculate cost per tonne without sourced project costs and compatible estimates of avoided emissions.",
    result: "A clear statement that cost-effectiveness evidence is not yet connected.",
    limitations: "No verified intervention ranking is currently available.",
    youWillSee: ["Cost-effectiveness data unavailable", "Required source fields"],
  },
  {
    title: "Institutional Map",
    to: "/institutional-map",
    who: "Coordination teams, planning officers — Q5: Are we aligned?",
    purpose: "Check whether a confirmed institutional responsibility and focal-point roster is available.",
    steps: [
      "Open Institutional Map from this guide's Q5 decision pages.",
      "Read the data-availability statement.",
      "Provide a confirmed institutional mandate and focal-point source before using ownership analysis.",
    ],
    howItWorks:
      "The page does not infer ownership from strategy text or retain the earlier prototype assignments.",
    result: "A clear statement that institutional assignments are not yet confirmed.",
    limitations: "No verified ownership or contact roster is currently available.",
    youWillSee: ["Institutional data unavailable", "Link to source documents"],
  },
  {
    title: "Strategy Library",
    to: "/library",
    who: "Policy analysts linking NDC to national plans",
    purpose: "See how NDP IV, Tenfold, Vision 2040, and NDC indicators relate.",
    steps: ["Open Strategy Library from this guide.", "Search or filter indicators.", "Follow links toward NDC targets where matched."],
    howItWorks: "Bundled indicator registry in the app, with best-effort links to NDC target IDs.",
    result: "Policy alignment view across strategies — seeded and uploaded indicators mixed.",
    limitations: "Not all indicators have live measured series.",
    youWillSee: ["Strategy tabs", "Indicator tables", "Status and evidence labels"],
  },
  {
    title: "Database",
    to: "/my-work",
    who: "Delivery teams tracking tasks",
    purpose: "Personal list of activities and notes stored in your browser.",
    steps: ["Open Database.", "Review or add activities linked to targets where enabled by role."],
    howItWorks: "Data saved in localStorage on your device — not a central government database.",
    result: "Your own workspace; colleagues do not see it unless you export or share separately.",
    limitations: "Clearing browser data removes entries. Not official registry.",
    youWillSee: ["Activity list", "Decision log references"],
  },
  {
    title: "Climate Risk",
    to: "/risk",
    who: "Adaptation, DRR, and planning teams",
    purpose: "Check whether verified hazard, exposure, and vulnerability data is connected.",
    steps: ["Open Climate Risk.", "Read the data-availability statement."],
    howItWorks: "No risk scores are calculated until a verified hazard dataset is connected.",
    result: "A clear statement that district risk cannot yet be assessed.",
    limitations: "No operational hazard model is currently connected.",
    youWillSee: ["Risk data unavailable", "Required evidence description"],
  },
];

export const DASHBOARD_DIALOGS = [
  {
    name: "Activities / Measures",
    purpose: "List delivery activities from the NDC catalogue linked to the selected target.",
    how: "Opens a dialog from the right column. Activities are curated text from the NDC — not live project management data.",
    result: "See what programmes are documented against the target; gaps feed IMPL. GAPS status.",
  },
  {
    name: "Top Emitting Sources",
    purpose: "Show the largest individual emitters for current geography (national or district).",
    how: "Pulls paginated Climate TRACE source-level rows. Source records and the overall estimate have different coverage, so their totals are shown separately and are not expected to match.",
    result: "Named plants, facilities, or county-level aggregates for storytelling.",
  },
  {
    name: "Map Data Coverage",
    purpose: "Compare Climate TRACE's overall estimate with records that have usable map coordinates.",
    how: "Reports the two API totals separately, along with missing coordinates or emissions values. It does not turn their difference into a confidence score.",
    result: "Transparent map coverage without over-claiming accuracy or spatial certainty.",
  },
  {
    name: "What Climate TRACE Can Track",
    purpose: "Show which NDC-style variables have direct Climate TRACE sectors vs indicator-only tracking.",
    how: "Uses a measurable-variables catalogue matched to NDC target types.",
    result: "Honest coverage map for MRV planning.",
  },
  {
    name: "Mitigation Options",
    purpose: "Browse policy intervention concepts and add relevant options to a decision log.",
    how: "Uses descriptive planning concepts. Unsupported cost and emissions-reduction values remain unavailable.",
    result: "A qualitative shortlist for evidence gathering and discussion.",
  },
  {
    name: "Official sources",
    purpose: "Quick links to curated national documents (NDC, BUR, sector plans, flagship funds).",
    how: "Loads a small preset list from the policy corpus for the current sector.",
    result: "Open CPR or PDF without searching the full library.",
  },
];

export const DASHBOARD_PANELS = [
  {
    name: "NDC Targets (left column)",
    text: "Each card is one pledge from Uganda’s Updated NDC (September 2022). One click selects it and drives the centre and right columns. The chevron expands detail and a small sparkline inside the card without changing selection.",
  },
  {
    name: "Observed Data (centre)",
    text: "Time series for the selected target. Solid line = years with Climate TRACE (or indicator) data; dashed = projection mode. Vertical markers show NDC baseline year and 2030 goal. Units switch between MtCO₂e and %/MW/hectares depending on target type.",
  },
  {
    name: "Progress toward target (right)",
    text: "Plain-language status, progress bar, and gap narrative. For growing sectors, progress measures distance to the 2030 ceiling (BAU-relative NDC framing), not simple reduction from 2015.",
  },
  {
    name: "NDC AI",
    text: "Perplexity-style analysis of the current dashboard view. Open via the sparkle button. Each paragraph cites verified sources — Climate TRACE v7 API endpoints for measured emissions and the UNFCCC NDC PDF for pledge values. Requires OPENAI_API_KEY on the server.",
  },
  {
    name: "Status summary strip",
    text: "Counts all targets in the current sector: on track, off track, implementation gaps (no activities), MRV gaps (activities but weak data). Click a row to select that target.",
  },
];

export const FILTERS = [
  { label: "Sector", meaning: "Filters which targets appear and which Climate TRACE sectors feed the charts." },
  { label: "Geography · National", meaning: "Whole Uganda (GADM level 0). Historical series from 2015." },
  { label: "Geography · District", meaning: "One of 56 districts. Series often from 2021. NDC targets remain national — district is context only." },
  { label: "Time · Historical", meaning: "Past years only." },
  { label: "Time · Projection", meaning: "Includes forward lines where available." },
  { label: "Refresh", meaning: "Reloads emissions from the server (results cached ~30 minutes)." },
  { label: "Export", meaning: "Excel (tables), PDF (one-page summary), or CSV aligned to CRT/BTR reporting helpers." },
];

export const STATUS_CODES = [
  { code: "On track", meaning: "Latest observed value is within a reasonable band of the 2030 NDC ceiling given the trend — verify assumptions in the target note." },
  { code: "At risk", meaning: "Trend or data quality is concerning; intervention or better MRV may be needed before 2030." },
  { code: "Off track", meaning: "Current path is far from the goal." },
  { code: "Unknown", meaning: "Insufficient observed data to judge." },
  { code: "IMPL. GAPS", meaning: "No linked activity in the NDC catalogue for this target." },
  { code: "MRV GAPS", meaning: "Activities exist but observed series is missing, stale, or flagged low quality." },
];

export const TARGET_BADGES = [
  { badge: "Unconditional", meaning: "Domestic resources." },
  { badge: "Conditional", meaning: "Needs international support." },
  { badge: "Mixed", meaning: "Both elements — read full target text." },
  { badge: "Emissions Reduction", meaning: "MtCO₂e." },
  { badge: "Forest Cover / Renewable Energy / …", meaning: "Physical indicators — units change on charts." },
];

export const SECTORS = [
  { abbr: "Economy-wide", full: "Headline total across sectors." },
  { abbr: "AFOLU", full: "Forests, land use, wetlands — large share of Uganda’s emissions." },
  { abbr: "Energy", full: "Power and stationary energy (excluding transport)." },
  { abbr: "Transport", full: "Road and other mobile emissions — separate target in 2022 NDC." },
  { abbr: "Waste", full: "Solid waste and wastewater methane." },
  { abbr: "IPPU", full: "Industry and product processes." },
  { abbr: "Agriculture", full: "Farm and livestock emissions within NDC structure." },
];

export const DATA_SOURCES_TABLE = [
  { area: "Observed emissions & map", source: "Climate TRACE (live API v7)", whatYouGet: "Aggregate annual totals and all paginated mapped-source rows returned by the API", caveat: "Mapped records and territorial totals have different coverage and must not be treated as equal" },
  { area: "District Translator", source: "Climate TRACE v7 sources + pinned 2020 UBOS boundaries", whatYouGet: "Centroid-filtered district source records", caveat: "135 boundaries differ from the dashboard's 56 GADM districts; not a complete territorial inventory" },
  { area: "NDC targets & activities", source: "Uganda Updated NDC 2022 (bundled)", whatYouGet: "Official pledge text, baselines, 2030 goals", caveat: "Updated when config is refreshed" },
  { area: "Mitigation options", source: "Planning concepts linked to policy categories", whatYouGet: "Qualitative intervention ideas", caveat: "Unsupported costs and emissions reductions remain unavailable" },
  { area: "Policy documents", source: "Climate Policy Radar export + passages + MCF build", whatYouGet: "Metadata, CPR/PDF links, searchable passages, fund projects", caveat: "Passage/M CF corpora are build-time snapshots — not live CPR API" },
  { area: "NDC AI (Dashboard)", source: "Configured OpenAI model + fact ledger", whatYouGet: "Cited prose analysis of live dashboard context", caveat: "Quotes only ledger numbers; requires API key; not official UNFCCC text" },
  { area: "Your activities in Database", source: "This browser only", whatYouGet: "Personal drafts", caveat: "Not shared nationally" },
  { area: "Climate Risk maps", source: "No verified source connected", whatYouGet: "Unavailable state", caveat: "No district risk scores are shown" },
  { area: "Financial Flows (/financial-flow)", source: "No verified payment records connected", whatYouGet: "Unavailable state", caveat: "Project status is not used as a substitute for financial transactions" },
  { area: "Cost Effectiveness (/cost-effectiveness)", source: "No compatible audited cost and impact records connected", whatYouGet: "Unavailable state", caveat: "No intervention ranking is shown" },
  { area: "Institutional Map (/institutional-map)", source: "No confirmed responsibility roster connected", whatYouGet: "Unavailable state", caveat: "No ownership or focal-point assignments are inferred" },
  { area: "Policy Impact forecasts", source: "No production case series connected", whatYouGet: "Unavailable state", caveat: "No causal or socio-economic forecast is shown" },
  { area: "Mapped ingest", source: "Ministry upload → Postgres", whatYouGet: "Indicator observations on Dashboard", caveat: "Unverified until MRV sign-off; not Climate TRACE MtCO₂e" },
];

export const GLOSSARY: { term: string; def: string }[] = [
  { term: "NDC", def: "Uganda’s climate pledge under the Paris Agreement. This app uses the September 2022 update." },
  { term: "MtCO₂e", def: "Million tonnes of CO₂ equivalent." },
  { term: "tCO₂e", def: "Tonnes CO₂e — used for sources or per-tonne costs." },
  { term: "BAU", def: "Business as usual — emissions without extra climate policy." },
  { term: "MRV", def: "Measurement, reporting and verification." },
  { term: "Climate TRACE", def: "Global emissions observatory (satellites, models, facilities)." },
  { term: "CPR", def: "Climate Policy Radar — host for many linked national documents." },
  { term: "MCF", def: "Multilateral Climate Funds — GCF, GEF, Adaptation Fund projects in the document library." },
  { term: "GADM", def: "Administrative map boundaries for districts." },
  { term: "Spatial certainty", def: "Located vs spatially uncertain emissions share." },
  { term: "Theory of change / pathway", def: "Logical steps from policy intervention to intended outcome — diagram on Policy documents." },
  { term: "Intended outcome", def: "What policy aims for (NDC target, health, air quality)." },
  { term: "Measured outcome", def: "What satellites/models observe (Dashboard, Climate TRACE)." },
  { term: "Indicative", def: "Estimate for discussion — not audited." },
  { term: "KCI", def: "UNFCCC Katowice Committee of Experts on Impacts. Its reports may inform future reviewed Policy Impact cases, but no quantitative case series is active today." },
  { term: "TEF", def: "Transition Element Framework — a qualitative intervention taxonomy retained for a future evidence-backed Policy Impact workflow." },
  { term: "NDC AI", def: "Dashboard AI assistant that analyses live Climate TRACE + NDC context with per-paragraph citations to verified API/PDF URLs." },
  { term: "Fact ledger", def: "Pre-built list of quotable dashboard numbers with exact source URLs — NDC AI may only cite these figures." },
  { term: "NDC gap priorities", def: "Home/Dashboard panel ranking sectors by distance to 2030 goals using live or indicative data." },
  { term: "BTR / CRT", def: "UNFCCC reporting formats; Export CSV is a helper only." },
  { term: "Decision Cockpit", def: "The three-card section on the Home page that routes users directly to Q1, Q3, or Q5 tools." },
  { term: "Financial Flows", def: "Dated commitments, payments, and expenditures by project. This view is unavailable until verified records are connected." },
  { term: "Cost Effectiveness (USD/tCO2e)", def: "Cost per tonne of CO₂ equivalent avoided. This requires compatible audited cost and emissions-effect evidence." },
  { term: "Institutional Map", def: "Confirmed institutional responsibilities and focal points. This view is unavailable until an authoritative roster is connected." },
  { term: "Q1–Q5", def: "Five decision questions used to explain the app's deeper pages: Are we on track? · Which interventions work? · Where are the bottlenecks? · Where do we invest next? · Are we aligned?" },
  { term: "Disbursement rate", def: "Disbursed ÷ committed, expressed as a percentage. The app does not calculate it without verified transaction records." },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Do I need two clicks on a target?", a: "No — one click selects. Use the chevron only to expand detail inside the card." },
  { q: "Why do national and district numbers differ in meaning?", a: "NDC targets are national law. District charts show local observed emissions for context, not district NDC grades." },
  { q: "Why don’t top sources add up to the total?", a: "Climate TRACE's overall estimate and its mapped source records have different coverage. Map Data Coverage shows both separately; their difference is not an accuracy or confidence score." },
  { q: "Is AI 2030 official?", a: "No — trend extrapolation with uncertainty, for planning conversations." },
  { q: "Can I sign contracts from Climate Finance?", a: "No — indicative screening only." },
  { q: "What’s the difference between Policy documents tabs?", a: "Document library = metadata (~207 docs). Key documents (CPR) = passage search. Climate fund projects = MCF corpus. Intervention pathway = logic model. Measured CO₂ = Dashboard." },
  { q: "How do NDC AI citations work?", a: "A fact ledger is built from live dashboard data. Each cited number links to the Climate TRACE API endpoint or UNFCCC NDC PDF that backs it." },
  {
    q: "Will uploaded files change the Dashboard?",
    a: "Mapped import can — when Postgres is connected, confirmed rows are stored as observations and appear on indicator targets (forest, electricity, CSA, wetlands, capacity) with an “Ingested” badge. Quick scan never writes data. Climate TRACE MtCO₂e charts are unchanged by ingest today.",
  },
  { q: "Do I need an account?", a: "No site-wide sign-in is required right now. Your selected country, role, and personal activity records live in this browser. Import and other protected operator actions still require the separate operator unlock." },
  { q: "Can I draw a custom area in District Translator?", a: "Custom-area drawing is temporarily hidden. Choose a district by name or click its boundary instead." },
  { q: "What does my role change?", a: "It changes which tools and workflow actions are shown, not national emissions totals. It is a browser preference, not authorization for protected API writes." },
  { q: "Where are all the tools?", a: "The top bar shows shortcuts. Open All tools for the Explore, Plan & deliver, and Manage & learn groups." },
  { q: "Where do I start if I want to know whether we are on track?", a: "Open Dashboard from the top bar or All tools. The Decision Cockpit on Home also links to NDC progress." },
  { q: "Are financial flow and cost-effectiveness figures available?", a: "No. The former demonstration estimates were removed. These pages now show an unavailable state until verified project accounts and compatible emissions-effect evidence are connected." },
  { q: "How do I trace a project from progress to bottleneck to finance?", a: "The app has a decision chain: from Dashboard (Q1) click indicators to see delivery status on Delivery & Accountability (Q2/Q3), then use the 'Check finance' button on each activity to jump to Finance & Investment (Q3). The Evidence & MRV page links back to Delivery at the bottom." },
  { q: "What is the Institutional Map for?", a: "It is reserved for confirmed institutional responsibilities and focal points. The earlier prototype assignments were removed, so the page remains unavailable until an authoritative roster is connected." },
];

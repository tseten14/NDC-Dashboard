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
    text: "On first visit you choose Uganda — the only country with a full data cockpit today. Use the globe icon in the top bar anytime to switch or return to the country screen.",
  },
  {
    step: "2",
    title: "Choose your role",
    text: "Use the dropdown in the top-right (e.g. Decision maker, MRV officer). This only controls what you can edit in the app — it does not change national statistics.",
  },
  {
    step: "3",
    title: "Navigate by decision question",
    text: "The left sidebar is organised into five questions: Q1 Are we on track? · Q2 Which interventions work? · Q3 Where are the bottlenecks? · Q4 Where do we invest next? · Q5 Are we aligned? Click any group to expand it and go straight to the right tool. The Home page also shows a Decision Cockpit with three quick-start links.",
  },
  {
    step: "4",
    title: "Start on the Dashboard for emissions",
    text: "Select a sector (e.g. Transport), click one NDC target on the left, and read the centre chart (what we measure) and right column (are we on track). Use other menu items when you need maps, documents, or finance screening.",
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
      "Optional: Historical vs Projection for time view.",
      "Use Export for Excel, PDF, or CRT/BTR-style CSV.",
      "Open buttons under the right column for activities, top emitters, spatial certainty, mitigation options, and official policy sources.",
    ],
    howItWorks:
      "Targets and activity catalogues are stored in the app from Uganda’s NDC. Observed emissions are fetched live from Climate TRACE (satellite and model-based inventory), converted to million tonnes (MtCO₂e), and compared to each target’s baseline and 2030 goal. Progress colours use rules: how close the latest year is to the ceiling, whether catalogue activities exist, and data quality flags.",
    result:
      "For the selected target you see: a time-series chart, a progress judgement (on track / at risk / off track), summary counts for all targets in that sector, and optional drill-downs. District view shows observed emissions for one district but does not score districts against national NDC targets.",
    limitations:
      "Not official UNFCCC submission software. Climate TRACE and national inventory methods can differ — warnings appear when they diverge. District mode is contextual only.",
    youWillSee: [
      "NDC target cards with badges (Unconditional, Conditional, etc.)",
      "Observed vs target chart with baseline and 2030 markers — click any bar to trace its data source",
      "Data Provenance panel (appears below chart after clicking a bar): methodology, uncertainty, primary sources, Climate TRACE link",
      "Source button (</> icon) in Observed Data header → Data Lineage modal with API endpoint, raw table, pipeline stages",
      "NDC Ceiling and No-Policy Level legend items with info (ⓘ) tooltips explaining BAU and NDC commitments",
      "Progress % and status colour",
      "Strip of ON-TRACK / OFF-TRACK / IMPL. GAPS / MRV GAPS counts",
      "CT Verified / Estimated badges on Top Emitting Sources rows (with tooltip explaining the difference)",
      "Compact NDC gap priorities strip (click a sector to filter)",
      "Ingested provenance badge on indicator targets when ministry data is uploaded",
    ],
  },
  {
    title: "Policy Impact",
    to: "/policy-impact",
    who: "Socio-economic planners, gender/equity teams, policy designers",
    purpose:
      "Forecast socio-economic outcomes of an intervention using UNFCCC KCI case analogies and the Transition Element Framework (TEF).",
    steps: [
      "Open Policy Impact from the menu (or from Dashboard Mitigation Options).",
      "Step 1 — set objective and sector (gap context may pre-fill from NDC priorities).",
      "Step 2 — pick a TEF intervention type and scale/timeline sliders.",
      "Step 3 — review matched KCI cases and confidence.",
      "Step 4 — read impacts, trade-offs, and pathway diagram; link to Climate Finance for funding screening.",
    ],
    howItWorks:
      "The server matches your intervention to curated KCI policy cases (rule-based: sector, intervention type, region, scale). Outcomes aggregate top matches with provenance strings — not ML or country-specific attribution.",
    result:
      "A structured forecast of jobs, equity, and other socio-economic nodes plus explicit trade-offs — for workshop discussion, not legal commitments.",
    limitations:
      "Indicative analogies only. Does not replace national impact assessments or gender analysis sign-off.",
    youWillSee: [
      "Four-step wizard",
      "Matched KCI cases with confidence %",
      "Impact and trade-off cards",
      "Link to Climate Finance with sector pre-filled",
    ],
  },
  {
    title: "Data Ingestion",
    to: "/ingest",
    who: "Data officers, GIS teams, MRV units uploading files",
    purpose: "Profile ad-hoc files (quick scan) or import structured observation rows into the database (mapped import).",
    steps: [
      "Open Data Ingestion from the menu.",
      "Mapped import (default): upload CSV or JSON with year, value, optional source, and target_id columns; review auto-mapping; confirm.",
      "After confirm, read the success panel — it states how many rows were stored and which dashboard targets they affect.",
      "Quick scan: switch tab to upload CSV, JSON, PDF, or text for profiling only (no database write).",
      "GIS upload and live connectors remain work in progress.",
    ],
    howItWorks:
      "Mapped import parses on the server, maps columns to observation fields, and writes rows to the Postgres observations table when DATABASE_URL is configured. Ingested points appear on the Dashboard Observed Data column for indicator targets (forest cover, electricity access, CSA adoption, wetlands, capacity) — not Climate TRACE MtCO₂e sectors yet. Quick scan profiles files (optionally with pandas) and never persists.",
    result:
      "Mapped import: stored observation rows plus an audit JSON under data/ingest-imports. Quick scan: a triage report in the browser.",
    limitations:
      "Requires Postgres for persistence. Ingested data is unverified until MRV sign-off. Does not replace Climate TRACE emissions on MtCO₂e targets. PDF mapped import is analysis-only unless exported to CSV/JSON.",
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
      "Screen mitigation options from the NDC catalogue: rough cost per tonne abated, possible carbon revenue, and which international fund windows might fit.",
    steps: [
      "Open Climate Finance.",
      "Adjust sliders (carbon price, assumptions) to test sensitivity.",
      "Click a project card on the marginal abatement chart to see detail.",
      "Read the funding pathway panel for sequencing advice (concept → proposal).",
      "Scroll to Funded projects (MCF) for real multilateral documents linked to your sector.",
      "Export CSV if you need a table for a workshop.",
    ],
    howItWorks:
      "Mitigation options use indicative costs and abatement potentials from the NDC catalogue — not audited project accounts. Economics (cost to abate, revenue at your carbon price) are calculated in the browser. Fund matching uses rules inspired by NAP Finance Navigator / NAPX (scale, instrument type, LDC context). MCF documents come from the Policy documents corpus filtered by sector keywords.",
    result:
      "A ranked view of which options look cheaper per tonne, which might pay for themselves via credits at your assumed price, and which fund families to explore next — plus links to real GCF/GEF-style PDFs where relevant.",
    limitations: "Not investment advice, not a substitute for feasibility studies or government sign-off. All costs labelled indicative.",
    youWillSee: [
      "MACC-style bar chart",
      "Project cards with investment, abatement, cost to abate",
      "Fund fit badges and sequencing text",
      "MCF document list with CPR/PDF links",
      "Data-quality warnings when catalogue figures are thin",
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
      "Click Analyse on any row to open the split-pane AI Policy Assistant for that document.",
      "In the AI panel, use quick-action buttons (Executive Summary, Key Items, Targets, Actions) or type a free-form question in Ask the document.",
      "Click CPR to open Climate Policy Radar or PDF for the hosted file.",
      "Tab Intervention pathway: read the urban transport logic model (interventions → behaviour → outcomes).",
      "Click Related documents on an intervention to jump back to the library with a search.",
    ],
    howItWorks:
      "A CPR export (~207 Uganda documents) is served as a searchable list. Clicking Analyse navigates to a stacked view: document preview on top and AI Policy Assistant below (draggable divider). The AI fetches and parses the actual PDF, sends up to 8,000 characters to OpenAI GPT-4o-mini, and returns structured analysis with real page citations [p.N]. Each bullet is 2 sentences — the key fact, then a plain-language explanation. Quick-action buttons produce Executive Summary, Key Items, Targets, or Recommendations. The Ask the document box sends your question alongside the PDF text for a genuine AI answer.",
    result:
      "Fast access to 200+ document titles with official links, plus AI-generated structured briefs grounded in the real PDF — helping users digest dense policy documents in minutes.",
    limitations: "AI reads up to 8,000 characters of the PDF (first 70% + last 20% — very long documents may miss the middle). Always verify AI responses against the original document. Intervention pathway is illustrative, not attribution of CO₂ reductions.",
    youWillSee: [
      "Category chips and search bar",
      "Document rows with Analyse, CPR, and PDF buttons",
      "Stacked view: document metadata preview on top, AI Policy Assistant below with draggable divider",
      "Four quick-action buttons: Executive Summary, Key Items, Targets, Actions",
      "Ask the document chat input — responses grounded in the actual PDF",
      "Six-column intervention pathway diagram",
    ],
  },
  {
    title: "Emissions Map",
    to: "/map",
    who: "Anyone who needs a geographic picture of sources",
    purpose: "See where major emission sources are located in Uganda and how sectors compare for a chosen year.",
    steps: [
      "Open Emissions Map.",
      "Select year and sector filters as offered on screen.",
      "Pan, zoom, and tilt the 3D satellite map; hover bubbles for source name and emissions.",
      "Read the side panels for sector breakdown and national total for that year.",
    ],
    howItWorks:
      "The map is a real 3D satellite basemap of Uganda (Esri World Imagery) with terrain relief, framed so the country fills the view. District boundaries are drawn on top, and each Climate TRACE source is a colour-coded bubble sized by its emissions. Bubbles render on the GPU as a single map layer, so thousands of sources stay smooth. Totals include emissions that cannot be placed on a map exactly — those appear in spatial certainty on the Dashboard, not as bubbles.",
    result: "A map-based briefing aid: which regions and source types dominate visually for the selected year.",
    limitations: "Not every tonne appears as a bubble. Very large datasets may be capped for performance. District boundaries are for context.",
    youWillSee: ["3D satellite map of Uganda with sized/coloured bubbles", "Sector legend", "Year and total summary"],
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
    purpose: "See committed, disbursed, and spent amounts for each active project at a glance — and spot which ones are falling behind on disbursement.",
    steps: [
      "Open Financial Flows from the Q3 sidebar group.",
      "Read the three summary cards: Total Committed, Total Disbursed, and average Disbursement Rate.",
      "Scan the colour-coded table: green ≥ 70% disbursed, amber 40–69%, red below 40%.",
      "Sort by the % Disbursement column to find the most delayed projects.",
    ],
    howItWorks:
      "Data is synthesised from the seed-activities registry with illustrative committed and disbursed figures. Status (Active / Delayed / Completed) drives the disbursement rate estimates. Clearly labelled illustrative — not connected to a live treasury or IFMS system.",
    result: "A quick bottleneck scan showing which projects are under-disbursing and need follow-up.",
    limitations: "Illustrative data only. Replace with real financial-system figures (IFMS, project accounts) for official use.",
    youWillSee: ["Three summary stat cards", "Colour-coded disbursement table by project and district", "Illustrative data badge"],
  },
  {
    title: "Cost Effectiveness",
    to: "/cost-effectiveness",
    who: "Investment planners, MRV teams — Q2: Which interventions work?",
    purpose: "Rank interventions by cost per tonne of CO₂ avoided (USD/tCO2e) to support prioritisation decisions.",
    steps: [
      "Open Cost Effectiveness from the Q2 sidebar group.",
      "Review the three stat cards: best cost/tCO2e, total mitigation potential, and average cost.",
      "Click any column header to sort — cost/tCO2e ascending shows the best-value interventions first.",
      "The top three rows are highlighted as Best Value; check their co-benefit badges for jobs, biodiversity, etc.",
    ],
    howItWorks:
      "Illustrative cost and impact estimates are synthesised from the NDC activity registry and seed data. Cost per tCO2e = Total Budget ÷ Estimated tCO2e Avoided. Co-benefits are drawn from standard NDC co-benefit categories. Clearly labelled illustrative.",
    result: "A ranked shortlist of interventions by value for money — useful for workshop prioritisation.",
    limitations: "Illustrative only. Replace budget and impact figures with audited project data for binding investment decisions.",
    youWillSee: ["Three summary stat cards", "Sortable cost-effectiveness table", "Best Value highlights on top 3 rows", "Co-benefit badges", "Illustrative data badge"],
  },
  {
    title: "Institutional Map",
    to: "/institutional-map",
    who: "Coordination teams, planning officers — Q5: Are we aligned?",
    purpose: "See which institution owns which NDC actions, spot overlapping mandates, and find focal points across government and partners.",
    steps: [
      "Open Institutional Map from the Q5 sidebar group.",
      "Check the Mandate Overlaps alert at the top — actions owned by more than one actor are flagged.",
      "Browse the four columns: Government Ministries, Regulatory Bodies, Development Partners, UN Agencies.",
      "Click a card's action badges to see which NDC activity they are responsible for.",
    ],
    howItWorks:
      "Built from the actors roster in the strategy data file. Actors are categorised by type; each card shows their responsible NDC actions. Overlap detection scans for activities with multiple ownership roles.",
    result: "A visual coordination check — who owns what, where mandates overlap, and who the right focal point is.",
    limitations: "Reflects the actors data in the app registry. Update the actors data to keep this current with real institutional arrangements.",
    youWillSee: ["Mandate Overlaps alert (if any)", "Four-column institution grid", "NDC action badges per institution", "Focal point name and contact", "Illustrative data badge"],
  },
  {
    title: "Brazil Climate Intelligence",
    to: "/brazil-chat",
    who: "Partners, analysts, and demo audiences exploring multi-country AI climate research",
    purpose:
      "Demonstrate a Perplexity-style AI research experience for climate data — ask questions about Brazil's emissions, deforestation, NDC targets, and sector trends; every answer cites verified sources inline.",
    steps: [
      "Open Brazil Climate Intelligence from the sidebar.",
      "Click a suggested question or type your own in the input box.",
      "Read the response: sources verified pills appear at the top, inline citation chips [1] [2] link to references.",
      "Click a citation chip to auto-open the References panel and highlight the source.",
      "Expand Data Provenance to see full dataset descriptions.",
      "Press Enter or click Send to ask follow-up questions.",
    ],
    howItWorks:
      "Responses are template-driven using pre-built answer blocks matched by keyword scoring against SEEG 11.0, INPE PRODES, Climate TRACE, MMA, UNFCCC, IBGE, and MCTI reference data. A 1.8-second animated searching state simulates live source querying. No generative AI or live API calls are made — all data is from published 2022/2023 figures baked into the demo layer.",
    result:
      "A trust-building demo of how AI research tools can surface verified, cited climate data — illustrating what a multi-country intelligence layer could look like with real LLM integration.",
    limitations: "Demo only — Brazil mock data, not live. Not for official Brazil reporting. Responses are keyword-matched, not semantically reasoned.",
    youWillSee: [
      "Suggested questions grid on empty state",
      "Animated source-search loading state with source pills",
      "Sources Verified header with dataset badges (SEEG, INPE, Climate TRACE, MMA, UNFCCC)",
      "Response body with inline citation chips [N]",
      "Key statistics grid with citation links",
      "Data Provenance collapsible panel",
      "References section (opens automatically when a citation is clicked)",
      "Demo · Mock Data badge in the header",
    ],
  },
  {
    title: "Strategy Library",
    to: "/library",
    who: "Policy analysts linking NDC to national plans",
    purpose: "See how NDP IV, Tenfold, Vision 2040, and NDC indicators relate.",
    steps: ["Expand Advanced in the sidebar.", "Open Strategy Library.", "Search or filter indicators.", "Follow links toward NDC targets where matched."],
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
    purpose: "Explore illustrative hazard layers and district screening — separate from mitigation emissions.",
    steps: ["Open Climate Risk.", "Use sub-pages: overview, map, screening, drilldown."],
    howItWorks: "Demonstration seed data for floods, fire, deforestation pressure — not live hydrological models.",
    result: "Priority districts for discussion; clearly labelled illustrative.",
    limitations: "Do not use for engineering design or official risk classification.",
    youWillSee: ["Risk maps", "Hazard indices", "Adaptation option cards"],
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
    how: "Pulls Climate TRACE source-level rows. Listed sources do not sum to the sector total — spatially uncertain emissions are in the total but not listed.",
    result: "Named plants, facilities, or county-level aggregates for storytelling.",
  },
  {
    name: "Spatial Certainty",
    purpose: "Explain how much emissions are tied to known map locations vs statistically spread.",
    how: "Compares located emissions to Climate TRACE aggregate total for the area.",
    result: "Transparency for map and source lists — avoids over-claiming precision.",
  },
  {
    name: "What Climate TRACE Can Track",
    purpose: "Show which NDC-style variables have direct Climate TRACE sectors vs indicator-only tracking.",
    how: "Uses a measurable-variables catalogue matched to NDC target types.",
    result: "Honest coverage map for MRV planning.",
  },
  {
    name: "Mitigation Options",
    purpose: "Browse indicative abatement options and add some to a decision log.",
    how: "Catalogue costs and potentials — same family as Climate Finance, presented for planners.",
    result: "Shortlist options; export or discuss in meetings.",
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
  { area: "Observed emissions & map", source: "Climate TRACE (live API)", whatYouGet: "Annual totals, sources, district splits", caveat: "Independent inventory — may differ from national GHG reports" },
  { area: "NDC targets & activities", source: "Uganda Updated NDC 2022 (bundled)", whatYouGet: "Official pledge text, baselines, 2030 goals", caveat: "Updated when config is refreshed" },
  { area: "Mitigation costs / abatement", source: "NDC catalogue (indicative)", whatYouGet: "Screening economics", caveat: "Not audited project costs" },
  { area: "Policy documents", source: "Climate Policy Radar export", whatYouGet: "Titles, dates, CPR/PDF links", caveat: "Not live API; no full-text search yet" },
  { area: "Your activities in Database", source: "This browser only", whatYouGet: "Personal drafts", caveat: "Not shared nationally" },
  { area: "Climate Risk maps", source: "Illustrative seed data", whatYouGet: "Demo prioritisation", caveat: "Not operational hazard models" },
  { area: "Financial Flows (/financial-flow)", source: "Seed-activities registry (illustrative)", whatYouGet: "Committed → disbursed → spent by project", caveat: "Not live IFMS/treasury data — replace for official use" },
  { area: "Cost Effectiveness (/cost-effectiveness)", source: "NDC activity registry (illustrative)", whatYouGet: "USD/tCO2e ranking, co-benefits", caveat: "Synthesised estimates — not audited project accounts" },
  { area: "Institutional Map (/institutional-map)", source: "Actors roster in strategy data (illustrative)", whatYouGet: "Ministry/partner ownership and overlaps", caveat: "Reflects app registry — update actors data to stay current" },
  { area: "Policy Impact forecasts", source: "KCI case corpus (bundled)", whatYouGet: "Socio-economic analogies", caveat: "Not country-specific causal attribution" },
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
  { term: "KCI", def: "UNFCCC Katowice Committee of Experts on Impacts — source reports for Policy Impact case studies." },
  { term: "TEF", def: "Transition Element Framework — intervention taxonomy used in Policy Impact wizard." },
  { term: "NDC gap priorities", def: "Home/Dashboard panel ranking sectors by distance to 2030 goals using live or indicative data." },
  { term: "BTR / CRT", def: "UNFCCC reporting formats; Export CSV is a helper only." },
  { term: "Decision Cockpit", def: "The three-card section on the Home page that routes users directly to Q1, Q3, or Q5 tools." },
  { term: "Financial Flows", def: "The /financial-flow page showing committed → disbursed → spent per project. Illustrative data until connected to a live financial system." },
  { term: "Cost Effectiveness (USD/tCO2e)", def: "Cost per tonne of CO₂ equivalent avoided — used on the /cost-effectiveness page to rank interventions by value for money." },
  { term: "Institutional Map", def: "The /institutional-map page showing which ministry, agency, or partner owns each NDC action, with mandate overlap detection." },
  { term: "Q1–Q5", def: "The five decision questions that organise the sidebar navigation: Are we on track? · Which interventions work? · Where are the bottlenecks? · Where do we invest next? · Are we aligned?" },
  { term: "Disbursement rate", def: "Disbursed ÷ Committed, expressed as %. Used on Financial Flows to flag delayed projects (red < 40%, amber 40–69%, green ≥ 70%)." },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Do I need two clicks on a target?", a: "No — one click selects. Use the chevron only to expand detail inside the card." },
  { q: "Why do national and district numbers differ in meaning?", a: "NDC targets are national law. District charts show local observed emissions for context, not district NDC grades." },
  { q: "Why don’t top sources add up to the total?", a: "Climate TRACE includes emissions it cannot place on a map. Those are in totals and in Spatial Certainty, not in the source list." },
  { q: "Is AI 2030 official?", a: "No — trend extrapolation with uncertainty, for planning conversations." },
  { q: "Can I sign contracts from Climate Finance?", a: "No — indicative screening only." },
  { q: "What’s the difference between Policy documents tabs?", a: "Library = searchable evidence. Intervention pathway = logic model (how policies could lead to outcomes). Dashboard = measured CO₂." },
  {
    q: "Will uploaded files change the Dashboard?",
    a: "Mapped import can — when Postgres is connected, confirmed rows are stored as observations and appear on indicator targets (forest, electricity, CSA, wetlands, capacity) with an “Ingested” badge. Quick scan never writes data. Climate TRACE MtCO₂e charts are unchanged by ingest today.",
  },
  { q: "What does my role change?", a: "Edit permissions only, not national totals." },
  { q: "How is the sidebar organised?", a: "The left sidebar is grouped into five decision questions (Q1–Q5). Each group is collapsible. A page may appear in more than one group if it answers multiple questions — e.g. Delivery & Accountability appears under both Q2 and Q3." },
  { q: "Where do I start if I want to know whether we are on track?", a: "Open the Q1 group in the sidebar and go to Dashboard. The Decision Cockpit on the Home page also has a direct 'Check NDC progress' link." },
  { q: "Are the financial flow and cost-effectiveness numbers real?", a: "No — they are illustrative estimates synthesised from the NDC activity registry. They are clearly labelled with an Illustrative badge. Replace the underlying seed data with real project accounts and IFMS figures before using them in official reports." },
  { q: "How do I trace a project from progress to bottleneck to finance?", a: "The app has a decision chain: from Dashboard (Q1) click indicators to see delivery status on Delivery & Accountability (Q2/Q3), then use the 'Check finance' button on each activity to jump to Finance & Investment (Q3). The Evidence & MRV page links back to Delivery at the bottom." },
  { q: "What is the Institutional Map for?", a: "It shows which ministry or partner owns which NDC action, and flags where mandates overlap. It is built from the actors data in the app and is illustrative — update the actors registry to reflect actual institutional arrangements." },
];

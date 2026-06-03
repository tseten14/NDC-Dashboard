import { useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ALL_ROLES } from "@/hooks/use-current-role";
import {
  BookOpen, Target, Satellite, HelpCircle, Palette, LayoutGrid, Users, ArrowRight,
  ExternalLink, CheckCircle2, AlertTriangle, XCircle, MinusCircle,
} from "lucide-react";

/* ── Content blocks (user manual — not a duplicate of Home) ── */

const GETTING_STARTED = [
  {
    step: "1",
    title: "Pick your country",
    text: "On first visit you choose Uganda (the only country with a full cockpit today). You can change country later from the globe icon in the top bar.",
  },
  {
    step: "2",
    title: "Open the Dashboard",
    text: "This is where NDC pledges meet live emissions. Select a sector, click one target in the left column, and the charts in the middle and right update immediately.",
  },
  {
    step: "3",
    title: "Use other tabs when you need them",
    text: "Emissions Map shows where pollution comes from on a map. Climate Finance screens projects for investors. Policy documents lists national laws, UN submissions, and fund projects with links to official PDFs. Documentation (this page) explains words and colours you see elsewhere.",
  },
];

interface NavItem {
  title: string;
  to: string;
  who: string;
  plain: string;
  youWillSee: string[];
}

const BASIC_NAV: NavItem[] = [
  {
    title: "Home",
    to: "/",
    who: "Everyone — first stop after choosing a country",
    plain: "A short welcome and links into the main tools. It does not show detailed data.",
    youWillSee: ["Summary of what the app can do", "Quick links to Dashboard and Map"],
  },
  {
    title: "Dashboard",
    to: "/dashboard",
    who: "Planners, MRV teams, ministry staff, partners",
    plain: "The core workspace. Compare each NDC target to observed emissions and see whether delivery looks on track.",
    youWillSee: [
      "List of NDC targets (left)",
      "Observed vs target chart (centre)",
      "Progress % and related panels (right)",
      "Sector, National/District, and Historical/Projection filters at the top",
    ],
  },
  {
    title: "Data Ingestion",
    to: "/ingest",
    who: "Data officers uploading files",
    plain: "Bring spreadsheets or reports into the system. Quick Scan profiles a file fast; full column mapping is coming later.",
    youWillSee: ["Quick Scan for triage", "GIS upload and data-source connections"],
  },
  {
    title: "AI 2030 Prediction",
    to: "/ai-2030",
    who: "Policy and planning teams",
    plain: "A forecast of where emissions may be in 2030 if recent trends continue — with a shaded uncertainty band, not a guarantee.",
    youWillSee: ["Per-sector trend lines toward 2030", "Gap vs NDC target where data allows"],
  },
  {
    title: "Climate Finance",
    to: "/climate-finance",
    who: "Investment and climate-finance colleagues",
    plain: "Indicative screening: cost to cut a tonne of CO₂, possible carbon-credit revenue, and which fund windows might fit. Not financial advice.",
    youWillSee: ["Sliders for carbon price and assumptions", "Project cards and funding-pathway hints"],
  },
  {
    title: "Policy documents",
    to: "/documents",
    who: "Policy officers, MRV staff, and partners preparing for meetings",
    plain: "Searchable list of Uganda laws, executive plans, UN climate submissions, and multilateral fund project documents. The Intervention pathway tab shows how policy instruments can link to intended outcomes (illustrative transport model).",
    youWillSee: ["Document library with category filters", "Intervention pathway diagram", "Links to CPR and PDF"],
  },
  {
    title: "Emissions Map",
    to: "/map",
    who: "Anyone who thinks geographically",
    plain: "Uganda on a map with coloured bubbles for emission sources. Filter by year and sector; bubble size shows how much each source emits.",
    youWillSee: ["National totals for the selected year", "Sector legend and source tooltips"],
  },
  {
    title: "Documentation",
    to: "/docs",
    who: "You — when something is unclear",
    plain: "This user guide: what screens mean, what colours and abbreviations stand for, and where data comes from.",
    youWillSee: ["Plain-English explanations", "Glossary and FAQ"],
  },
];

const ADVANCED_NAV: NavItem[] = [
  {
    title: "Strategy Library",
    to: "/library",
    who: "Policy analysts",
    plain: "National plans (NDP IV, Vision 2040, sector strategies) linked to NDC targets so you can see the policy behind a number.",
    youWillSee: ["Searchable strategy documents and cross-links"],
  },
  {
    title: "My Work",
    to: "/my-work",
    who: "Delivery teams",
    plain: "Your draft activities and decision log — work in progress for tracking who did what.",
    youWillSee: ["Personal activity list and notes"],
  },
  {
    title: "Climate Risk",
    to: "/risk",
    who: "Adaptation and disaster-risk teams",
    plain: "Hazard and vulnerability views to prioritise districts — separate from mitigation emissions on the Dashboard.",
    youWillSee: ["Risk maps and screening tools"],
  },
];

const DASHBOARD_PANELS = [
  {
    name: "NDC Targets (left column)",
    text: "Every card is one pledge from Uganda’s Updated NDC (2022). Click a card once to select it — the big charts update. The small arrow expands extra detail and a mini trend line inside the card.",
  },
  {
    name: "Observed Data (centre)",
    text: "Shows measured or modelled values over time for the target you selected. Solid line = history; dashed = projection where available. Compares to the NDC baseline and 2030 goal.",
  },
  {
    name: "Progress toward target (right)",
    text: "A simple read on how far the latest data is from the 2030 goal: on track, at risk, or off track. Open the buttons below for activities, top emitters, spatial certainty, and mitigation options.",
  },
  {
    name: "Strip above the columns",
    text: "Coloured counts (ON-TRACK, OFF-TRACK, IMPL. GAPS, MRV GAPS) summarise all targets at a glance. Click a row to jump to that target.",
  },
];

const FILTERS = [
  { label: "Sector", meaning: "Which part of the economy — e.g. AFOLU (forests & land), Energy, Transport. Economy-wide shows all sectors grouped." },
  { label: "Geography · National", meaning: "Country total from Climate TRACE for Uganda." },
  { label: "Geography · District", meaning: "Same data split by district (county). Some national-only targets show a proxy sector instead." },
  { label: "Time · Historical", meaning: "Past years only — what has already happened." },
  { label: "Time · Projection", meaning: "Includes forward-looking lines where the app has projection data." },
  { label: "Refresh", meaning: "Fetches the latest figures from the server (cached for speed)." },
  { label: "Export", meaning: "Download Excel, PDF summary, or a CSV shaped for reporting (CRT/BTR style)." },
];

const STATUS_CODES = [
  { code: "On track", color: "text-on-track", icon: CheckCircle2, meaning: "Latest data suggests the target is within reach at the current pace — still check assumptions." },
  { code: "At risk", color: "text-at-risk", icon: AlertTriangle, meaning: "Trend is worrying or data quality is thin; needs attention before 2030." },
  { code: "Off track", color: "text-off-track", icon: XCircle, meaning: "Current path is far from the goal; strong course correction or more finance may be needed." },
  { code: "Unknown", color: "text-muted-foreground", icon: MinusCircle, meaning: "Not enough observed data to judge yet." },
  { code: "IMPL. GAPS", color: "text-muted-foreground", icon: HelpCircle, meaning: "No delivery activity linked to this target in the catalogue yet." },
  { code: "MRV GAPS", color: "text-muted-foreground", icon: HelpCircle, meaning: "Activities exist but measured data is missing or weak." },
];

const TARGET_BADGES = [
  { badge: "Unconditional", meaning: "Uganda intends to meet this with domestic resources." },
  { badge: "Conditional", meaning: "Depends on international finance, technology, or capacity support." },
  { badge: "Mixed", meaning: "Contains both unconditional and conditional parts (read the target text)." },
  { badge: "Emissions Reduction", meaning: "Measured in tonnes of CO₂ equivalent (MtCO₂e)." },
  { badge: "Forest Cover / Renewable Energy / …", meaning: "Non-emissions metric (hectares, %, MW, etc.) — chart units change accordingly." },
];

const SECTORS = [
  { abbr: "Economy-wide", full: "All sectors combined under the headline NDC pledge." },
  { abbr: "AFOLU", full: "Agriculture, Forestry and Other Land Use — forests, land use, much of Uganda’s emissions story." },
  { abbr: "Energy", full: "Power generation and stationary energy use (not transport)." },
  { abbr: "Transport", full: "Road, rail, and other moving sources." },
  { abbr: "Waste", full: "Solid waste and wastewater." },
  { abbr: "IPPU", full: "Industrial Processes and Product Use (e.g. cement, refrigerants)." },
  { abbr: "Agriculture", full: "Farming and livestock emissions within the NDC structure." },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "NDC", def: "Nationally Determined Contribution — Uganda’s official climate pledge under the Paris Agreement (updated 2022 in this app)." },
  { term: "MtCO₂e", def: "Million tonnes of carbon dioxide equivalent. One number that compares CO₂ and other greenhouse gases." },
  { term: "tCO₂e", def: "Tonnes of CO₂ equivalent — used for smaller sources or per-tonne costs." },
  { term: "BAU", def: "Business as usual — where emissions would go without extra climate action." },
  { term: "MRV", def: "Measurement, Reporting and Verification — proving that data and progress are real." },
  { term: "Climate TRACE", def: "Independent global emissions inventory built from satellites, sensors, and models. Source of live data in this app." },
  { term: "GADM", def: "Global map of admin boundaries. Here, districts and counties inside Uganda." },
  { term: "Spatial certainty", def: "How much of an area’s total is tied to known map locations vs spread using statistical guesses." },
  { term: "Asset", def: "On the map: a specific facility or place with coordinates (power plant, landfill, etc.)." },
  { term: "Cost to abate", def: "Rough dollars needed to avoid one tonne of CO₂ with a project — for screening only." },
  { term: "Carbon credit", def: "A tradable certificate for one tonne of reduced or removed CO₂, if independently verified." },
  { term: "Indicative", def: "Estimate for discussion — not audited, tendered, or guaranteed." },
  { term: "BTR / CRT", def: "Biennial Transparency Report / Common Reporting Table — UNFCCC reporting formats; Export can produce CSV aligned to these." },
  { term: "ATMS", def: "When enabled in advanced views: filter to indicators tagged as suitable for automated tracking." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Why do I need to click a target twice sometimes?", a: "You should only need one click. If charts stay empty, pick the target again or refresh — a recent fix ensures the first click always selects it." },
  { q: "Why does district view differ from national?", a: "Some NDC targets are only defined nationally. The app may show a related emissions sector for your district as context, labelled clearly." },
  { q: "Is AI 2030 a promise?", a: "No. It extrapolates recent trends and shows uncertainty. Use it for direction, not legal commitments." },
  { q: "Can I trust Climate Finance numbers?", a: "They are indicative costs from the NDC catalogue plus sliders you control. Use them to start conversations, not to sign contracts." },
  { q: "What does the role dropdown do?", a: "It changes what you are allowed to edit (e.g. create activities vs read-only briefing). It does not change the underlying national data." },
  { q: "Where is the data from?", a: "Emissions: Climate TRACE (CC BY 4.0). Targets and activities: Uganda’s NDC and related catalogues in this project. Policy documents: Climate Policy Radar export (metadata and links, not a live API)." },
];

export default function Documentation() {
  const [technical, setTechnical] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl p-4 pb-12 space-y-8">
        {/* Hero — manual, not marketing */}
        <header className="space-y-2 border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="font-brand text-2xl font-bold text-foreground">User guide</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Plain-language help for the NDC Data Explorer. This page explains what each screen does,
            what the colours and abbreviations mean, and where numbers come from — written for
            colleagues who are not climate-data specialists.
          </p>
          <p className="text-xs text-muted-foreground">
            Looking for a quick tour? Visit{" "}
            <Link to="/" className="text-primary font-medium hover:underline">Home</Link> first, then return here when you need definitions.
          </p>
        </header>

        {/* Getting started */}
        <section className="space-y-3">
          <SectionTitle>Getting started in three steps</SectionTitle>
          <ol className="space-y-3">
            {GETTING_STARTED.map((s) => (
              <li key={s.step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {s.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Roles */}
        <section className="space-y-3">
          <SectionTitle>Your role (top-right dropdown)</SectionTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Roles control what you can change in the app. They do not change Uganda’s official numbers.
          </p>
          <div className="rounded-lg border divide-y">
            {ALL_ROLES.map((r) => (
              <div key={r.id} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                <span className="text-xs font-semibold text-foreground shrink-0 sm:w-44">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <section className="space-y-4">
          <SectionTitle icon={LayoutGrid}>Menu guide — Basic section</SectionTitle>
          <NavTable items={BASIC_NAV} />

          <SectionTitle icon={LayoutGrid}>Menu guide — Advanced section</SectionTitle>
          <p className="text-xs text-muted-foreground -mt-2">
            Expand <strong className="text-foreground font-medium">Advanced</strong> in the left sidebar to open these tools.
          </p>
          <NavTable items={ADVANCED_NAV} />
        </section>

        {/* Dashboard deep dive */}
        <section className="space-y-4">
          <SectionTitle icon={Target}>Understanding the Dashboard</SectionTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Dashboard is three columns plus filters. Think: <em>what we promised</em> (left) →{" "}
            <em>what we measure</em> (centre) → <em>are we on course</em> (right).
          </p>

          <div className="space-y-2">
            {DASHBOARD_PANELS.map((p) => (
              <Card key={p.name}>
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{p.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Top filters — what they mean</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {FILTERS.map((f) => (
                <div key={f.label} className="text-xs">
                  <span className="font-semibold text-foreground">{f.label}</span>
                  <span className="text-muted-foreground"> — {f.meaning}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Status codes */}
        <section className="space-y-3">
          <SectionTitle icon={Palette}>Colours and status codes</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {STATUS_CODES.map((s) => (
              <div key={s.code} className="flex gap-2 rounded-lg border p-2.5 items-start">
                <s.icon className={cn("h-4 w-4 shrink-0 mt-0.5", s.color)} />
                <div>
                  <p className={cn("text-xs font-bold", s.color)}>{s.code}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{s.meaning}</p>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Labels on target cards</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {TARGET_BADGES.map((b) => (
                <div key={b.badge} className="text-xs">
                  <Badge variant="outline" className="text-[9px] h-5 mr-1.5">{b.badge}</Badge>
                  <span className="text-muted-foreground">{b.meaning}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Sector names in the dropdown</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <dl className="space-y-2">
                {SECTORS.map((s) => (
                  <div key={s.abbr} className="text-xs grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-0.5">
                    <dt className="font-semibold text-foreground">{s.abbr}</dt>
                    <dd className="text-muted-foreground">{s.full}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </section>

        {/* Data source */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <SectionTitle icon={Satellite}>Where the emissions numbers come from</SectionTitle>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              Simple
              <Switch checked={technical} onCheckedChange={setTechnical} aria-label="Toggle technical detail" />
              Technical
            </label>
          </div>
          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed space-y-3">
              {technical ? (
                <p>
                  The app calls the Climate TRACE v7 API. Observed sector totals and geolocated sources
                  are aggregated to national and GADM level-1 (district) boundaries. Spatial-confidence
                  splits located emissions from spatially uncertain emissions (SUEs) allocated via proxies.
                </p>
              ) : (
                <p>
                  Independent scientists combine <strong className="text-foreground">satellite pictures</strong>,{" "}
                  <strong className="text-foreground">sensors</strong>, and{" "}
                  <strong className="text-foreground">computer models</strong> to estimate who is emitting
                  greenhouse gases, year by year. This app pulls those published estimates for Uganda and
                  lines them up next to your NDC targets.
                </p>
              )}
              <p>
                When trees are cut or land is cleared, stored carbon is released (emissions). When forests
                grow back, carbon is stored again (removals). The net change feeds the forestry and land-use
                figures you see on the Dashboard and Map.
              </p>
              <a
                href="https://climatetrace.org"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Climate TRACE website <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </section>

        {/* Glossary + FAQ */}
        <section className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <SectionTitle icon={BookOpen}>Abbreviations & terms</SectionTitle>
            <Card>
              <CardContent className="p-1">
                <Accordion type="single" collapsible>
                  {GLOSSARY.map((g, i) => (
                    <AccordionItem key={g.term} value={`g${i}`} className="border-b last:border-0 px-2">
                      <AccordionTrigger className="py-2.5 text-xs font-semibold hover:no-underline text-left">
                        {g.term}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-2">
                        {g.def}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <SectionTitle icon={HelpCircle}>Common questions</SectionTitle>
            <Card>
              <CardContent className="p-1">
                <Accordion type="single" collapsible>
                  {FAQ.map((f, i) => (
                    <AccordionItem key={i} value={`f${i}`} className="border-b last:border-0 px-2">
                      <AccordionTrigger className="py-2.5 text-xs font-semibold text-left hover:no-underline">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-2">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="text-center text-[10px] text-muted-foreground border-t border-border pt-6">
          Uganda NDC Data Explorer · Decision-support only · Not an official UN or government submission system
        </footer>
      </div>
    </ScrollArea>
  );
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof BookOpen;
}) {
  return (
    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
      {children}
    </h2>
  );
}

function NavTable({ items }: { items: NavItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.title} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  <Users className="h-3 w-3 inline mr-1 -mt-0.5" />
                  {item.who}
                </p>
              </div>
              <Link
                to={item.to}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-xs text-foreground/90 leading-relaxed">{item.plain}</p>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                  On screen you will see
                </p>
                <ul className="space-y-0.5">
                  {item.youWillSee.map((line) => (
                    <li key={line} className="flex gap-1.5 text-[11px] text-muted-foreground">
                      <span className="text-primary mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

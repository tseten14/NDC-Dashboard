import { useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  BookOpen, Target, Library, Briefcase, ShieldAlert, Upload, Sparkles, Coins,
  Satellite, Trees, Waves, Sprout, Mountain, Cpu, Ruler, Calculator, ArrowRight,
  Camera, Database, LineChart, ExternalLink, Sparkle,
} from "lucide-react";

type IconType = typeof Target;

interface Feature {
  icon: IconType;
  title: string;
  to: string;
  blurb: string;
  points: string[];
  accent: string;
}

const FEATURES: Feature[] = [
  {
    icon: Target, title: "Dashboard", to: "/dashboard", accent: "from-emerald-500/15",
    blurb: "The main workspace. Track climate pledges against real emissions.",
    points: ["See each NDC target and its 2030 goal", "Compare pledges to live Climate TRACE data", "Drill into districts, sources & spatial certainty"],
  },
  {
    icon: Library, title: "Strategy Library", to: "/library", accent: "from-sky-500/15",
    blurb: "A searchable shelf of national strategies, plans and policies.",
    points: ["Browse NDP IV, Vision 2040 & sector plans", "Link strategies to NDC targets", "Find the policy behind each number"],
  },
  {
    icon: Briefcase, title: "My Work", to: "/my-work", accent: "from-violet-500/15",
    blurb: "Your personal workspace for activities and decisions.",
    points: ["Draft and manage delivery activities", "Keep a decision log", "Pick up where you left off"],
  },
  {
    icon: ShieldAlert, title: "Climate Risk", to: "/risk", accent: "from-amber-500/15",
    blurb: "Where climate hazards meet people and assets.",
    points: ["View hazard and vulnerability layers", "Spot at-risk districts", "Prioritise adaptation"],
  },
  {
    icon: Upload, title: "Data Ingestion", to: "/ingest", accent: "from-teal-500/15",
    blurb: "Bring your own data in — PDFs, CSVs or JSON.",
    points: ["Upload and auto-parse files", "Map columns to observations", "Publish into the dashboard"],
  },
  {
    icon: Sparkles, title: "AI 2030 Prediction", to: "/ai-2030", accent: "from-fuchsia-500/15",
    blurb: "A model that forecasts where emissions are heading by 2030.",
    points: ["Per-sector trajectories with uncertainty", "Trained on real Climate TRACE history", "Gap vs. the NDC target, at a glance"],
  },
  {
    icon: Coins, title: "Climate Finance", to: "/climate-finance", accent: "from-yellow-500/15",
    blurb: "Turns the 2030 gap into the business case for investors.",
    points: ["Cost to cut carbon, per project", "Carbon-credit revenue at a price you set", "Which projects pay for themselves"],
  },
];

const PIPELINE = [
  { icon: Camera, title: "Capture", text: "Satellites photograph every corner of Earth — optical cameras (Sentinel-2, Landsat) and cloud-piercing radar (Sentinel-1)." },
  { icon: Cpu, title: "See", text: "Computer-vision models scan the images pixel by pixel, classifying land cover and spotting change over time." },
  { icon: Ruler, title: "Measure", text: "Models estimate living biomass (trees, mangroves, grasses) and convert it into stored carbon." },
  { icon: Calculator, title: "Account", text: "Carbon lost becomes emissions; carbon gained becomes removals. Net change = removals − emissions." },
];

interface Ecosystem {
  id: string;
  icon: IconType;
  label: string;
  what: string;
  watches: string;
  matters: string;
}

const ECOSYSTEMS: Ecosystem[] = [
  {
    id: "forest", icon: Trees, label: "Net Forest",
    what: "Change in carbon stored in the living biomass of forests — the trunks, branches, leaves and roots.",
    watches: "Deforestation and degradation (carbon out) versus regrowth, afforestation and reforestation (carbon in).",
    matters: "Forestry & land use is Uganda's largest emissions sector and the focus of its headline NDC target.",
  },
  {
    id: "mangrove", icon: Waves, label: "Mangrove",
    what: "Carbon-stock change in coastal and wetland mangrove biomass — some of the most carbon-dense vegetation on Earth.",
    watches: "Loss from clearing or die-back versus gains from restoration and natural expansion.",
    matters: "Mangroves store outsized carbon per hectare and buffer communities against floods and storms.",
  },
  {
    id: "grassland", icon: Sprout, label: "Net Grassland",
    what: "Living-biomass carbon change across grasslands, shrublands and savanna.",
    watches: "Conversion, overgrazing and fire versus recovery and improved rangeland management.",
    matters: "Grasslands cover vast areas; small per-hectare changes add up to large national totals.",
  },
  {
    id: "wetland", icon: Mountain, label: "Net Wetland",
    what: "Carbon-stock change in the living biomass of wetlands and peat-adjacent vegetation.",
    watches: "Drainage and conversion versus rewetting and restoration.",
    matters: "Wetlands are dense carbon stores and vital for water regulation and biodiversity.",
  },
];

const GLOSSARY: { term: string; def: string }[] = [
  { term: "MtCO₂e", def: "Million tonnes of carbon-dioxide equivalent — a common unit that puts all greenhouse gases on one scale." },
  { term: "NDC", def: "Nationally Determined Contribution — a country's climate pledge under the Paris Agreement." },
  { term: "BAU (Business-as-usual)", def: "Where emissions would head with no new climate action — the baseline a target is measured against." },
  { term: "Living biomass", def: "The carbon held in living plants: above-ground (stems, leaves) and below-ground (roots)." },
  { term: "Carbon stock change", def: "The difference in stored carbon between two points in time. A drop = emissions; a rise = removals." },
  { term: "GADM", def: "A global map of administrative boundaries. GADM1 ≈ Uganda's districts; GADM2 ≈ counties." },
  { term: "Spatially-uncertain emissions", def: "Emissions known at the national level but not pinned to an exact location, so they are spread out using statistical proxies." },
  { term: "Cost to abate (MAC)", def: "The dollars needed to cut one tonne of CO₂ with a given project." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Where does the emissions data come from?", a: "Live from the Climate TRACE v7 API, which combines satellite imagery, sensors and machine learning to estimate emissions for every country, sector and source." },
  { q: "How current is it?", a: "Climate TRACE publishes monthly data; this app shows the latest complete inventory year and caches responses so pages load fast." },
  { q: "Why can district numbers be less certain?", a: "Some emissions are measured at known sources; the rest are the national total distributed to districts using proxies. The Spatial Certainty panel shows the split for any area." },
  { q: "Is the AI 2030 prediction a guarantee?", a: "No. It is a trend-based forecast with an uncertainty band — useful for direction and gap-spotting, not a promise of the future." },
  { q: "Is the Climate Finance tab investment advice?", a: "No. Every figure is clearly labelled indicative — a screening tool to surface opportunities, built from public cost estimates and assumptions you control." },
];

export default function Documentation() {
  const [technical, setTechnical] = useState(false);
  const [eco, setEco] = useState("forest");

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl p-4 space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <div className="absolute -right-8 -top-8 opacity-10">
            <BookOpen className="h-40 w-40 text-primary" />
          </div>
          <div className="relative">
            <Badge variant="outline" className="mb-2 gap-1 text-[10px]"><Sparkle className="h-3 w-3" /> Documentation</Badge>
            <h1 className="text-2xl font-bold text-foreground">How the NDC Data Explorer works</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A friendly tour of everything inside — from live satellite emissions to 2030 forecasts and the
              business case for climate projects. No jargon required.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Live Climate TRACE data", "District-level detail", "AI forecasting", "Finance lens"].map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* What it does */}
        <section>
          <SectionHeading icon={Target} title="What you can do here" sub="Seven places to explore — click any card to jump in." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <Link key={f.title} to={f.to} className="group">
                <Card className={cn("h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md")}>
                  <CardContent className={cn("p-3 bg-gradient-to-br to-transparent", f.accent)}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/70 ring-1 ring-border">
                        <f.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{f.title}</span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{f.blurb}</p>
                    <ul className="space-y-0.5">
                      {f.points.map((p) => (
                        <li key={p} className="flex gap-1.5 text-[10px] text-foreground/80">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Data flow */}
        <section>
          <SectionHeading icon={Database} title="How the data flows" sub="From a satellite in orbit to a number on your screen." />
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                {[
                  { icon: Satellite, label: "Climate TRACE", text: "Satellites + ML estimate emissions worldwide" },
                  { icon: Database, label: "This app's backend", text: "Fetches, validates, aggregates & caches by sector and district" },
                  { icon: Target, label: "Dashboard", text: "Targets, trends and progress you can read" },
                  { icon: LineChart, label: "AI & Finance", text: "2030 forecast and the investor business case" },
                ].map((s, i, arr) => (
                  <div key={s.label} className="flex flex-1 items-center gap-3">
                    <div className="flex-1 rounded-lg border bg-card p-3 text-center">
                      <s.icon className="mx-auto mb-1 h-5 w-5 text-primary" />
                      <p className="text-xs font-semibold text-foreground">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{s.text}</p>
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Computer vision spotlight */}
        <section>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <SectionHeading icon={Satellite} title="How Climate TRACE sees emissions from space" sub="Computer vision turns satellite images into carbon numbers." inline />
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              Plain English
              <Switch checked={technical} onCheckedChange={setTechnical} aria-label="Toggle technical detail" />
              Technical
            </label>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {PIPELINE.map((step, i) => (
                  <div key={step.title} className="relative rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
                      <step.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">{step.title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* The carbon equation */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">The idea in one line</p>
                {technical ? (
                  <p className="font-mono text-xs text-foreground">
                    Emissions = activity (tonnes C in living biomass) × emission&nbsp;factor (tCO₂ per hectare);
                    area in hectares. Net&nbsp;sector = Σ removals − Σ emissions across all monitored land.
                  </p>
                ) : (
                  <p className="text-xs text-foreground">
                    When trees and plants <span className="font-semibold text-off-track">disappear</span>, stored carbon
                    is released as emissions. When they <span className="font-semibold text-on-track">grow back</span>,
                    carbon is pulled in. The model adds up both to get the net effect.
                  </p>
                )}
              </div>

              {/* Ecosystem tabs */}
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-1.5">Four living-biomass ecosystems the models track</p>
                <Tabs value={eco} onValueChange={setEco}>
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                    {ECOSYSTEMS.map((e) => (
                      <TabsTrigger key={e.id} value={e.id} className="gap-1.5 text-[11px]">
                        <e.icon className="h-3.5 w-3.5" /> {e.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {ECOSYSTEMS.map((e) => (
                    <TabsContent key={e.id} value={e.id} className="mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <Mini label="What it measures" text={e.what} />
                        <Mini label="What the model watches" text={e.watches} />
                        <Mini label="Why it matters" text={e.matters} />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Source: Climate TRACE LULUCF methodology — “Net Forest, Mangrove, Net Grassland and Net Wetland
                Carbon Stock Change (Living Biomass)”. Figures shown in the dashboard are Climate TRACE’s published
                estimates and are continually refined.{" "}
                <a
                  href="https://github.com/climatetracecoalition/methodology-documents"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Methodology documents <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Glossary + FAQ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <SectionHeading icon={BookOpen} title="Plain-English glossary" sub="Tap a term to reveal its meaning." />
            <Card>
              <CardContent className="p-2">
                <Accordion type="single" collapsible className="w-full">
                  {GLOSSARY.map((g, i) => (
                    <AccordionItem key={g.term} value={`g${i}`} className="border-b last:border-0">
                      <AccordionTrigger className="py-2 text-xs font-semibold hover:no-underline">{g.term}</AccordionTrigger>
                      <AccordionContent className="text-[11px] text-muted-foreground">{g.def}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
          <div>
            <SectionHeading icon={Sparkle} title="Questions, answered" sub="The things people ask most." />
            <Card>
              <CardContent className="p-2">
                <Accordion type="single" collapsible className="w-full">
                  {FAQ.map((f, i) => (
                    <AccordionItem key={i} value={`f${i}`} className="border-b last:border-0">
                      <AccordionTrigger className="py-2 text-xs font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-[11px] text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        <p className="pb-2 text-center text-[10px] text-muted-foreground">
          Data: Climate TRACE (CC BY 4.0) · NDC targets from Uganda’s Nationally Determined Contribution · Built as a
          decision-support cockpit. All AI and finance outputs are indicative.
        </p>
      </div>
    </ScrollArea>
  );
}

function SectionHeading({ icon: Icon, title, sub, inline }: { icon: IconType; title: string; sub: string; inline?: boolean }) {
  return (
    <div className={cn(!inline && "mb-2")}>
      <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Mini({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border bg-card p-2.5">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <p className="text-[11px] text-foreground/90 leading-relaxed">{text}</p>
    </div>
  );
}

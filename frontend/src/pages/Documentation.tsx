import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ALL_ROLES } from "@/hooks/use-current-role";
import type { FeatureGuide } from "@/data/user-guide-content";
import {
  GETTING_STARTED,
  BASIC_FEATURES,
  ADVANCED_FEATURES,
  DASHBOARD_DIALOGS,
  DASHBOARD_PANELS,
  FILTERS,
  STATUS_CODES,
  TARGET_BADGES,
  SECTORS,
  DATA_SOURCES_TABLE,
  GLOSSARY,
  FAQ,
} from "@/data/user-guide-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Target, Satellite, HelpCircle, Palette, LayoutGrid, Users, ArrowRight,
  ExternalLink, CheckCircle2, AlertTriangle, XCircle, MinusCircle, ListOrdered,
  Cog, Flag, AlertCircle, Workflow,
} from "lucide-react";

const SystemDesignDoc = lazy(() =>
  import("@/components/docs/SystemDesignDoc").then((m) => ({ default: m.SystemDesignDoc })),
);

const STATUS_ICONS = {
  "On track": { icon: CheckCircle2, color: "text-on-track" },
  "At risk": { icon: AlertTriangle, color: "text-at-risk" },
  "Off track": { icon: XCircle, color: "text-off-track" },
  Unknown: { icon: MinusCircle, color: "text-muted-foreground" },
  "IMPL. GAPS": { icon: HelpCircle, color: "text-muted-foreground" },
  "MRV GAPS": { icon: HelpCircle, color: "text-muted-foreground" },
} as const;

export default function Documentation() {
  const [technical, setTechnical] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full w-full bg-muted/25">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-14 space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary shrink-0" />
              <h1 className="font-brand text-2xl sm:text-3xl font-bold text-foreground">Documentation</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
              User guide for day-to-day use, plus system design for developers (architecture, data flows,
              and API boundaries).
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              New here? Start on <Link to="/" className="text-primary font-medium hover:underline">Home</Link>, then
              return for full detail on every screen.
            </p>
          </div>
        </header>

        <Tabs defaultValue="guide" className="space-y-6">
          <TabsList className="h-auto w-full sm:w-auto flex flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="guide" className="gap-1.5 px-4 py-2 text-sm">
              <BookOpen className="h-4 w-4" />
              User guide
            </TabsTrigger>
            <TabsTrigger value="system-design" className="gap-1.5 px-4 py-2 text-sm">
              <Workflow className="h-4 w-4" />
              System design
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-0 space-y-10 w-full">
        {/* Getting started */}
        <section className="space-y-4">
          <SectionTitle icon={ListOrdered}>Getting started</SectionTitle>
          <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3 list-none p-0 m-0">
            {GETTING_STARTED.map((s) => (
              <li
                key={s.step}
                className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-sm h-full"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {s.step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Roles */}
        <section className="space-y-3">
          <SectionTitle icon={Users}>Your role (top-right)</SectionTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Controls edit rights only. National emissions and NDC text do not change when you switch role.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_ROLES.map((r) => (
              <div key={r.id} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation structure callout */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5">
          <p className="text-xs font-bold text-foreground">How navigation is organised</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The <strong className="text-foreground">top bar</strong> lists primary tools in order:
            Home → Emissions Map → Dashboard → Data Ingestion → AI 2030 → Policy Impact →
            Climate Finance → Policy Documents → Database → Documentation.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The <strong className="text-foreground">left sidebar</strong> groups deeper pages into{" "}
            <strong className="text-foreground">five decision questions</strong> (Q1–Q5). Each group is
            collapsible. Advanced pages (Strategy Library, Climate Risk, etc.) sit below the primary list.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1 pt-1">
            {[
              { q: "Q1", label: "Are we on track?", pages: "Dashboard · Indicators · Evidence & MRV · Projections" },
              { q: "Q2", label: "Which interventions work?", pages: "Project Check · Delivery · Causal Chains · Cost Effectiveness" },
              { q: "Q3", label: "Where are the bottlenecks?", pages: "Delivery · Finance · Climate Finance · Financial Flows · Ownership" },
              { q: "Q4", label: "Where do we invest next?", pages: "AI 2030 · Investment Templates · Tenfold · Policy Impact" },
              { q: "Q5", label: "Are we aligned?", pages: "Ownership · NDP IV · Vision 2040 · Institutional Map" },
            ].map(({ q, label, pages }) => (
              <div key={q} className="text-[11px] py-0.5">
                <span className="font-bold text-primary">{q}</span>
                <span className="font-semibold text-foreground"> {label}</span>
                <span className="text-muted-foreground"> — {pages}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature guides — always-visible */}
        <section className="space-y-4">
          <SectionTitle icon={LayoutGrid}>Always-visible pages — full feature guides</SectionTitle>
          <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
            Each card explains: purpose → steps → how it works → what you get → limitations.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {BASIC_FEATURES.map((f) => (
              <FeatureGuideCard key={f.title} guide={f} />
            ))}
          </div>
        </section>

        {/* Q1-Q5 decision pages */}
        <section className="space-y-4">
          <SectionTitle icon={LayoutGrid}>Q1–Q5 decision pages</SectionTitle>
          <p className="text-xs sm:text-sm text-muted-foreground -mt-2 max-w-4xl">
            Found inside the five question groups in the sidebar. The three pages marked <strong className="text-foreground">NEW</strong> use illustrative data — replace with real figures for official use.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ADVANCED_FEATURES.map((f) => (
              <FeatureGuideCard key={f.title} guide={f} />
            ))}
          </div>
        </section>

        {/* Dashboard */}
        <section className="space-y-4">
          <SectionTitle icon={Target}>Dashboard — extra detail</SectionTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Three columns: <strong className="text-foreground">promised</strong> (left) →{" "}
            <strong className="text-foreground">measured</strong> (centre) →{" "}
            <strong className="text-foreground">on course?</strong> (right). Use the{" "}
            <strong className="text-foreground">NDC AI</strong> button for Perplexity-style cited analysis
            of the current target (requires OpenAI on the server).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {DASHBOARD_PANELS.map((p) => (
              <Card key={p.name} className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">{p.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Pop-up tools (right column buttons)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {DASHBOARD_DIALOGS.map((d) => (
                <div key={d.name} className="border-b border-border/60 last:border-0 pb-3 last:pb-0">
                  <p className="text-xs font-bold text-foreground">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    <span className="font-medium text-foreground/80">Purpose: </span>
                    {d.purpose}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground/80">How: </span>
                    {d.how}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground/80">Result: </span>
                    {d.result}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Top filters</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {FILTERS.map((f) => (
                <div key={f.label} className="text-xs sm:text-sm">
                  <span className="font-semibold text-foreground">{f.label}</span>
                  <span className="text-muted-foreground"> — {f.meaning}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>
        </section>

        {/* Status & sectors */}
        <section className="space-y-3">
          <SectionTitle icon={Palette}>Colours, badges, and sectors</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_CODES.map((s) => {
              const meta = STATUS_ICONS[s.code as keyof typeof STATUS_ICONS] ?? STATUS_ICONS.Unknown;
              const Icon = meta.icon;
              return (
                <div key={s.code} className="flex gap-2 rounded-lg border p-2.5 items-start">
                  <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.color)} />
                  <div>
                    <p className={cn("text-xs font-bold", meta.color)}>{s.code}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.meaning}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Target card badges</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {TARGET_BADGES.map((b) => (
                <div key={b.badge} className="text-xs sm:text-sm">
                  <Badge variant="outline" className="text-[9px] h-5 mr-1.5">
                    {b.badge}
                  </Badge>
                  <span className="text-muted-foreground">{b.meaning}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Sector dropdown</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {SECTORS.map((s) => (
                  <div key={s.abbr} className="text-xs sm:text-sm">
                    <dt className="font-semibold text-foreground">{s.abbr}</dt>
                    <dd className="text-muted-foreground">{s.full}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          </div>
        </section>

        {/* Data sources table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <SectionTitle icon={Satellite}>Where every type of number comes from</SectionTitle>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              Simple
              <Switch checked={technical} onCheckedChange={setTechnical} aria-label="Toggle technical detail" />
              Technical
            </label>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="p-2 font-semibold">Area</th>
                    <th className="p-2 font-semibold">Source</th>
                    <th className="p-2 font-semibold">What you get</th>
                    <th className="p-2 font-semibold">Caveat</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA_SOURCES_TABLE.map((row) => (
                    <tr key={row.area} className="border-b border-border/60">
                      <td className="p-2 font-medium text-foreground">{row.area}</td>
                      <td className="p-2 text-muted-foreground">{row.source}</td>
                      <td className="p-2 text-muted-foreground">{row.whatYouGet}</td>
                      <td className="p-2 text-muted-foreground">{row.caveat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed space-y-3">
              {technical ? (
                <p>
                  Emissions use Climate TRACE API v7 aggregated to GADM 0/1. Map and sources use geolocated
                  facility rows; spatial-confidence separates located from spatially uncertain emissions (SUEs).
                  NDC targets from config/ndcTargets.js. Policy JSON from CPR CSV build. Finance economics computed
                  client-side from catalogue fields.
                </p>
              ) : (
                <p>
                  Think of the app as <strong className="text-foreground">three layers</strong>: (1) official pledges
                  and programmes from Uganda’s NDC, (2) independent observed emissions from Climate TRACE, (3) evidence
                  documents and illustrative tools (finance screening, pathway diagram) that support decisions but do
                  not replace government MRV.
                </p>
              )}
              <p>
                Forest loss releases carbon; regrowth stores it — net AFOLU figures on the Dashboard and Map reflect
                that balance from Climate TRACE, not from manual tree counts in this app.
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
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </TabsContent>

          <TabsContent value="system-design" className="mt-0 pb-12">
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground py-8 text-center">Loading system design…</p>
              }
            >
              <SystemDesignDoc />
            </Suspense>
          </TabsContent>
        </Tabs>
        </div>
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
    <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
      {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
      {children}
    </h2>
  );
}

function FeatureGuideCard({ guide }: { guide: FeatureGuide }) {
  return (
    <Card className="overflow-hidden shadow-sm h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">{guide.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              <Users className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
              {guide.who}
            </p>
          </div>
          <Link
            to={guide.to}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-border/40">
          <GuideBlock icon={Flag} label="What it is for" text={guide.purpose} />
        </div>

        <Accordion type="single" collapsible className="px-1 flex-1">
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="px-3 py-2.5 text-xs font-semibold text-primary hover:no-underline">
              Steps, implementation & limitations
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4 pt-0 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <ListOrdered className="h-3 w-3" />
                  How to use it (steps)
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {guide.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <GuideBlock icon={Cog} label="How the app implements it" text={guide.howItWorks} />
              <GuideBlock icon={CheckCircle2} label="What result you should expect" text={guide.result} tone="text-on-track" />
              <GuideBlock icon={AlertCircle} label="What it is not / limitations" text={guide.limitations} tone="text-amber-700 dark:text-amber-500" />

              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">
                  On screen you will see
                </p>
                <ul className="grid grid-cols-1 gap-1">
                  {guide.youWillSee.map((line) => (
                    <li key={line} className="flex gap-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      <span className="text-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function GuideBlock({
  icon: Icon,
  label,
  text,
  tone,
}: {
  icon: typeof Flag;
  label: string;
  text: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className={cn("text-xs sm:text-sm leading-relaxed", tone ?? "text-foreground/90")}>{text}</p>
    </div>
  );
}

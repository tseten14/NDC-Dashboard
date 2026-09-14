/**
 * Screen: MWP Implementation Marketplace.
 *
 * A clean, native view of the demonstration project pipeline — country-led
 * climate projects moving from concept to implementation. All figures are
 * fictional prototype data, not official UNFCCC assessments.
 */
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataHonestyBadge } from "@/components/DataHonestyBadge";
import {
  PROJECTS, SECTORS, PROJECT_STAGES, computeStats, fmtUSD, stageTone,
  type MwpProject, type Sector, type ProjectStage,
} from "@/data/mwp-marketplace-data";
import {
  Store, Search, Globe2, Leaf, TrendingUp, Banknote, Target,
  ArrowRight, Building2, MapPin, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Stat tile ───────────────────────────────────────────────────────── */

function StatTile({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold tabular-nums text-foreground leading-none">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
            {sub && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Project row ─────────────────────────────────────────────────────── */

function ProjectRow({ project }: { project: MwpProject }) {
  const [expanded, setExpanded] = useState(false);
  const stageIdx = PROJECT_STAGES.indexOf(project.stage);
  const progress = ((stageIdx + 1) / PROJECT_STAGES.length) * 100;

  return (
    <div
      className="border-b border-border last:border-b-0 px-3 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-foreground leading-snug">{project.name}</p>
            {project.flagship && (
              <Badge variant="secondary" className="text-[8px] h-3.5 px-1 gap-0.5">
                <Sparkles className="h-2.5 w-2.5" />
                Flagship
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <Badge variant="outline" className={cn("text-[9px] h-4 px-1", stageTone(project.stage))}>
              {project.stage}
            </Badge>
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{project.sector}</Badge>
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {project.country}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-right">
          <div>
            <p className="text-xs font-bold tabular-nums text-foreground">{fmtUSD(project.totalInvestmentM)}</p>
            <p className="text-[9px] text-muted-foreground">total</p>
          </div>
          {project.gapM > 0 && (
            <div>
              <p className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmtUSD(project.gapM)}</p>
              <p className="text-[9px] text-muted-foreground">gap</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {project.annualMtCO2e.toFixed(2)}
            </p>
            <p className="text-[9px] text-muted-foreground">MtCO₂e/yr</p>
          </div>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
          <p>{project.summary}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            <span><strong className="text-foreground">NDC target:</strong> {project.ndcTarget}</span>
            <span><strong className="text-foreground">Region:</strong> {project.region}</span>
            <span>
              <strong className="text-foreground">Secured:</strong>{" "}
              {fmtUSD(project.securedM)} of {fmtUSD(project.totalInvestmentM)}{" "}
              ({Math.round((project.securedM / project.totalInvestmentM) * 100)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function MwpMarketplace() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<Sector | "">("");
  const [stageFilter, setStageFilter] = useState<ProjectStage | "">("");

  const filtered = useMemo(() => {
    let list = PROJECTS;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          p.sector.toLowerCase().includes(q),
      );
    }
    if (sectorFilter) list = list.filter((p) => p.sector === sectorFilter);
    if (stageFilter) list = list.filter((p) => p.stage === stageFilter);
    return list;
  }, [search, sectorFilter, stageFilter]);

  const stats = useMemo(() => computeStats(PROJECTS), []);
  const filteredStats = useMemo(() => computeStats(filtered), [filtered]);
  const hasFilters = search || sectorFilter || stageFilter;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              MWP Implementation Marketplace
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Country-led climate projects moving from NDC priorities to investable implementation.
              Connects mitigation gaps with finance, technology and delivery partners.
            </p>
          </div>
          <DataHonestyBadge kind="illustrative" />
        </div>

        {/* Pipeline summary */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Pipeline overview
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile icon={Building2} label="Projects in pipeline" value={String(stats.count)} />
            <StatTile icon={Banknote} label="Total investment" value={fmtUSD(stats.totalInvestment)} />
            <StatTile
              icon={Target}
              label="Financing gap"
              value={fmtUSD(stats.totalGap)}
              sub={`${fmtUSD(stats.totalSecured)} secured`}
            />
            <StatTile
              icon={Globe2}
              label="Countries"
              value={String(stats.countries)}
              sub={`${stats.sectors} sectors`}
            />
          </div>
        </section>

        {/* Emissions impact callout */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-3 flex items-center gap-3 text-[11px]">
            <Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <span className="font-semibold text-foreground">
                {stats.totalMtCO2e.toFixed(1)} MtCO₂e/year
              </span>{" "}
              combined annual reduction potential across all pipeline projects.
            </span>
          </CardContent>
        </Card>

        {/* Project list */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Banknote className="h-4 w-4 text-primary" />
            Project pipeline
          </h3>

          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects, countries…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {filtered.length} of {PROJECTS.length} projects
            </span>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={!sectorFilter ? "default" : "outline"}
              className="h-6 text-[10px] px-2"
              onClick={() => setSectorFilter("")}
            >
              All sectors
            </Button>
            {SECTORS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={sectorFilter === s ? "default" : "outline"}
                className="h-6 text-[10px] px-2"
                onClick={() => setSectorFilter(sectorFilter === s ? "" : s)}
              >
                {s}
              </Button>
            ))}
          </div>

          {/* Project cards */}
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">
                  No projects match the current filters.
                </p>
              ) : (
                filtered.map((p) => <ProjectRow key={p.id} project={p} />)
              )}
            </CardContent>
          </Card>
        </section>

        {/* Disclaimer */}
        <p className="text-[9px] text-muted-foreground/60 leading-relaxed max-w-2xl">
          This demonstration does not represent investment advice, project endorsement, credit
          assessment or a financing commitment. All project information and indicators are
          illustrative prototype data authored for demonstration purposes only.
        </p>
      </div>
    </ScrollArea>
  );
}

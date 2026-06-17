import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Target,
  TrendingDown,
} from "lucide-react";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import {
  CLIMATE_TRACE_API_SECTORS,
  progressFromLiveApiFields,
  type ClimatetraceApiSector,
} from "@/lib/emissions-integration";
import { ndcTargets } from "@/data/uganda-ndc-data";
import { emissionsApi, type NdcSectorKey } from "@/lib/api";
import { uiStatusFromApiStatus } from "@/lib/progress";
import { sectorDefinitions, type SectorId, type ProgressStatus } from "@/data/uganda-ndc-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NdcGapSummaryProps {
  variant?: "full" | "compact";
  onSelectSector?: (sectorId: SectorId) => void;
}

const API_TO_SECTOR_ID: Record<ClimatetraceApiSector, SectorId> = {
  afolu: "afolu",
  energy: "energy",
  transport: "transport",
  ippu: "ippu",
  agriculture: "agriculture",
  waste: "waste",
};

const STATUS_LABEL: Record<ProgressStatus, string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  "off-track": "Off track",
  unknown: "Unknown",
};

const STATUS_CLS: Record<ProgressStatus, string> = {
  "on-track": "bg-on-track/10 text-on-track border-on-track/30",
  "at-risk": "bg-muted text-muted-foreground border-border",
  "off-track": "bg-off-track/10 text-off-track border-off-track/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<ProgressStatus, string> = {
  "on-track": "bg-on-track",
  "at-risk": "bg-muted-foreground",
  "off-track": "bg-off-track",
  unknown: "bg-muted-foreground",
};

const STATUS_RANK: Record<ProgressStatus, number> = {
  "off-track": 4,
  "at-risk": 3,
  unknown: 2,
  "on-track": 1,
};

interface SectorRow {
  apiSector: ClimatetraceApiSector;
  sectorId: SectorId;
  name: string;
  status: ProgressStatus;
  progressPct: number | null;
  latestValue: number | null;
  latestYear: number | null;
  gapMt: number | null;
  dataMode: "live" | "indicative";
}

function sectorName(sectorId: SectorId): string {
  return sectorDefinitions.find((s) => s.id === sectorId)?.name ?? sectorId;
}

export function NdcGapSummary({ variant = "full", onSelectSector }: NdcGapSummaryProps) {
  const emissions = useEmissionsData();
  const isCompact = variant === "compact";

  const predQuery = useQuery({
    queryKey: ["emissions", "predictions", emissions.geography, emissions.districtName ?? "national"],
    queryFn: () =>
      emissionsApi.predictions(
        emissions.districtName ? { district: emissions.districtName } : undefined,
      ),
    staleTime: 15 * 60 * 1000,
    retry: 1,
    enabled: emissions.isApiReachable || !emissions.summaryIsLoading,
  });

  const isBundledSource =
    !!emissions.summary?.data_source && /bundled|mock/i.test(emissions.summary.data_source);

  const sectorRows = useMemo((): SectorRow[] => {
    return CLIMATE_TRACE_API_SECTORS.map((apiSector) => {
      const sectorId = API_TO_SECTOR_ID[apiSector];
      const pr = emissions.progressBySector[apiSector];
      const summaryEntry = emissions.summary?.sectors?.[apiSector as NdcSectorKey];
      const ndcTarget = ndcTargets.find(
        (t) => t.sectorId === sectorId && t.metricType === "emissions-reduction",
      );
      const liveComputed =
        pr && ndcTarget ? progressFromLiveApiFields(pr, ndcTarget) : null;
      const apiStatus = pr?.status ?? summaryEntry?.status ?? "unknown";
      const status = liveComputed?.percent != null ? liveComputed.status : uiStatusFromApiStatus(apiStatus);
      const hasLiveProgress =
        !!pr &&
        !emissions.sectorError[apiSector] &&
        emissions.isApiReachable &&
        !isBundledSource;
      const pred = predQuery.data?.predictions?.[apiSector as NdcSectorKey];

      return {
        apiSector,
        sectorId,
        name: sectorName(sectorId),
        status,
        progressPct:
          liveComputed?.percent ??
          pr?.progress_pct ??
          summaryEntry?.progress_pct ??
          null,
        latestValue: pr?.latest_value ?? summaryEntry?.latest_value ?? null,
        latestYear: pr?.latest_year ?? summaryEntry?.latest_year ?? null,
        gapMt: pred?.gap ?? null,
        dataMode: hasLiveProgress ? "live" : "indicative",
      };
    });
  }, [emissions, predQuery.data, isBundledSource]);

  const statusCounts = useMemo(() => {
    const counts = { onTrack: 0, atRisk: 0, offTrack: 0, unknown: 0 };
    for (const row of sectorRows) {
      if (row.status === "on-track") counts.onTrack++;
      else if (row.status === "at-risk") counts.atRisk++;
      else if (row.status === "off-track") counts.offTrack++;
      else counts.unknown++;
    }
    return counts;
  }, [sectorRows]);

  const priorities = useMemo(() => {
    return [...sectorRows]
      .sort((a, b) => {
        const rankDiff = STATUS_RANK[b.status] - STATUS_RANK[a.status];
        if (rankDiff !== 0) return rankDiff;
        const gapA = a.gapMt ?? 0;
        const gapB = b.gapMt ?? 0;
        if (gapB !== gapA) return gapB - gapA;
        const progA = a.progressPct ?? 100;
        const progB = b.progressPct ?? 100;
        return progA - progB;
      })
      .filter((r) => r.status !== "on-track" || (r.gapMt ?? 0) > 0)
      .slice(0, 3);
  }, [sectorRows]);

  const headlineOnTrack =
    statusCounts.offTrack === 0 && statusCounts.atRisk === 0 && statusCounts.unknown === 0;

  if (emissions.summaryIsLoading) {
    return (
      <div
        className={cn(
          isCompact ? "px-3 py-2 border-b border-border bg-muted/20" : "rounded-xl border border-border p-4",
        )}
        aria-busy="true"
        aria-label="Loading NDC gap summary"
      >
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={cn("rounded", isCompact ? "h-5 w-24" : "h-8 w-28")} />
          ))}
        </div>
      </div>
    );
  }

  if (emissions.summaryError && !emissions.isApiReachable) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-destructive",
          isCompact
            ? "px-3 py-2 border-b border-border bg-destructive/5"
            : "rounded-xl border border-destructive/30 bg-destructive/5 p-4",
        )}
        role="alert"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Climate TRACE unavailable — gap summary cannot be calculated from live data.
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="px-3 py-2 border-b border-border bg-primary/[0.03]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground shrink-0">
            NDC gap view
          </span>
          <HeadlinePill
            onTrack={statusCounts.onTrack}
            atRisk={statusCounts.atRisk}
            offTrack={statusCounts.offTrack}
            compact
          />
          <span className="text-[9px] text-muted-foreground hidden sm:inline">
            {isBundledSource ? "Indicative" : "Live TRACE"}
          </span>
          <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">
              Priorities
            </span>
            {priorities.length === 0 ? (
              <span className="text-[10px] text-muted-foreground">All sectors on track</span>
            ) : (
              priorities.map((p) => (
                <PriorityChip key={p.apiSector} row={p} onSelectSector={onSelectSector} compact />
              ))
            )}
          </div>
          <Button asChild variant="ghost" size="sm" className="h-6 text-[10px] gap-1 shrink-0 ml-auto">
            <Link to="/climate-finance">
              Finance view
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.04] via-card to-card shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <h2
                className="font-brand text-base sm:text-lg font-semibold text-foreground"
                data-testid="ndc-gap-summary"
              >
                NDC gap &amp; priorities
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Are we on track toward 2030? Where should ministries focus next — based on Climate TRACE
              progress and sector gaps.
            </p>
          </div>
          <DataModeBadge live={!isBundledSource && emissions.isApiReachable} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <section aria-labelledby="ndc-on-track-heading">
            <h3 id="ndc-on-track-heading" className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
              Are we on track?
            </h3>
            <div
              className={cn(
                "rounded-lg border p-3",
                headlineOnTrack ? "border-on-track/30 bg-on-track/5" : "border-border bg-muted/30",
              )}
            >
              <p className="text-sm font-medium text-foreground leading-snug">
                {headlineOnTrack
                  ? "All tracked sectors are on track toward 2030 targets."
                  : `${statusCounts.offTrack + statusCounts.atRisk} of ${sectorRows.length} sectors need attention.`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <HeadlinePill
                  onTrack={statusCounts.onTrack}
                  atRisk={statusCounts.atRisk}
                  offTrack={statusCounts.offTrack}
                />
              </div>
            </div>

            <ul className="mt-3 space-y-1.5">
              {sectorRows.map((row) => (
                <li key={row.apiSector}>
                  <SectorStatusRow row={row} onSelectSector={onSelectSector} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="ndc-priorities-heading">
            <h3 id="ndc-priorities-heading" className="text-xs font-semibold uppercase tracking-wide text-foreground mb-2">
              What should we prioritise?
            </h3>
            <p className="text-[11px] text-muted-foreground mb-2">
              Top mitigation priorities ranked by delivery status and 2030 gap.
            </p>
            {priorities.length === 0 ? (
              <div className="rounded-lg border border-on-track/30 bg-on-track/5 p-3 flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-on-track shrink-0" />
                No urgent sector priorities — maintain current delivery pace.
              </div>
            ) : (
              <ol className="space-y-2">
                {priorities.map((row, idx) => (
                  <li key={row.apiSector}>
                    <PriorityCard row={row} rank={idx + 1} onSelectSector={onSelectSector} />
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary" className="h-8 text-xs gap-1">
                <Link to="/dashboard">
                  Open sector dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                <Link to="/climate-finance">
                  Climate finance view
                  <TrendingDown className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function DataModeBadge({ live }: { live: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] h-5 shrink-0",
        live ? "text-on-track border-on-track/30" : "text-muted-foreground border-border",
      )}
    >
      {live ? "Live · Climate TRACE" : "Indicative · fallback data"}
    </Badge>
  );
}

function HeadlinePill({
  onTrack,
  atRisk,
  offTrack,
  compact,
}: {
  onTrack: number;
  atRisk: number;
  offTrack: number;
  compact?: boolean;
}) {
  const items = [
    { label: "On track", value: onTrack, icon: CheckCircle2, cls: "text-on-track" },
    { label: "At risk", value: atRisk, icon: AlertTriangle, cls: "text-muted-foreground" },
    { label: "Off track", value: offTrack, icon: TrendingDown, cls: "text-off-track" },
  ];
  return (
    <>
      {items.map(({ label, value, icon: Icon, cls }) => (
        <span
          key={label}
          className={cn(
            "inline-flex items-center gap-1 rounded border border-border bg-background",
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
          )}
        >
          <Icon className={cn("shrink-0", cls, compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
          <span className="text-muted-foreground">{label}</span>
          <span className={cn("font-bold tabular-nums", cls)}>{value}</span>
        </span>
      ))}
    </>
  );
}

function SectorStatusRow({
  row,
  onSelectSector,
}: {
  row: SectorRow;
  onSelectSector?: (sectorId: SectorId) => void;
}) {
  const content = (
    <>
      <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[row.status])} />
      <span className="font-medium text-foreground truncate">{row.name}</span>
      <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shrink-0", STATUS_CLS[row.status])}>
        {STATUS_LABEL[row.status]}
      </Badge>
      {row.progressPct != null && (
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
          {row.progressPct}%
        </span>
      )}
      <ModeChip mode={row.dataMode} />
    </>
  );

  const className =
    "flex flex-wrap items-center gap-1.5 w-full text-left text-xs rounded-md border border-transparent hover:border-primary/30 hover:bg-primary/5 px-2 py-1.5 transition-colors group";

  if (onSelectSector) {
    return (
      <button type="button" className={className} onClick={() => onSelectSector(row.sectorId)}>
        {content}
        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary ml-auto shrink-0" />
      </button>
    );
  }

  return (
    <Link to={`/dashboard?sector=${row.sectorId}`} className={className}>
      {content}
      <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary ml-auto shrink-0" />
    </Link>
  );
}

function PriorityCard({
  row,
  rank,
  onSelectSector,
}: {
  row: SectorRow;
  rank: number;
  onSelectSector?: (sectorId: SectorId) => void;
}) {
  const dashboardTo = `/dashboard?sector=${row.sectorId}`;
  const inner = (
    <div className="flex items-start gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{row.name}</span>
          <Badge variant="outline" className={cn("text-[9px] h-4 px-1", STATUS_CLS[row.status])}>
            {STATUS_LABEL[row.status]}
          </Badge>
          <ModeChip mode={row.dataMode} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {row.gapMt != null && row.gapMt > 0
            ? `${row.gapMt.toFixed(1)} MtCO₂e gap to 2030 target`
            : row.progressPct != null
              ? `${row.progressPct}% progress toward NDC trajectory`
              : "Progress data limited — review sector dashboard"}
        </p>
        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
          View sector
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );

  const className =
    "block w-full rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors text-left";

  if (onSelectSector) {
    return (
      <button type="button" className={className} onClick={() => onSelectSector(row.sectorId)}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={dashboardTo} className={className}>
      {inner}
    </Link>
  );
}

function PriorityChip({
  row,
  onSelectSector,
  compact,
}: {
  row: SectorRow;
  onSelectSector?: (sectorId: SectorId) => void;
  compact?: boolean;
}) {
  const label = row.name;
  const cls = cn(
    "inline-flex items-center gap-1 rounded border transition-colors shrink-0",
    STATUS_CLS[row.status],
    compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
    "hover:opacity-90",
  );

  if (onSelectSector) {
    return (
      <button type="button" className={cls} onClick={() => onSelectSector(row.sectorId)}>
        {label}
        <ChevronRight className="h-2.5 w-2.5" />
      </button>
    );
  }

  return (
    <Link to={`/dashboard?sector=${row.sectorId}`} className={cls}>
      {label}
      <ChevronRight className="h-2.5 w-2.5" />
    </Link>
  );
}

function ModeChip({ mode }: { mode: "live" | "indicative" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[8px] h-3.5 px-1 font-normal leading-none",
        mode === "live" ? "text-on-track border-on-track/30" : "text-muted-foreground border-border",
      )}
      title={mode === "live" ? "Observed Climate TRACE data" : "Catalog or fallback estimates"}
    >
      {mode === "live" ? "Live" : "Indicative"}
    </Badge>
  );
}

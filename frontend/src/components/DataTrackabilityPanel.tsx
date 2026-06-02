import { useQuery } from "@tanstack/react-query";
import { emissionsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, MinusCircle, Loader2, AlertCircle, Satellite } from "lucide-react";

const STALE_MS = 60 * 60 * 1000;

function titleize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Surfaces the multi-country measurable-variable foundation: which NDC variables
 * Climate TRACE can measure directly (and from which sectors) vs which need
 * national / EO statistics. Backed by GET /api/v1/emissions/trackability.
 */
export function DataTrackabilityPanel({ country = "UGA" }: { country?: string }) {
  const query = useQuery({
    queryKey: ["emissions", "trackability", country],
    queryFn: () => emissionsApi.trackability(country),
    staleTime: STALE_MS,
    retry: 1,
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading trackability…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-xs">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" /> Could not load trackability data.
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const data = query.data;
  const trackable = data.variables.filter((v) => v.trackable);
  const notTrackable = data.variables.filter((v) => !v.trackable);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 text-[10px] h-5">
            <Satellite className="h-2.5 w-2.5" />
            {data.country_name}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {trackable.length} of {data.variables.length} variables measurable directly from Climate TRACE
          </span>
        </div>
      </div>

      {/* NDC targets for this country */}
      <div className="px-4 py-3 border-b border-border">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          NDC sector targets ({data.country})
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Sector</th>
              <th className="py-1 font-medium text-right">Reduction</th>
              <th className="py-1 font-medium text-right">{data.targets[0]?.target_year ?? "Target"}</th>
              <th className="py-1 font-medium text-right">Climate TRACE</th>
            </tr>
          </thead>
          <tbody>
            {data.targets.map((t) => (
              <tr key={t.sector} className="border-t border-border/60">
                <td className="py-1 font-medium">{t.label}</td>
                <td className="py-1 text-right tabular-nums">
                  {t.reduction_pct != null ? `${t.reduction_pct}%` : "—"}
                </td>
                <td className="py-1 text-right font-mono tabular-nums">
                  {t.target} {t.unit}
                </td>
                <td className="py-1 text-right">
                  {t.climate_trace_trackable ? (
                    <Badge variant="outline" className="gap-1 text-[10px] h-5 border-primary/40 text-primary">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Tracked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px] h-5 text-muted-foreground">
                      <MinusCircle className="h-2.5 w-2.5" /> National data
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Variable catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="px-4 py-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Measurable from Climate TRACE
          </h4>
          <ul className="space-y-2">
            {trackable.map((v) => (
              <li key={v.id} className="text-xs">
                <div className="font-medium">{v.label}</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {v.sector_slugs.map((s) => (
                    <span key={s} className={cn("text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground")}>
                      {titleize(s)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 py-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <MinusCircle className="h-3.5 w-3.5" /> Needs national / EO statistics
          </h4>
          <ul className="space-y-2">
            {notTrackable.map((v) => (
              <li key={v.id} className="text-xs">
                <div className="font-medium">{v.label}</div>
                {v.note && <div className="text-[10px] text-muted-foreground mt-0.5">{v.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground mt-auto">
        Foundation for multi-country NDC tracking: each country parameterizes the same measurable variables
        (e.g. Uganda 22% forestry reduction; another country might pick 30%). Data: Climate TRACE, CC BY 4.0.
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Copy, Download, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { emissionsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface AccuracyAuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccuracyAuditDrawer({ open, onOpenChange }: AccuracyAuditDrawerProps) {
  const {
    reconciliation,
    dashboard,
    dashboardLastRefreshIso,
    geography,
    districtName,
  } = useEmissionsData();

  const gadmId = dashboard?.gadm_id ?? (geography === "national" ? "UGA" : undefined);

  const spatialQ = useQuery({
    queryKey: ["emissions", "spatial-confidence", gadmId, districtName],
    queryFn: () =>
      emissionsApi.spatialConfidence(
        geography === "district"
          ? { district: districtName ?? undefined, gadmId: gadmId ?? undefined }
          : {},
      ),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const auditPayload = useMemo(() => {
    return {
      gas: dashboard?.gas ?? "co2e_100yr",
      inventory_year: dashboard?.inventory_year ?? null,
      geography: dashboard?.geography ?? geography,
      gadm_id: dashboard?.gadm_id ?? gadmId ?? "UGA",
      district_name: dashboard?.district_name ?? districtName ?? null,
      since: dashboard?.since ?? null,
      to: dashboard?.to ?? null,
      last_refresh_iso: dashboardLastRefreshIso,
      data_source: dashboard?.data_source ?? null,
      reconciliation: reconciliation ?? null,
      spatial_confidence: spatialQ.data ?? null,
    };
  }, [
    dashboard,
    reconciliation,
    dashboardLastRefreshIso,
    geography,
    gadmId,
    districtName,
    spatialQ.data,
  ]);

  const [copied, setCopied] = useState(false);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(auditPayload, null, 2));
      setCopied(true);
      toast.success("Accuracy audit JSON copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(auditPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ndc-accuracy-audit-${auditPayload.gadm_id}-${auditPayload.inventory_year ?? "na"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recon = reconciliation;
  const slugEntries = Object.entries(recon?.slug_breakdown ?? {}).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border text-left space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <SheetTitle className="text-sm">Accuracy audit</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Climate TRACE reconciliation for partners — compare country total, slug sum, and UI
            sector buckets without leaving the dashboard.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 text-xs">
            <section className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Request fingerprint
              </h4>
              <MonoRow label="Gas" value={String(auditPayload.gas)} />
              <MonoRow label="GADM" value={String(auditPayload.gadm_id)} />
              <MonoRow
                label="Years"
                value={
                  auditPayload.since != null && auditPayload.to != null
                    ? `${auditPayload.since}–${auditPayload.to}`
                    : "—"
                }
              />
              <MonoRow
                label="Inventory year"
                value={auditPayload.inventory_year != null ? String(auditPayload.inventory_year) : "—"}
              />
              <MonoRow
                label="Updated"
                value={
                  dashboardLastRefreshIso
                    ? new Date(dashboardLastRefreshIso).toLocaleString("en-UG")
                    : "—"
                }
              />
            </section>

            <Separator />

            <section className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Reconciliation
              </h4>
              {!recon ? (
                <p className="text-muted-foreground">
                  Reconciliation is available for national geography when live Climate TRACE data
                  loads.
                </p>
              ) : (
                <>
                  <MonoRow label="Reference year" value={String(recon.reference_year)} />
                  <MonoRow
                    label="Country total"
                    value={fmtMt(recon.country_total_mt)}
                  />
                  <MonoRow label="Slug sum" value={fmtMt(recon.sector_sum_mt)} />
                  <MonoRow label="UI sector sum" value={fmtMt(recon.ui_sector_sum_mt)} />
                  <MonoRow
                    label="Δ (country − slug)"
                    value={
                      recon.delta_mt == null
                        ? "—"
                        : `${recon.delta_mt > 0 ? "+" : ""}${recon.delta_mt.toFixed(2)} Mt`
                    }
                  />
                  {recon.note && (
                    <p className="text-muted-foreground leading-relaxed pt-1">{recon.note}</p>
                  )}
                  {(recon.missing_slugs?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-muted-foreground w-full">Missing slugs</span>
                      {recon.missing_slugs.map((s) => (
                        <Badge key={s} variant="outline" className="text-[9px] h-5 font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(recon.unmapped_slugs?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-muted-foreground w-full">Unmapped (not in UI buckets)</span>
                      {recon.unmapped_slugs.map((s) => (
                        <Badge key={s} variant="outline" className="text-[9px] h-5 font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <Separator />

            <section className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Per-slug Mt breakdown
              </h4>
              {slugEntries.length === 0 ? (
                <p className="text-muted-foreground">No slug breakdown on this payload.</p>
              ) : (
                <ul className="space-y-1">
                  {slugEntries.map(([slug, mt]) => (
                    <li
                      key={slug}
                      className="flex justify-between gap-2 font-mono text-[10px] border-b border-border/60 py-0.5"
                    >
                      <span className="truncate text-muted-foreground">{slug}</span>
                      <span className="shrink-0 text-foreground">{mt == null ? "—" : mt.toFixed(3)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Separator />

            <section className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Spatial certainty
              </h4>
              {spatialQ.isLoading && (
                <p className="text-muted-foreground">Loading spatial confidence…</p>
              )}
              {spatialQ.error && (
                <p className="text-muted-foreground">Spatial confidence unavailable.</p>
              )}
              {spatialQ.data && (
                <>
                  <MonoRow
                    label="Located share"
                    value={
                      spatialQ.data.certain_pct != null
                        ? `${Number(spatialQ.data.certain_pct).toFixed(1)}%`
                        : "—"
                    }
                  />
                  <MonoRow
                    label="Geography"
                    value={String(spatialQ.data.geography ?? auditPayload.geography ?? "—")}
                  />
                  <p className="text-muted-foreground leading-relaxed">
                    Named sources do not sum to the dashboard total — spatially uncertain emissions
                    remain in the country/sector total.
                  </p>
                </>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={copyJson}>
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy JSON"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={downloadJson}>
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function fmtMt(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(2)} Mt`;
}

function MonoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0 w-[120px]">{label}</span>
      <code className="text-[10px] font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded break-all">
        {value}
      </code>
    </div>
  );
}

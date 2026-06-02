/**
 * NDC dashboard exports driven by live Climate TRACE data (with mock fallback).
 *
 * Unlike the legacy lib/export.ts (which always uses bundled climate-data
 * sectors), these functions read the live EmissionsDataContext so exports
 * reflect whatever is currently on screen — including the selected geography
 * (national vs a specific district).
 */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ndcTargets, sectorDefinitions, type NDCTarget } from "@/data/uganda-ndc-data";
import { listAllActivities } from "@/lib/activities-store";
import type { EmissionsDataContextValue } from "@/context/EmissionsDataContext";

/** Minimal slice of the emissions context the exporters need. */
export type NdcExportContext = Pick<
  EmissionsDataContextValue,
  "dashboard" | "geography" | "districtName" | "getProgressForTarget" | "getObservedMode"
>;

const STATUS_LABEL: Record<string, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  "off-track": "Off Track",
  unknown: "Unknown",
};

function sectorName(sectorId: string): string {
  return sectorDefinitions.find((s) => s.id === sectorId)?.name ?? sectorId;
}

function geographyLabel(ctx: NdcExportContext): string {
  return ctx.geography === "district" && ctx.districtName
    ? `${ctx.districtName} (district)`
    : "Uganda (national)";
}

function fileSlug(ctx: NdcExportContext): string {
  const geo = ctx.geography === "district" && ctx.districtName ? ctx.districtName : "National";
  return geo.replace(/[^a-z0-9]+/gi, "_");
}

interface TargetRow {
  targetId: string;
  sector: string;
  targetText: string;
  baseline: string;
  baselineYear: number;
  target: string;
  targetYear: number;
  unit: string;
  latestObserved: number | null;
  progressPct: number | null;
  status: string;
  observedMode: "live" | "mock";
}

function buildTargetRows(ctx: NdcExportContext): TargetRow[] {
  return ndcTargets.map((t: NDCTarget) => {
    const { percent, status } = ctx.getProgressForTarget(t);
    return {
      targetId: t.id,
      sector: sectorName(t.sectorId),
      targetText: t.targetText,
      baseline: String(t.baselineValue),
      baselineYear: t.baselineYear,
      target: String(t.targetValue),
      targetYear: t.targetYear,
      unit: t.unit,
      latestObserved: null,
      progressPct: percent,
      status: STATUS_LABEL[status] ?? status,
      observedMode: ctx.getObservedMode(t),
    };
  });
}

/** Excel workbook: NDC targets + observed sector totals + captured activities. */
export function exportNdcDashboardExcel(ctx: NdcExportContext) {
  const wb = XLSX.utils.book_new();
  const geo = geographyLabel(ctx);
  const generated = new Date().toISOString();

  const targetRows = buildTargetRows(ctx).map((r) => ({
    Geography: geo,
    "Target ID": r.targetId,
    Sector: r.sector,
    Target: r.targetText,
    Baseline: r.baseline,
    "Baseline Year": r.baselineYear,
    "Target Value": r.target,
    "Target Year": r.targetYear,
    Unit: r.unit,
    "Progress (%)": r.progressPct ?? "—",
    Status: r.status,
    "Observed Source": r.observedMode === "live" ? "Climate TRACE (live)" : "Bundled (mock)",
  }));
  const wsTargets = XLSX.utils.json_to_sheet(targetRows);
  wsTargets["!cols"] = [
    { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 50 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTargets, "NDC Targets");

  const d = ctx.dashboard;
  if (d?.sectors) {
    const sectorRows = Object.entries(d.sectors).map(([sector, s]) => ({
      Geography: geo,
      Sector: sector,
      "Latest Year": s?.latest_year ?? "—",
      "Observed (MtCO2e)": s?.latest_value ?? "—",
      Status: s?.status ?? "unknown",
      "Progress (%)": s?.progress_pct ?? "—",
    }));
    const wsSectors = XLSX.utils.json_to_sheet(sectorRows);
    XLSX.utils.book_append_sheet(wb, wsSectors, "Observed Sectors");
  }

  const activities = listAllActivities();
  if (activities.length) {
    const actRows = activities.map((a) => ({
      Title: a.title,
      Status: a.status,
      Workflow: a.workflow_state,
      Ministry: a.ministry ?? "—",
      Districts: a.districts.join("; "),
      Start: a.timeframe_start ?? "—",
      End: a.timeframe_end ?? "—",
    }));
    const wsAct = XLSX.utils.json_to_sheet(actRows);
    XLSX.utils.book_append_sheet(wb, wsAct, "Activities");
  }

  const wsMeta = XLSX.utils.json_to_sheet([
    { Field: "Geography", Value: geo },
    { Field: "Data source", Value: d?.data_source ?? "Climate TRACE" },
    { Field: "Inventory year", Value: d?.inventory_year ?? "—" },
    { Field: "Generated", Value: generated },
    { Field: "Note", Value: "NDC targets are national; district views show observed emissions for context only." },
  ]);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Provenance");

  XLSX.writeFile(wb, `NDC_Dashboard_${fileSlug(ctx)}.xlsx`);
}

/** Compact PDF summary of NDC targets for the current geography. */
export function exportNdcDashboardPdf(ctx: NdcExportContext) {
  const doc = new jsPDF();
  const geo = geographyLabel(ctx);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Uganda NDC Dashboard", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Geography: ${geo}`, 14, 25);
  doc.text(
    `Source: ${ctx.dashboard?.data_source ?? "Climate TRACE"} · Generated ${new Date().toLocaleDateString()}`,
    14,
    31,
  );

  const rows = buildTargetRows(ctx).map((r) => [
    r.sector,
    r.targetId,
    `${r.baseline} → ${r.target} ${r.unit}`,
    r.progressPct != null ? `${r.progressPct}%` : "—",
    r.status,
    r.observedMode === "live" ? "Live" : "Mock",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["Sector", "Target", "Baseline → Target", "Progress", "Status", "Obs."]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 60, 50], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 245] },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    ctx.geography === "district"
      ? "District observed emissions shown for context. NDC progress is scored nationally only."
      : "Progress compares Climate TRACE observed emissions to national NDC baselines/targets.",
    14,
    afterTable,
  );

  doc.save(`NDC_Dashboard_${fileSlug(ctx)}.pdf`);
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CRT/BTR-style CSV for biennial transparency reporting preparation.
 * NOTE: This is an illustrative layout to support BTR prep — it is NOT a
 * UNFCCC ETF-validated Common Reporting Table.
 */
export function exportCrtBtrCsv(ctx: NdcExportContext) {
  const geo = geographyLabel(ctx);
  const generated = new Date().toISOString();
  const headers = [
    "country",
    "geography",
    "target_id",
    "sector",
    "target_description",
    "baseline_value",
    "baseline_year",
    "target_value",
    "target_year",
    "unit",
    "latest_observed",
    "progress_pct",
    "status",
    "observed_source",
    "data_source",
    "generated_at",
  ];

  const dataSource = ctx.dashboard?.data_source ?? "Climate TRACE";
  const rows = buildTargetRows(ctx).map((r) => [
    "Uganda",
    geo,
    r.targetId,
    r.sector,
    r.targetText,
    r.baseline,
    r.baselineYear,
    r.target,
    r.targetYear,
    r.unit,
    r.latestObserved ?? "",
    r.progressPct ?? "",
    r.status,
    r.observedMode === "live" ? "Climate TRACE (live)" : "Bundled (mock)",
    dataSource,
    generated,
  ]);

  const preamble = `# Illustrative CRT/BTR layout for biennial reporting prep — NOT a UNFCCC ETF-validated Common Reporting Table.\n# Geography: ${geo}\n`;
  const csv =
    preamble +
    [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CRT_BTR_${fileSlug(ctx)}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Evidence Pack export — CSV + PDF for parliament/funders.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type Indicator, confidenceScore, STRATEGY_LABEL } from "@/data/indicator-registry";
import { runAllRules } from "@/data/qa-rulebook";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportEvidencePackCSV(indicators: Indicator[]) {
  const headers = [
    "id","strategy","sector","objective","indicator","unit","baseline_value","baseline_year",
    "target_2025","target_2030","target_2040","target_year_primary",
    "data_source","data_owner","update_frequency","last_update_date",
    "validation_status","confidence_score","qa_flags","policy_alignment_tags","atms",
  ];
  const rows = indicators.map(i => {
    const flags = runAllRules(i);
    return [
      i.id, i.strategy, i.sector_or_programme, i.objective_or_outcome, i.indicator_name, i.unit,
      i.baseline_value ?? "", i.baseline_year ?? "",
      i.target_value_2025 ?? "", i.target_value_2030 ?? "", i.target_value_2040 ?? "", i.target_year_primary,
      i.data_source ?? "", i.data_owner ?? "", i.update_frequency ?? "", i.last_update_date ?? "",
      i.validation_status, confidenceScore(i),
      flags.map(f => `[${f.severity}] ${f.message}`).join(" | "),
      i.policy_alignment_tags.join("|"), i.atms ?? "",
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Evidence_Pack_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export async function exportEvidencePackPDF(indicators: Indicator[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 32;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(30, 60, 50);
  doc.text("Uganda NDC Data Explorer — Evidence Pack", margin, 40);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,100,100);
  doc.text(`Generated ${new Date().toISOString().slice(0,16).replace("T"," ")} · ${indicators.length} indicators in scope`, margin, 56);

  // Group by strategy
  for (const strat of ["NDPIV","TENFOLD","NDC"] as const) {
    const subset = indicators.filter(i => i.strategy === strat);
    if (subset.length === 0) continue;
    const startY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 70;
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(30, 60, 50);
    doc.text(STRATEGY_LABEL[strat], margin, startY + 20);
    autoTable(doc, {
      startY: startY + 26,
      head: [["Indicator","Sector","Unit","Baseline","Target 2030","Source","Owner","Updated","Validation","Conf"]],
      body: subset.map(i => [
        i.indicator_name, i.sector_or_programme, i.unit,
        i.baseline_value ?? "—",
        i.target_value_2030 ?? i.target_value_2025 ?? i.target_value_2040 ?? "—",
        i.data_source ?? "—", i.data_owner ?? "—", i.last_update_date ?? "—",
        i.validation_status, confidenceScore(i),
      ]),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [30, 60, 50], textColor: 255, fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 248, 245] },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { cellWidth: 160 } },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica","italic"); doc.setFontSize(7); doc.setTextColor(140,140,140);
    doc.text(`Uganda NDC Data Explorer · Evidence Pack · p. ${p}/${pages}`, margin, doc.internal.pageSize.getHeight() - 16);
    doc.text(`${pageWidth}`, 0, 0); // no-op to silence unused
  }
  doc.save(`Evidence_Pack_${new Date().toISOString().slice(0,10)}.pdf`);
}

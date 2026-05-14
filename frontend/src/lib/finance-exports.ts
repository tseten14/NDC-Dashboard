// Finance & Investment exports — Investment Note (per indicator) + Minister one-pager.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type Indicator, confidenceScore, deliveryConfidence, getById, indicatorRegistry, whatMustChangeNow } from "@/data/indicator-registry";

function heading(doc: jsPDF, y: number, text: string, margin: number, contentWidth: number): number {
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 60, 50);
  doc.text(text, margin, y); y += 6;
  doc.setDrawColor(30, 60, 50); doc.setLineWidth(0.6); doc.line(margin, y, margin + contentWidth, y);
  return y + 12;
}

function body(doc: jsPDF, y: number, text: string, margin: number, contentWidth: number): number {
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text, contentWidth);
  doc.text(lines, margin, y);
  return y + lines.length * 12 + 6;
}

export async function exportInvestmentNoteFromIndicator(ind: Indicator) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Title
  doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.setTextColor(30, 60, 50);
  doc.text("Investment Note", margin, y); y += 18;
  doc.setFontSize(12); doc.setTextColor(50, 50, 50);
  const t = doc.splitTextToSize(ind.indicator_name, contentWidth);
  doc.text(t, margin, y); y += t.length * 14 + 4;
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(110, 110, 110);
  doc.text(`Generated ${new Date().toLocaleDateString()} · ${ind.strategy} · ${ind.sector_or_programme}`, margin, y); y += 16;
  doc.setTextColor(0, 0, 0);

  y = heading(doc, y, "1. Policy & Development Rationale", margin, contentWidth);
  y = body(doc, y,
    `This note describes the investment case for indicator "${ind.indicator_name}" within Uganda's ${ind.strategy} framework, sector ${ind.sector_or_programme}, objective: ${ind.objective_or_outcome}. The intervention contributes to multiple national strategies: ${ind.policy_alignment_tags.join(", ")}.`,
    margin, contentWidth);

  y = heading(doc, y, "2. Quantified Outcomes", margin, contentWidth);
  autoTable(doc, {
    startY: y,
    head: [["Year", "Value", "Unit"]],
    body: [
      ["Baseline " + (ind.baseline_year ?? ""), ind.baseline_value ?? "—", ind.unit],
      ["Target 2025", ind.target_value_2025 ?? "—", ind.unit],
      ["Target 2030", ind.target_value_2030 ?? "—", ind.unit],
      ["Target 2040", ind.target_value_2040 ?? "—", ind.unit],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 60, 50], textColor: 255 },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  y = heading(doc, y, "3. Strategy Alignment", margin, contentWidth);
  y = body(doc, y, `Aligned to: ${ind.policy_alignment_tags.join(", ")}.${ind.atms ? ` Tenfold ATMS anchor: ${ind.atms}.` : ""} Political salience tier: ${ind.political_salience ?? 1}/3.`, margin, contentWidth);

  y = heading(doc, y, "4. MRV & Integrity", margin, contentWidth);
  y = body(doc, y, `Source: ${ind.data_source ?? "TBD"}. Owner: ${ind.data_owner ?? "TBD"}. Update frequency: ${ind.update_frequency ?? "TBD"}. Validation status: ${ind.validation_status}. Confidence score: ${confidenceScore(ind)}/100.`, margin, contentWidth);

  y = heading(doc, y, "5. Article 6 Readiness & Finance Hooks", margin, contentWidth);
  const cond = ind.conditionality ?? "Mixed";
  const instr = (ind.potential_instruments ?? ["grants","concessional"]).join(", ");
  y = body(doc, y, `Conditionality: ${cond}. Potential instruments: ${instr}. ${ind.strategy === "NDC" ? "Article 6 emerges as supplementary upside; the intervention is justified on national development value alone." : "Where mitigation co-benefits exist, Article 6.2 cooperative approaches may apply."}`, margin, contentWidth);

  y = heading(doc, y, "6. Why This Is Investable", margin, contentWidth);
  y = body(doc, y, "• Anchored in published national strategy with explicit baseline and target.", margin, contentWidth);
  y = body(doc, y, "• Owner and data source identified, enabling MRV and disbursement-linked finance.", margin, contentWidth);
  y = body(doc, y, "• Alignment with multiple strategies reduces political risk and broadens investor appeal.", margin, contentWidth);
  y = body(doc, y, "• Suitable for blending public budget, concessional finance and (where applicable) carbon-related revenues.", margin, contentWidth);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text(`Uganda NDC Data Explorer · Investment Note · ${ind.id} · p. ${p}/${pages}`, margin, doc.internal.pageSize.getHeight() - 18);
  }

  const safe = ind.indicator_name.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  doc.save(`Investment_Note_${safe}.pdf`);
}

export async function exportMinisterBrief(scope: Indicator[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.setTextColor(30, 60, 50);
  doc.text("Minister Brief — Uganda NDC Data Explorer", margin, y); y += 18;
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(110, 110, 110);
  doc.text(`Generated ${new Date().toLocaleDateString()} · One-page executive summary`, margin, y); y += 18;
  doc.setTextColor(0, 0, 0);

  // 4 tiles row (text only)
  const conf = deliveryConfidence(scope);
  const inc = getById("NDPIV-INC-02"); const cap = getById("NDPIV-O4-05"); const tgt = getById("NDC-MIT-TGT");
  const tiles = [
    ["Wealth Creation", `Income/capita target FY29/30: USD ${inc?.target_value_2030?.toLocaleString() ?? "—"} (baseline ${inc?.baseline_value?.toLocaleString() ?? "—"})`],
    ["Productive Capacity", `Energy capacity target 2030: ${cap?.target_value_2030?.toLocaleString() ?? "—"} MW (baseline ${cap?.baseline_value?.toLocaleString() ?? "—"})`],
    ["Emissions Trajectory", `2030 target: ${tgt?.target_value_2030 ?? "—"} MtCO₂e — 24.7% below BAU 148.8 MtCO₂e`],
    ["Delivery Confidence", `${conf.pct}% — ${conf.trackable}/${conf.total} indicators trackable`],
  ];
  autoTable(doc, {
    startY: y,
    body: tiles,
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 130, fillColor: [240, 246, 240] } },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // Top 10 indicators
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(30, 60, 50);
  doc.text("Top 10 indicators in scope", margin, y); y += 6;
  doc.setDrawColor(30, 60, 50); doc.line(margin, y, margin + contentWidth, y); y += 8;
  const top10 = [...scope].sort((a, b) => (b.political_salience ?? 1) - (a.political_salience ?? 1)).slice(0, 10);
  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Strategy", "Baseline", "Target", "Validation", "Conf"]],
    body: top10.map(i => [
      i.indicator_name, i.strategy,
      `${i.baseline_value ?? "—"} ${i.unit}`,
      `${i.target_value_2030 ?? i.target_value_2025 ?? i.target_value_2040 ?? "—"} ${i.unit}`,
      i.validation_status,
      confidenceScore(i),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 60, 50], textColor: 255 },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // What must change now
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(30, 60, 50);
  doc.text("What must change now", margin, y); y += 6;
  doc.setDrawColor(30, 60, 50); doc.line(margin, y, margin + contentWidth, y); y += 8;
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(0,0,0);
  whatMustChangeNow(5).forEach(i => {
    const line = `• ${i.indicator_name} (${i.strategy}) — ${i.validation_status}, confidence ${confidenceScore(i)}/100.`;
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y); y += wrapped.length * 11;
  });
  y += 6;

  // Confidence note
  doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text("Indicators with status Missing are excluded from progress and confidence calculations.", margin, y);

  // Footer
  doc.setTextColor(140, 140, 140);
  doc.text(`Uganda NDC Data Explorer · Minister one-pager · ${new Date().toISOString().slice(0,10)}`, margin, doc.internal.pageSize.getHeight() - 16);

  doc.save(`Minister_Brief_${new Date().toISOString().slice(0,10)}.pdf`);
}

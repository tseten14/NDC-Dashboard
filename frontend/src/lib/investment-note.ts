/**
 * Builds a one-page investment note.
 *
 * Pulls a target's figures, its strategy alignment and its funding gap into a
 * single PDF summary for funders.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type CausalChain, getIndicator, indicatorsTouchedByChain, ndcTargetsTouchedByChain, indicatorTypeLabel, mrvMethodLabel } from "@/data/uganda-v2-data";

/* Generates a 6-section investment-grade memo from a causal chain.
   Sections: Rationale · Intervention Logic · Alignment · MRV · Article 6 · Why Investable */

export async function exportInvestmentNote(chain: CausalChain) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const indicators = indicatorsTouchedByChain(chain);
  const targets = ndcTargetsTouchedByChain(chain);
  const mrvStack = Array.from(new Set(chain.steps.map(s => s.mrv_method)));

  const ensureSpace = (need: number) => {
    if (y + need > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
  };

  const heading = (text: string) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 60, 50);
    doc.text(text, margin, y); y += 6;
    doc.setDrawColor(30, 60, 50); doc.setLineWidth(0.6); doc.line(margin, y, margin + contentWidth, y);
    y += 12; doc.setTextColor(0, 0, 0);
  };

  const body = (text: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * 12 + 4);
    doc.text(lines, margin, y); y += lines.length * 12 + 6;
  };

  // Title
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(30, 60, 50);
  doc.text("Investment Note", margin, y); y += 18;
  doc.setFontSize(12); doc.setTextColor(50, 50, 50);
  const titleLines = doc.splitTextToSize(chain.title, contentWidth);
  doc.text(titleLines, margin, y); y += titleLines.length * 14 + 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(110, 110, 110);
  doc.text(`Generated ${new Date().toLocaleDateString()} · Uganda Integrated NDC–Development Explorer`, margin, y); y += 16;
  doc.setTextColor(0, 0, 0);

  // 1. Rationale
  heading("1. Policy & Development Rationale");
  body(`This memo describes the development logic and investment case for an intervention triggered in the ${chain.trigger_intervention.sector} sector: "${chain.trigger_intervention.intervention_type}". The intervention is positioned to deliver outcomes across Uganda's NDC, NDP-IV programmes, and Tenfold Growth Strategy anchors. Policy question addressed: ${chain.answers_policy_question}`);

  // 2. Intervention Logic
  heading("2. Intervention Logic (Causal Chain)");
  const chainNarrative = chain.steps.map(s => `Step ${s.step}: ${s.effect}`).join(" → ");
  body(chainNarrative);
  ensureSpace(40);
  autoTable(doc, {
    startY: y,
    head: [["#", "Effect", "Indicator", "Type", "MRV"]],
    body: chain.steps.map(s => {
      const ind = getIndicator(s.indicator_id);
      return [String(s.step), s.effect, ind?.indicator_name ?? s.indicator_id, indicatorTypeLabel[s.indicator_type], mrvMethodLabel[s.mrv_method]];
    }),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 60, 50], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // 3. Alignment
  heading("3. NDC, NDP-IV & Tenfold Alignment");
  if (targets.length > 0) {
    body("NDC targets directly contributed to:");
    targets.forEach(t => body(`  • [${t.sector}] ${t.target_description}`));
  } else {
    body("No NDC target directly linked; intervention contributes via cross-sectoral co-benefits.");
  }
  const programmes = Array.from(new Set(indicators.map(i => i.ndp_alignment.programme_id)));
  body(`NDP-IV programmes engaged: ${programmes.join(", ") || "None"}.`);
  const anchors = Array.from(new Set(indicators.map(i => i.tenfold_alignment.anchor_area)));
  body(`Tenfold anchor areas: ${anchors.join(", ") || "None"}.`);

  // 4. MRV
  heading("4. MRV & Integrity Basis");
  body(`The intervention's integrity rests on a multi-layer MRV stack covering ${indicators.length} indicators across ${mrvStack.length} method type(s).`);
  ensureSpace(40);
  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Type", "MRV method", "Data owner", "Confidence"]],
    body: indicators.map(i => [i.indicator_name, indicatorTypeLabel[i.indicator_type], mrvMethodLabel[i.mrv.mrv_method], i.mrv.data_owner, i.mrv.confidence_level]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [60, 100, 140], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  // 5. Article 6
  heading("5. Article 6 Readiness & Finance Hooks");
  body(chain.article6_hook ?? "Standard Article 6 considerations apply: emissions reductions or removals must be uniquely attributable, additional, and supported by transparent baselines.");
  body("Crucially: Article 6 is framed as an upside, not a prerequisite. The intervention is justified on national development value alone; carbon-related revenue is a supplementary incentive.");

  // 6. Why investable
  heading("6. Why This Is Investable");
  body("• Delivers multiple policy objectives simultaneously across mitigation, adaptation, and economic transformation.");
  body("• Clear theory of change backed by observable indicators with explicit MRV ownership.");
  body("• Suitable for blending public finance, results-based payments, and carbon-related revenues.");
  body("• Strong institutional anchoring through named ministries and data owners reduces execution risk.");

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i); doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text(`Uganda NDC–Development Explorer · Investment Note · ${chain.causal_chain_id} · p. ${i}/${pageCount}`, margin, doc.internal.pageSize.getHeight() - 18);
  }

  const safe = chain.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  doc.save(`Investment_Note_${safe}.pdf`);
}

/**
 * Exports the current view to Excel or PDF.
 *
 * Each file is stamped with what it shows — the geography, the year range and
 * the data source — so that a spreadsheet found later can still be identified.
 */
import { sectors, getProgressPercent, getSectorStatus } from "@/data/climate-data";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel() {
  const data = sectors.map((s) => ({
    Sector: s.name,
    Description: s.description,
    "Baseline (MtCO₂e)": s.baselineEmissions,
    "Current (MtCO₂e)": s.currentEmissions,
    "Target Reduction (%)": s.targetReduction,
    "Progress (%)": getProgressPercent(s),
    Status: getSectorStatus(s),
    "Target Year": s.targetYear,
    Activities: s.activities.length,
    "Total Investment ($M)": s.activities.reduce((sum, a) => sum + a.investment, 0),
    "Total Reduced (MtCO₂e)": s.activities.reduce((sum, a) => sum + a.emissionsReduced, 0),
  }));

  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 18 },
    { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "NDC Overview");

  // Activities sheet
  const actData = sectors.flatMap((s) =>
    s.activities.map((a) => ({
      Sector: s.name,
      Activity: a.name,
      Status: a.status,
      "Investment ($M)": a.investment,
      "Emissions Reduced (MtCO₂e)": a.emissionsReduced,
      "Start Year": a.startYear,
      Description: a.description,
    }))
  );
  const ws2 = XLSX.utils.json_to_sheet(actData);
  XLSX.utils.book_append_sheet(wb, ws2, "Activities");

  // Historical data sheet
  const histData = sectors.flatMap((s) =>
    s.historicalData.map((d) => ({
      Sector: s.name,
      Year: d.year,
      "Emissions (MtCO₂e)": d.emissions,
      "Target (MtCO₂e)": d.target,
    }))
  );
  const ws3 = XLSX.utils.json_to_sheet(histData);
  XLSX.utils.book_append_sheet(wb, ws3, "Historical Data");

  XLSX.writeFile(wb, "NDC_Climate_Dashboard_Export.xlsx");
}

export function exportToPDF() {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("NDC Climate Policy Dashboard", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Key Statistics — Generated ${new Date().toLocaleDateString()}`, 14, 28);
  
  // Line
  doc.setDrawColor(40, 80, 60);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Overall stats
  const totalBaseline = sectors.reduce((s, sec) => s + sec.baselineEmissions, 0);
  const totalCurrent = sectors.reduce((s, sec) => s + sec.currentEmissions, 0);
  const totalReduction = totalBaseline - totalCurrent;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Summary", 14, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total Baseline Emissions: ${totalBaseline} MtCO₂e`, 14, 47);
  doc.text(`Current Total Emissions: ${totalCurrent} MtCO₂e`, 14, 53);
  doc.text(`Total Reduction Achieved: ${totalReduction} MtCO₂e`, 14, 59);
  doc.text(`Number of Sectors: ${sectors.length}`, 14, 65);

  // Table
  const tableData = sectors.map((s) => [
    s.name,
    `${s.baselineEmissions}`,
    `${s.currentEmissions}`,
    `${s.targetReduction}%`,
    `${getProgressPercent(s)}%`,
    getSectorStatus(s).replace("-", " "),
  ]);

  autoTable(doc, {
    startY: 72,
    head: [["Sector", "Baseline", "Current", "Target", "Progress", "Status"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 60, 50], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    columnStyles: {
      5: {
        cellWidth: 22,
        fontStyle: "bold",
      },
    },
  });

  doc.save("NDC_Key_Stats.pdf");
}

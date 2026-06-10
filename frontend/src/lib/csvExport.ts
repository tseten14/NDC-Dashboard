const ROW_COUNT_VALUE_COLUMN = "__row_count__";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV text from cleaned rows; renames internal row-count column for download. */
export function cleanedRowsToCsv(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const hasRowCount = rows.some((r) => ROW_COUNT_VALUE_COLUMN in r);
  const exportHeaders = hasRowCount
    ? [...headers.filter((h) => h !== ROW_COUNT_VALUE_COLUMN), "document_count"]
    : headers;

  const lines = [exportHeaders.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    const out = exportHeaders.map((h) => {
      if (h === "document_count") return escapeCsvCell(row[ROW_COUNT_VALUE_COLUMN] ?? 1);
      return escapeCsvCell(row[h]);
    });
    lines.push(out.join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function cleanedFilename(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "");
  return `${base}-cleaned.csv`;
}

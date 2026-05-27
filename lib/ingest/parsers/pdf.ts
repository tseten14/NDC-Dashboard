import type { TabularParseResult } from "../types.js";

/** PDF uploads are stored for review; tabular observation mapping requires CSV/JSON export. */
export async function parsePdfBuffer(buffer: Buffer, filename: string): Promise<TabularParseResult> {
  let text = "";
  let pages = 0;

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const r = await parser.getText();
      pages = r.total ?? r.pages?.length ?? 0;
      text = (r.text || "").trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch {
    text = "";
  }

  return {
    headers: [],
    rows: [],
    inferredTypes: {},
    rowCount: 0,
    warnings: [
      {
        message:
          pages > 0
            ? `PDF "${filename}" parsed (${pages} page(s), ${text.length} chars) but contains no tabular rows. Export a CSV or JSON file for structured observation import.`
            : `Could not extract tabular data from PDF "${filename}". Upload CSV or JSON for column mapping.`,
      },
    ],
  };
}

import type { TabularParseResult } from "../types.js";
import { extractPdfText, isPdfMagic } from "../pdfExtract.js";
import { buildPdfTextSections } from "../../../services/ingestInsights.js";

/** PDF: extract text + NDC keyword/charts profile (no tabular rows for observation import). */
export async function parsePdfBuffer(buffer: Buffer, filename: string): Promise<TabularParseResult> {
  if (!isPdfMagic(buffer)) {
    return {
      headers: [],
      rows: [],
      inferredTypes: {},
      rowCount: 0,
      warnings: [
        {
          message: `File "${filename}" is not a valid PDF (missing %PDF- header).`,
        },
      ],
    };
  }

  try {
    const { text, pages, source } = await extractPdfText(buffer);
    if (!text) {
      return {
        headers: [],
        rows: [],
        inferredTypes: {},
        rowCount: 0,
        warnings: [
          {
            message: `PDF "${filename}" has no extractable text (scanned/image PDFs need OCR). Upload CSV or JSON for structured import.`,
          },
        ],
      };
    }

    const sections = buildPdfTextSections(text, filename);
    const warnings: TabularParseResult["warnings"] = [
      {
        message: `PDF parsed (${pages} page(s), ${text.length.toLocaleString()} chars). Charts below summarize detected sectors, years, and figures. For observation import, also provide CSV or JSON with year/value columns.`,
      },
    ];
    if (source === "pdfjs-dist-fallback") {
      warnings.push({ message: "PDF parsed via fallback engine; layout may be approximate." });
    }
    if (pages > 50) {
      warnings.push({ message: `Large PDF (${pages} pages); analysis uses extracted text only.` });
    }

    return {
      headers: [],
      rows: [],
      inferredTypes: {},
      rowCount: 0,
      warnings,
      pdfInsights: {
        pages,
        chars: text.length,
        parseEngine: source,
        about: sections.about,
        analysis: sections.analysis,
        recommendations: sections.recommendations,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      headers: [],
      rows: [],
      inferredTypes: {},
      rowCount: 0,
      warnings: [{ message: `Could not parse PDF "${filename}": ${message}` }],
    };
  }
}

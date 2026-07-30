/**
 * Shared vocabulary for the import pipeline.
 *
 * The type definitions every import step passes between them: what a parsed file
 * looks like, what a column mapping is, and what warnings can be raised. No
 * behaviour here — this file exists so the parser, the mapper and the saver all
 * agree on the same shapes.
 */
export type InferredColumnType = "number" | "date" | "text";

export interface ParseWarning {
  message: string;
  rowNumbers?: number[];
}

/** Narrative PDF scan sections (charts, about, recommendations) from ingestInsights. */
export interface PdfInsightsPayload {
  pages: number;
  chars: number;
  parseEngine: string;
  about: Record<string, unknown>;
  analysis: Record<string, unknown>;
  recommendations: string[];
}

export interface TabularParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  inferredTypes: Record<string, InferredColumnType>;
  rowCount: number;
  warnings: ParseWarning[];
  /** Present for PDF uploads — sector/year/unit charts and narrative analysis. */
  pdfInsights?: PdfInsightsPayload;
}

export type ObservationField = "year" | "value" | "source" | "target_id";

export type ColumnMapping = Partial<Record<ObservationField, string | null>>;

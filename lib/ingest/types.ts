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

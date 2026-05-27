export type InferredColumnType = "number" | "date" | "text";

export interface ParseWarning {
  message: string;
  rowNumbers?: number[];
}

export interface TabularParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  inferredTypes: Record<string, InferredColumnType>;
  rowCount: number;
  warnings: ParseWarning[];
}

export type ObservationField = "year" | "value" | "source" | "target_id";

export type ColumnMapping = Partial<Record<ObservationField, string | null>>;

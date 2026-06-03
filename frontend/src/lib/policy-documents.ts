/** Types for Climate Policy Radar document corpus (bundled export). */

export type PolicyDocumentCategory =
  | "MCF"
  | "Executive"
  | "UN Submissions"
  | "Legislative"
  | "Reports"
  | string;

export interface PolicyDocument {
  id: string;
  title: string;
  familyName: string;
  familySummary: string;
  familyDate: string | null;
  familyUrl: string;
  documentUrl: string;
  contentUrl: string | null;
  documentType: string | null;
  category: PolicyDocumentCategory;
  source: string | null;
  geographies: string[];
  languages: string | null;
  collectionName?: string | null;
}

export interface PolicyDocumentsListResponse {
  documents: PolicyDocument[];
  total: number;
  limit: number;
  offset: number;
  data_source: string;
  attribution: string;
}

export interface PolicyDocumentsMetaResponse {
  count: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
  data_source: string;
}

export interface PolicyDocumentsCuratedResponse {
  sectorId: string;
  context: string;
  documents: PolicyDocument[];
  data_source: string;
}

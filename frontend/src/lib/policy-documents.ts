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
  /** Enriched from CPR passage corpus when available */
  hasPassages?: boolean;
  cprDocumentId?: string;
  passageCount?: number;
  taggedPassageCount?: number;
  cprUrl?: string;
  slug?: string;
}

export interface PolicyPassageTopicLabel {
  id: string;
  label: string;
  matchedText: string | null;
  isFullParagraph?: boolean;
}

export interface PolicyPassage {
  id: string;
  cprDocumentId: string;
  passageIndex: number;
  textBlockId: string;
  text: string;
  passageType: string;
  language: string;
  topicIds: string[];
  topicLabels: PolicyPassageTopicLabel[];
  topicLabellers: string[];
  documentTitle?: string | null;
  documentSlug?: string | null;
  cprUrl?: string | null;
  catalogId?: string | null;
}

export interface PolicyPassageDocument {
  cprDocumentId: string;
  slug: string;
  title: string;
  familyId: string | null;
  familySummary: string;
  cprUrl: string;
  catalogId: string | null;
  passageCount: number;
  taggedPassageCount: number;
}

export interface PolicyTopicIndexEntry {
  id: string;
  label: string;
  passageCount: number;
  documentIds: string[];
}

export interface PolicyPassageCorpusMetaResponse {
  documents: PolicyPassageDocument[];
  topicCount: number;
  passageCount: number;
  data_source: string;
  attribution: string;
}

export interface PolicyPassagesListResponse {
  cprDocumentId: string;
  document: PolicyPassageDocument;
  passages: PolicyPassage[];
  total: number;
  limit: number;
  offset: number;
  data_source: string;
  attribution: string;
}

export interface PolicyTopicsResponse {
  topics: PolicyTopicIndexEntry[];
  total: number;
  data_source: string;
  attribution: string;
}

export interface PolicyPassagesSearchResponse {
  passages: PolicyPassage[];
  total: number;
  limit: number;
  offset: number;
  data_source: string;
  attribution: string;
}

export interface PolicyCatalogDocumentResponse {
  document: PolicyDocument;
  passageDocument: PolicyPassageDocument | null;
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

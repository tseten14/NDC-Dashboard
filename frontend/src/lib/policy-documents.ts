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
  contentUrl?: string | null;
  documentUrl?: string | null;
  category?: string | null;
  source?: string | null;
  data_source?: string;
  attribution?: string;
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

export function uniqueTopicLabels(labels: PolicyPassageTopicLabel[]): PolicyPassageTopicLabel[] {
  const seen = new Set<string>();
  return labels.filter((tl) => {
    if (seen.has(tl.id)) return false;
    seen.add(tl.id);
    return true;
  });
}

export interface PassageDocumentGroup {
  cprDocumentId: string;
  documentTitle: string | null;
  catalogId: string | null;
  cprUrl: string | null;
  passages: PolicyPassage[];
}

/** Preserve first-seen document order from flat search results. */
export function groupPassagesByDocument(passages: PolicyPassage[]): PassageDocumentGroup[] {
  const order: string[] = [];
  const map = new Map<string, PassageDocumentGroup>();
  for (const p of passages) {
    let g = map.get(p.cprDocumentId);
    if (!g) {
      g = {
        cprDocumentId: p.cprDocumentId,
        documentTitle: p.documentTitle ?? null,
        catalogId: p.catalogId ?? null,
        cprUrl: p.cprUrl ?? null,
        passages: [],
      };
      map.set(p.cprDocumentId, g);
      order.push(p.cprDocumentId);
    }
    g.passages.push(p);
  }
  return order.map((id) => map.get(id)!);
}

export interface McfProject {
  id: string;
  title: string;
  funder: string | null;
  amountUsd: number | null;
  familyDate: string | null;
  documentUrl: string;
  contentUrl: string | null;
  geographies: string[];
  searchableText: string;
  fullText: string | null;
  catalogId: string;
  snippet?: string;
}

export interface McfProjectsMetaResponse {
  count: number;
  withAmount: number;
  funders: Record<string, number>;
  data_source: string;
  attribution: string;
}

export interface McfProjectsSearchResponse {
  projects: McfProject[];
  total: number;
  limit: number;
  offset: number;
  data_source: string;
  attribution: string;
}

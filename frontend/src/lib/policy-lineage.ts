/** Climate Policy Radar provenance constants (passage export). */

export const CLIMATE_POLICY_RADAR_URL = "https://app.climatepolicyradar.org";

export const CPR_PASSAGE_ATTRIBUTION =
  "Passage topics and summaries from Climate Policy Radar export (not a live API).";

export function cprDocumentUrl(slug: string): string {
  return `${CLIMATE_POLICY_RADAR_URL}/documents/${slug}`;
}

/** Prefer CPR slug URL when passage enrichment exists. */
export function resolveCprLink(doc: {
  cprUrl?: string | null;
  documentUrl?: string;
}): string | null {
  return doc.cprUrl ?? doc.documentUrl ?? null;
}

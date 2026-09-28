/**
 * Centralises Climate Policy Radar links and attribution for the policy snapshot.
 *
 * The corpus is a build-time export rather than a live API, so every consumer uses
 * the same wording and prefers the stable CPR document address when available.
 */

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

/**
 * Types for the grounded NDC AI response (POST /api/v1/dashboard/analyze).
 *
 * Every citation resolves to a real external page the model actually cited and
 * that a verification pass confirmed contains the figure. Unverified claims
 * carry no link — the frontend renders them as a muted "source unavailable" chip.
 */

export interface GroundedCitation {
  /** Title of the external source page. */
  source_title: string;
  /** Real external URL — never our own domain. Opens in a new tab. */
  source_url: string;
  /** The exact retrieved text that backs the claim (shown on hover). */
  supporting_snippet: string;
  /** ISO-8601 timestamp of when the source was retrieved. */
  retrieved_at: string;
  /** Verifier confidence 0..1. */
  confidence: number;
  /** True only after the verification pass confirmed snippet ⊨ claim. */
  verified: boolean;
}

export interface AnswerSegment {
  text: string;
  citations: GroundedCitation[];
  /** True when the segment states a figure that no source could verify. */
  unverified?: boolean;
}

export interface UnverifiedClaim {
  claim_text: string;
  reason: string;
}

export interface GroundedAnalysisResponse {
  type: string;
  title: string;
  answer_segments: AnswerSegment[];
  unverified_claims: UnverifiedClaim[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
  suggested_follow_ups: string[];
  from_cache?: boolean;
}

/** Perplexity-style short domain slug for a citation chip. */
export function citationDomainSlug(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^api\./, "");
    if (host.includes("climatetrace")) return "climatetrace";
    if (host.includes("climatepolicyradar")) return "climatepolicyradar";
    if (host.includes("unfccc")) return "unfccc";
    if (host.includes("ourworldindata")) return "ourworldindata";
    if (host.includes("worldbank")) return "worldbank";
    if (host.includes("iea")) return "iea";
    if (host.includes("ipcc")) return "ipcc";
    const parts = host.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "source";
  } catch {
    return "source";
  }
}

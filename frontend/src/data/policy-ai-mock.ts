/** Shared policy-assistant response types and action labels.
 * Analysis comes from the document-backed API; there are no canned responses.
 */
export type QuickActionType = "exec_summary" | "key_items" | "targets" | "recommendations";

export interface AiSourceLink {
  id: string;
  label: string;
  url: string;
  viewer_url?: string;
  domain?: string;
  claim?: string;
}

export interface AnalysisLine {
  text: string;
  refs?: string[];
  citations?: AiSourceLink[];
}

export interface AnalysisSection {
  heading?: string;
  lines: (string | AnalysisLine)[];
  page_refs: string[];
  citations?: AiSourceLink[];
}

export interface AiAnalysisResponse {
  type: QuickActionType | "chat" | string;
  title: string;
  sections: AnalysisSection[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
  suggested_follow_ups: string[];
  sources?: AiSourceLink[];
}

// Re-export type alias for use in components
export type AiAnalysisSection = AnalysisSection;

export const QUICK_ACTIONS: { type: QuickActionType; label: string; description: string; icon: string }[] = [
  { type: "exec_summary",    label: "Executive Summary", description: "5-line high-impact brief",         icon: "FileText" },
  { type: "key_items",       label: "Key Items",         description: "Core structure & focus areas",      icon: "List" },
  { type: "targets",         label: "Targets",           description: "Climate & emission commitments",    icon: "Target" },
  { type: "recommendations", label: "Actions",           description: "Concrete next steps",               icon: "Zap" },
];

/**
 * Parse CPR passage-export topic fields (shared by build script and API).
 */

const CPR_BASE_URL = "https://app.climatepolicyradar.org";

export function cprDocumentUrl(slug) {
  if (!slug?.trim()) return null;
  return `${CPR_BASE_URL}/documents/${slug.trim()}`;
}

/** Comma-separated topic IDs — each aligns with a parallel labeller entry. */
export function parseTopicIds(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Keep first occurrence of each topic ID (CPR export may repeat IDs on one passage). */
export function dedupeTopicIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** @deprecated Use parseTopicIds — kept for tests documenting semicolon groups if CPR adds them. */
export function parseTopicIdGroups(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((group) =>
      group
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .filter((group) => group.length > 0);
}

export function flattenTopicIds(groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const id of group) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** Parse TOPIC_LABELLERS e.g. ["KeywordClassifier(\"x\")"], ["BertBasedClassifier(\"y\")"] */
export function parseTopicLabellers(raw) {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  try {
    const wrapped = trimmed.startsWith("[") && !trimmed.startsWith("[[") ? `[${trimmed}]` : trimmed;
    const parsed = JSON.parse(wrapped);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      const s = Array.isArray(entry) ? entry[0] : entry;
      if (typeof s !== "string") return { type: "unknown", concept: null, raw: String(s) };
      const kw = s.match(/KeywordClassifier\("([^"]+)"\)/i);
      if (kw) return { type: "keyword", concept: kw[1], raw: s };
      const bert = s.match(/BertBasedClassifier\("([^"]+)"\)/i);
      if (bert) return { type: "bert", concept: bert[1], raw: s };
      return { type: "unknown", concept: null, raw: s };
    });
  } catch {
    return [];
  }
}

export function labellerTypes(labellers) {
  const types = new Set(labellers.map((l) => l.type).filter((t) => t !== "unknown"));
  return [...types];
}

function parseMatchedTexts(raw, topicCount) {
  if (!raw?.trim()) return Array(topicCount).fill(null);
  const trimmed = raw.trim();
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === topicCount) return parts;
  return Array(topicCount).fill(trimmed);
}

/** Build topicLabels aligned index-wise with topic IDs and labellers. */
export function buildTopicLabels(topicIds, labelledText, labellers) {
  const rawIds = Array.isArray(topicIds) ? topicIds : [];
  if (rawIds.length === 0) return [];

  const texts = parseMatchedTexts(labelledText, rawIds.length);
  const seen = new Set();
  const ids = [];
  const alignedLabellers = [];
  const alignedTexts = [];

  rawIds.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    ids.push(id);
    alignedLabellers.push(labellers[i] ?? null);
    alignedTexts.push(texts[i] ?? null);
  });

  return ids.map((id, i) => {
    const labeller = alignedLabellers[i] ?? null;
    return {
      id,
      label: labeller?.concept ?? labeller?.type ?? "topic",
      matchedText: alignedTexts[i] ?? null,
      isFullParagraph: labeller?.type === "bert",
    };
  });
}

export function slugFromDocumentUrl(documentUrl) {
  if (!documentUrl) return null;
  const m = documentUrl.match(/\/documents\/([^/?#]+)/i);
  return m?.[1] ?? null;
}

export function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

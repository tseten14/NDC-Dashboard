/**
 * Maps supported reporting categories to the classification workspace and preserves saved exercises.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { type ClassificationFramework, type SectorNode, getFramework } from "@/data/classifications";

export function flattenSectors(nodes: SectorNode[]): SectorNode[] {
  return nodes.flatMap((node) => [node, ...flattenSectors(node.children)]);
}

/** Terminal categories of this published selection hierarchy, not inventory observations. */
export function categoryCodes(node: SectorNode): string[] {
  return node.children.length ? node.children.flatMap(categoryCodes) : [node.code];
}

export function selectionState(node: SectorNode, selected: Set<string>): boolean | "indeterminate" {
  const codes = categoryCodes(node);
  const count = codes.filter((code) => selected.has(code)).length;
  return count === codes.length ? true : count ? "indeterminate" : false;
}

export function toggleCategory(node: SectorNode, selected: Set<string>, include: boolean): Set<string> {
  const next = new Set(selected);
  for (const code of categoryCodes(node)) {
    if (include) next.add(code);
    else next.delete(code);
  }
  return next;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesSector(node: SectorNode, query: string): boolean {
  const normalized = normalizeSearch(query);
  return !!normalized && (normalizeSearch(node.code).includes(normalized)
    || normalizeSearch(node.label).includes(normalized)
    || (node.code === "3" && "afolu".includes(normalized))
    || (node.code === "2" && "ippu".includes(normalized)));
}

export function matchesBranch(node: SectorNode, query: string): boolean {
  return matchesSector(node, query) || node.children.some((child) => matchesBranch(child, query));
}

export function codePath(code: string, hierarchy: SectorNode[]): SectorNode[] {
  const nodes = flattenSectors(hierarchy);
  return nodes.filter((node) => node.code === code || code.startsWith(`${node.code}.`));
}

export interface ClassificationSelection {
  schemaVersion: 1;
  countryCode: string;
  frameworkId: string;
  hierarchyVersion: string;
  selectedCodes: string[];
  savedAt: string;
}

export const selectionKey = (countryCode: string) => `ndc-sector-classification-v1:${countryCode}`;

export function validateSelection(value: unknown, countryCode: string): ClassificationSelection {
  if (!value || typeof value !== "object") throw new Error("Invalid selection");
  const record = value as ClassificationSelection;
  const framework = getFramework(record.frameworkId);
  const allowed = new Set(framework?.hierarchy.flatMap(categoryCodes));
  if (record.schemaVersion !== 1 || record.countryCode !== countryCode || !framework?.version
    || framework.unavailableReason || record.hierarchyVersion !== framework.version
    || !Array.isArray(record.selectedCodes) || record.selectedCodes.some((code) => !allowed.has(code))
    || new Set(record.selectedCodes).size !== record.selectedCodes.length
    || typeof record.savedAt !== "string" || !Number.isFinite(Date.parse(record.savedAt))) {
    throw new Error("The saved classification is invalid or uses an unsupported hierarchy version.");
  }
  return record;
}

export function readClassificationSelection(countryCode: string): ClassificationSelection | null {
  const raw = window.localStorage.getItem(selectionKey(countryCode));
  return raw === null ? null : validateSelection(JSON.parse(raw), countryCode);
}

export function saveClassificationSelection(countryCode: string, framework: ClassificationFramework, selected: Set<string>): ClassificationSelection {
  const orderedCodes = framework.hierarchy.flatMap(categoryCodes).filter((code) => selected.has(code));
  if (orderedCodes.length !== selected.size) throw new Error("Selection contains unknown category codes");
  const record = validateSelection({
    schemaVersion: 1, countryCode, frameworkId: framework.id, hierarchyVersion: framework.version,
    selectedCodes: orderedCodes,
    savedAt: new Date().toISOString(),
  }, countryCode);
  // Throw on denied/quota-limited storage so the UI never claims an unsuccessful save.
  window.localStorage.setItem(selectionKey(countryCode), JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("ndc:classification-saved", { detail: record }));
  return record;
}

/** No cross-framework mapping has been verified. Matching code strings are not equivalence. */
export function planFrameworkChange(selected: Set<string>, from: ClassificationFramework, to: ClassificationFramework) {
  if (to.unavailableReason || !to.version) throw new Error("Framework unavailable");
  return from.id === to.id
    ? { retained: [...selected], unmapped: [] as string[] }
    : { retained: [] as string[], unmapped: [...selected] };
}

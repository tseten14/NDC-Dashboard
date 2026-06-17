/**
 * Multilateral climate fund (MCF) project corpus — searchable metadata + text snapshot.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "..", "data", "policy", "mcf-projects.json");

const ATTRIBUTION =
  "Multilateral climate fund projects from Climate Policy Radar export (metadata + summary text). Full project text can be merged when partner data is available.";
const DATA_SOURCE = "mcf_projects_export";

let projects = null;
let byId = null;

function load() {
  if (projects) return;
  const raw = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  projects = raw.projects ?? [];
  byId = new Map(projects.map((p) => [p.id, p]));
}

function clampLimit(raw, max = 100) {
  const n = parseInt(raw ?? "25", 10);
  if (Number.isNaN(n)) return 25;
  return Math.min(Math.max(n, 1), max);
}

function clampOffset(raw) {
  const n = parseInt(raw ?? "0", 10);
  return Number.isNaN(n) ? 0 : Math.max(n, 0);
}

function matchesQuery(p, q) {
  if (!q?.trim()) return false;
  const needle = q.trim().toLowerCase();
  const hay = [p.title, p.searchableText, p.funder, p.fullText].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(needle);
}

const SECTOR_KEYWORDS = {
  "economy-wide": ["economy", "national", "gdp", "cross-sector"],
  afolu: ["forest", "redd", "wetland", "land use", "afolu", "forestry", "deforest"],
  energy: ["energy", "power", "electrification", "electricity", "solar", "grid", "renewable"],
  transport: ["transport", "road", "vehicle", "mobility", "rail"],
  ippu: ["industrial", "manufacturing", "ippu", "cement", "fluorinated"],
  agriculture: ["agriculture", "agroforestry", "livestock", "crop", "dairy", "csa"],
  waste: ["waste", "landfill", "sanitation"],
};

function matchesSector(p, sector) {
  if (!sector?.trim()) return true;
  const key = sector.trim().toLowerCase();
  const keywords = SECTOR_KEYWORDS[key] ?? [key];
  const hay = [p.title, p.searchableText, p.fullText].filter(Boolean).join(" ").toLowerCase();
  return keywords.some((kw) => hay.includes(kw));
}

function filterProjects(rows, opts = {}) {
  const { q, funder, sector, minAmount } = opts;
  let out = rows;
  if (funder?.trim()) {
    const f = funder.trim().toLowerCase();
    out = out.filter((p) => (p.funder ?? "").toLowerCase().includes(f));
  }
  if (sector?.trim()) {
    out = out.filter((p) => matchesSector(p, sector));
  }
  if (minAmount != null && minAmount !== "") {
    const min = Number(minAmount);
    if (Number.isFinite(min)) {
      out = out.filter((p) => p.amountUsd != null && p.amountUsd >= min);
    }
  }
  if (q?.trim()) {
    out = out.filter((p) => matchesQuery(p, q));
  }
  return out;
}

export function getMcfMeta() {
  load();
  const funders = {};
  let withAmount = 0;
  for (const p of projects) {
    if (p.funder) funders[p.funder] = (funders[p.funder] || 0) + 1;
    if (p.amountUsd != null) withAmount += 1;
  }
  return {
    count: projects.length,
    withAmount,
    funders,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}

export function searchMcfProjects(opts = {}) {
  load();
  const limit = clampLimit(opts.limit);
  const offset = clampOffset(opts.offset);
  const filtered = filterProjects(projects, opts);
  const total = filtered.length;
  const slice = filtered.slice(offset, offset + limit).map((p) => ({
    ...p,
    snippet: snippet(p, opts.q),
  }));
  return {
    projects: slice,
    total,
    limit,
    offset,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}

export function getMcfProject(id) {
  load();
  const p = byId.get(id);
  if (!p) return null;
  return { ...p, data_source: DATA_SOURCE, attribution: ATTRIBUTION };
}

function snippet(p, q) {
  const text = p.fullText ?? p.searchableText ?? p.title ?? "";
  if (!q?.trim()) return text.slice(0, 220);
  const needle = q.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(needle);
  if (idx < 0) return text.slice(0, 220);
  const start = Math.max(0, idx - 80);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + 220).trim()}…`;
}

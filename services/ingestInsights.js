/**
 * NDC-aware insight extraction for ingest scan reports.
 * Produces three structured sections per file:
 *   - about            (title, doc_type, topics, entities, summary)
 *   - analysis         (data shape + insights + visualization datasets)
 *   - recommendations  (missing data, improvements)
 */

const SECTORS = [
  "afolu",
  "energy",
  "ippu",
  "agriculture",
  "waste",
  "forestry",
  "transport",
  "transportation",
  "manufacturing",
  "buildings",
  "power",
];

const SECTOR_CANONICAL = {
  transportation: "transport",
  forestry: "afolu",
};

const NATIONAL_TOKENS = new Set([
  "national",
  "country",
  "uganda",
  "all",
  "total",
  "nationwide",
  "n/a",
  "na",
  "",
]);

function isNationalDistrictValue(val) {
  if (val == null) return true;
  const s = String(val).trim().toLowerCase();
  return NATIONAL_TOKENS.has(s);
}

/** Exclude district rows when national rows are also present (pandas parity). */
function filterNationalRows(rows, districtCol) {
  if (!districtCol) return { rows, note: null };
  const hasNational = rows.some((r) => isNationalDistrictValue(r[districtCol]));
  const hasSub = rows.some((r) => !isNationalDistrictValue(r[districtCol]));
  if (hasNational && hasSub) {
    const filtered = rows.filter((r) => isNationalDistrictValue(r[districtCol]));
    if (filtered.length > 0) {
      return {
        rows: filtered,
        note:
          "Charts use national-level rows only; district-level rows were excluded to avoid double-counting.",
      };
    }
  }
  return { rows, note: null };
}

const MINISTRY_HINTS = [
  "ministry of water and environment",
  "ministry of energy",
  "ministry of agriculture",
  "maaif",
  "memd",
  "mwe",
  "mowt",
  "mofped",
  "npa",
  "ubos",
  "uganda revenue authority",
  "national forestry authority",
  "ura",
  "unfccc",
  "itu",
  "undp",
  "world bank",
  "gcf",
  "fao",
];

const DOC_TYPE_RULES = [
  {
    type: "NDC inventory / emissions report",
    needs: ["emission", "mtco2e", "baseline"],
  },
  { type: "Climate TRACE data export", needs: ["climate trace"] },
  { type: "Finance / investment plan", needs: ["budget", "usd", "investment"] },
  { type: "MRV / indicator export", needs: ["indicator", "mrv"] },
  { type: "Policy / NDC narrative", needs: ["ndc", "paris agreement"] },
  { type: "Project / programme proposal", needs: ["objective", "outcome", "phase"] },
  { type: "Risk / adaptation report", needs: ["risk", "vulnerability", "hazard"] },
];

const DOC_TYPE_PLAIN = {
  "NDC inventory / emissions report": {
    label: "Climate targets & emissions report",
    description:
      "This document focuses on Uganda's climate commitments (NDC) and how greenhouse gas emissions are measured or reported over time.",
    purpose: "Used to track progress toward national climate targets and prepare reports to the UN.",
  },
  "Climate TRACE data export": {
    label: "Satellite-based emissions data",
    description:
      "This looks like data from Climate TRACE — an independent system that estimates emissions using satellites and models.",
    purpose: "Helps compare observed emissions with national inventory figures.",
  },
  "Finance / investment plan": {
    label: "Funding & investment document",
    description:
      "This document discusses money, budgets, or investment needed to implement climate actions.",
    purpose: "Links climate programmes to financing and delivery partners.",
  },
  "MRV / indicator export": {
    label: "Monitoring & reporting data",
    description:
      "This is structured monitoring data (MRV) — indicators that ministries use to show whether targets are being met.",
    purpose: "Feeds dashboards and official progress reports.",
  },
  "Policy / NDC narrative": {
    label: "Climate policy document",
    description:
      "This is mainly narrative policy text about Uganda's NDC — goals, strategies, and international commitments.",
    purpose: "Explains what the country intends to do; may need numbers in separate files.",
  },
  "Project / programme proposal": {
    label: "Project or programme proposal",
    description:
      "This reads like a project pitch — objectives, phases, partners, and expected outcomes for a climate-related programme.",
    purpose: "Used to secure approval, funding, or implementation of a specific initiative.",
  },
  "Risk / adaptation report": {
    label: "Climate risk & adaptation",
    description:
      "This document discusses climate risks, vulnerability, or adaptation measures for communities and sectors.",
    purpose: "Informs planning for climate impacts alongside mitigation efforts.",
  },
  "Multi-sector NDC-related document": {
    label: "Multi-topic climate document",
    description:
      "This document touches several climate sectors (e.g. energy, forests, agriculture) and appears related to Uganda's NDC work.",
    purpose: "May combine policy, data, and programme content in one file.",
  },
  "General document": {
    label: "General document",
    description: "We could not classify this into a single standard NDC document type from the text alone.",
    purpose: "Review manually to decide how it fits your data catalogue.",
  },
  "Structured data (time series candidate)": {
    label: "Spreadsheet-style data file",
    description:
      "This is a table of numbers with years and values — suitable for charts and trend analysis in the dashboard.",
    purpose: "Can be imported to update indicators and track progress over time.",
  },
  "Tabular dataset": {
    label: "Data table",
    description: "This file contains rows and columns of data that can be checked for completeness.",
    purpose: "May need extra columns (year, sector) before linking to NDC indicators.",
  },
};

const SECTOR_LABELS = {
  afolu: "Forests & land use (AFOLU)",
  energy: "Energy",
  ippu: "Industry & processes (IPPU)",
  agriculture: "Agriculture",
  waste: "Waste",
  transport: "Transport",
  power: "Electricity & power",
  buildings: "Buildings",
  manufacturing: "Manufacturing",
  forestry: "Forestry",
};

const TOPIC_BLOCKLIST = new Set([
  "month",
  "phase",
  "page",
  "pages",
  "table",
  "figure",
  "section",
  "version",
  "draft",
  "final",
  "annex",
  "item",
  "total",
  "note",
  "notes",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "january",
  "february",
  "march",
  "april",
  "document",
  "file",
  "data",
  "report",
  "uganda",
  "climate",
  "mtco",
  "mtco2e",
  "sector",
  "update",
]);

const TOPIC_FRIENDLY = {
  ndc: "National climate commitments (NDC)",
  emission: "Greenhouse gas emissions",
  emissions: "Greenhouse gas emissions",
  mitigation: "Reducing emissions (mitigation)",
  adaptation: "Adapting to climate impacts",
  baseline: "Starting reference year (baseline)",
  target: "Future targets & goals",
  renewable: "Renewable energy",
  forest: "Forests & tree cover",
  forestry: "Forestry programmes",
  transport: "Transport & mobility",
  budget: "Budgets & costs",
  investment: "Investment & financing",
  mrv: "Monitoring & verification (MRV)",
  unfccc: "UN climate framework (UNFCCC)",
  paris: "Paris Agreement",
  agreement: "International agreements",
  energy: "Energy sector",
  agriculture: "Agriculture",
  waste: "Waste management",
  hazard: "Climate hazards & risks",
  vulnerability: "Vulnerability to climate change",
  indicator: "Performance indicators",
  programme: "Programmes & projects",
  phase: "Project phases",
  objective: "Objectives & outcomes",
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "have",
  "will",
  "are",
  "was",
  "were",
  "been",
  "into",
  "than",
  "their",
  "they",
  "these",
  "those",
  "such",
  "also",
  "which",
  "where",
  "when",
  "what",
  "more",
  "most",
  "other",
  "some",
  "each",
  "between",
  "across",
  "under",
  "over",
  "after",
  "before",
  "within",
  "while",
  "would",
  "should",
  "could",
  "must",
  "shall",
  "include",
  "including",
  "based",
  "year",
  "years",
  "data",
  "report",
]);

const UNIT_PATTERNS = [
  { unit: "MtCO2e", regex: /(\d+(?:[.,]\d+)?)\s*(?:Mt\s*CO2?e|MtCO2e|MtCO₂e|million tonnes? of (?:CO2?e?|carbon))/gi },
  { unit: "tCO2e", regex: /(\d+(?:[.,]\d+)?)\s*(?:t\s*CO2?e|tCO2e|tCO₂e|tonnes? of (?:CO2?e?|carbon))/gi },
  { unit: "USD", regex: /(?:USD|US\$|\$)\s*(\d+(?:[.,]\d+)?)\s*(million|billion|m|bn|k)?/gi },
  { unit: "UGX", regex: /UGX\s*(\d+(?:[.,]\d+)?)\s*(million|billion|m|bn|k)?/gi },
  { unit: "%", regex: /(\d+(?:[.,]\d+)?)\s*%/g },
  { unit: "MW", regex: /(\d+(?:[.,]\d+)?)\s*MW\b/g },
  { unit: "GW", regex: /(\d+(?:[.,]\d+)?)\s*GW\b/g },
  { unit: "ha", regex: /(\d+(?:[.,]\d+)?)\s*(?:ha|hectares?)/gi },
  { unit: "km", regex: /(\d+(?:[.,]\d+)?)\s*km\b/gi },
];

function safeNumber(s) {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function extractTextMentions(text) {
  if (!text) {
    return {
      numbers: [],
      years: [],
      sectors: [],
      ministries: [],
      topics: [],
    };
  }

  const numbers = [];
  for (const { unit, regex } of UNIT_PATTERNS) {
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(text)) !== null) {
      const value = safeNumber(m[1]);
      if (value == null) continue;
      const magnitude = (m[2] || "").toLowerCase();
      const mult =
        magnitude === "million" || magnitude === "m"
          ? 1e6
          : magnitude === "billion" || magnitude === "bn"
            ? 1e9
            : magnitude === "k"
              ? 1e3
              : 1;
      numbers.push({
        unit,
        value: +(value * mult).toFixed(2),
        raw: m[0].trim(),
      });
      if (numbers.length > 200) break;
    }
    if (numbers.length > 200) break;
  }

  const yearCounts = new Map();
  const yearRegex = /\b(19[89]\d|20[0-4]\d|2050)\b/g;
  let ym;
  while ((ym = yearRegex.exec(text)) !== null) {
    const y = parseInt(ym[1], 10);
    yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
  }
  const years = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const lc = text.toLowerCase();
  const sectorCounts = new Map();
  for (const s of SECTORS) {
    const re = new RegExp(`\\b${s}\\b`, "g");
    const m2 = lc.match(re);
    if (m2) {
      const key = SECTOR_CANONICAL[s] ?? s;
      sectorCounts.set(key, (sectorCounts.get(key) || 0) + m2.length);
    }
  }
  const sectors = [...sectorCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const ministries = [];
  for (const m3 of MINISTRY_HINTS) {
    if (lc.includes(m3)) ministries.push(m3.replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  const wordCounts = new Map();
  const tokens = (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter(
    (w) => !STOP_WORDS.has(w),
  );
  for (const t of tokens) wordCounts.set(t, (wordCounts.get(t) || 0) + 1);
  const topics = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));

  return { numbers, years, sectors, ministries: [...new Set(ministries)], topics };
}

function isDateOnlyLine(line) {
  return /^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(line) || /^\d{4}-\d{2}-\d{2}$/.test(line);
}

function pickTitle(text, fallback) {
  if (!text) return fallback;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 6 && l.length <= 120 && !isDateOnlyLine(l));
  for (const l of lines) {
    if (/^[A-Z0-9]/.test(l) && /[a-z]/.test(l) && !/^\d/.test(l)) return l;
  }
  const named = lines.find((l) => /ndc|uganda|climate|emission|report|programme|project/i.test(l));
  return named ?? lines[0] ?? fallback.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

function sectorLabel(name) {
  const key = String(name || "").toLowerCase();
  return SECTOR_LABELS[key] ?? name;
}

function topicToFriendly(term) {
  const t = String(term || "").toLowerCase();
  if (TOPIC_BLOCKLIST.has(t)) return null;
  if (TOPIC_FRIENDLY[t]) return TOPIC_FRIENDLY[t];
  if (t.length < 4) return null;
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, " ");
}

function filterTopics(topics) {
  const seen = new Set();
  const out = [];
  for (const { term, count } of topics) {
    const label = topicToFriendly(term);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ term, label, count });
    if (out.length >= 6) break;
  }
  return out;
}

function getDocTypePlain(docType) {
  return (
    DOC_TYPE_PLAIN[docType] ?? {
      label: docType,
      description: "We scanned the file and grouped it under this document type.",
      purpose: "Use this label to decide where the file belongs in your NDC data workflow.",
    }
  );
}

function formatNumberPlain(n) {
  if (n.unit === "MtCO2e") return `${n.value.toFixed(2)} million tonnes CO₂ equivalent`;
  if (n.unit === "tCO2e") return `${n.value.toFixed(0)} tonnes CO₂ equivalent`;
  if (n.unit === "USD") return `USD ${formatMoney(n.value)}`;
  if (n.unit === "UGX") return `UGX ${formatMoney(n.value)}`;
  if (n.unit === "%") return `${n.value}%`;
  return `${n.value} ${n.unit}`;
}

function inferDocType(text, sectors) {
  if (!text) return "Unknown document";
  const lc = text.toLowerCase();
  for (const rule of DOC_TYPE_RULES) {
    if (rule.needs.every((n) => lc.includes(n))) return rule.type;
  }
  if (sectors.length >= 2) return "Multi-sector NDC-related document";
  return "General document";
}

function buildSummary(text, maxChars = 600) {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const lastDot = cut.lastIndexOf(".");
  return (lastDot > 200 ? cut.slice(0, lastDot + 1) : cut) + " …";
}

/** Pull labelled fields common in test / ops reports (Status, Date, Metadata, numbered summary). */
function parseReportFields(text) {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  const fields = {};

  const titleEnd = flat.search(/\s+Generated\s+on:/i);
  if (titleEnd > 0) fields.title = flat.slice(0, titleEnd).trim();
  else {
    const beforeStatus = flat.search(/\s+Status:/i);
    if (beforeStatus > 0) fields.title = flat.slice(0, beforeStatus).trim();
  }

  const gen = flat.match(/Generated\s+on:\s*(\d{4}-\d{2}-\d{2})/i);
  if (gen) fields.generated_on = gen[1];

  const status = flat.match(/Status:\s*([A-Z][A-Z0-9_]*)/i);
  if (status) fields.status = status[1].replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const summaryBlock = text.match(/Document\s+Summary:\s*([\s\S]*?)(?:\s*Metadata\s*:|$)/i);
  if (summaryBlock) {
    const body = summaryBlock[1].replace(/\s+/g, " ").trim();
    const parts = body.split(/\s*(?=\d+\.\s)/).filter(Boolean);
    fields.summary_points = parts
      .map((p) => p.replace(/^\d+\.\s*/, "").trim())
      .filter((p) => p.length > 8);
  }

  const meta = text.match(/Metadata:\s*([\s\S]+)/i);
  if (meta) {
    const block = meta[1].replace(/\s+/g, " ").trim();
    const author = block.match(/Author:\s*([^:]+?)(?=\s+Version:|\s+Security|$)/i);
    const version = block.match(/Version:\s*([\d.]+)/i);
    const sec = block.match(/Security\s+Classification:\s*(\w+)/i);
    if (author) fields.author = author[1].trim();
    if (version) fields.version = version[1];
    if (sec) fields.security = sec[1];
  }

  const hasStructure =
    fields.status || fields.generated_on || fields.summary_points?.length || fields.author;
  return hasStructure ? fields : null;
}

function preferParagraphMode(text, mentions) {
  if (parseReportFields(text)) return true;
  const hasClimateNumbers = mentions.numbers.some((n) =>
    ["MtCO2e", "tCO2e", "USD", "UGX"].includes(n.unit),
  );
  const strongSectors = mentions.sectors.filter((s) => s.count >= 2).length;
  if (!hasClimateNumbers && strongSectors === 0) return true;
  return false;
}

function formatReportDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${d} ${months[m - 1] ?? m} ${y}`;
}

function buildAboutParagraphs(structured, title, doc_type, summary, mentions) {
  const plain = getDocTypePlain(doc_type);
  const paras = [];

  const docTitle = structured?.title || title;
  let opener = `This file is titled “${docTitle}”. `;
  if (structured?.generated_on) {
    opener += `It was generated on ${formatReportDate(structured.generated_on)}. `;
  }
  if (structured?.status) {
    const urgent = /critical|alert|urgent/i.test(structured.status);
    opener += urgent
      ? `The report is marked as ${structured.status}, which indicates the system considers it urgent and may require immediate follow-up. `
      : `The current status is recorded as ${structured.status}. `;
  }
  opener += plain.description;
  paras.push(opener.trim());

  if (structured?.summary_points?.length) {
    const joined = structured.summary_points
      .map((p, i) => {
        const lead = i === 0 ? "First" : i === structured.summary_points.length - 1 ? "Finally" : "Next";
        return `${lead}, ${p.charAt(0).toLowerCase()}${p.slice(1)}`;
      })
      .join(" ");
    paras.push(`The document summary states the following. ${joined}`);
  } else if (summary && summary.length > 40) {
    paras.push(summary.length > 500 ? summary.slice(0, 500) + "…" : summary);
  }

  if (structured?.author || structured?.version || structured?.security) {
    const bits = [];
    if (structured.author) bits.push(`prepared by ${structured.author}`);
    if (structured.version) bits.push(`version ${structured.version}`);
    if (structured.security) bits.push(`classified as ${structured.security}`);
    paras.push(
      `According to the metadata, this document was ${bits.join(", ")}. ${plain.purpose}`,
    );
  } else {
    paras.push(plain.purpose);
  }

  const ministries = mentions.ministries;
  if (ministries?.length) {
    paras.push(
      `The text names ${ministries.slice(0, 3).join(", ")} as responsible institutions.`,
    );
  }

  return paras.filter(Boolean);
}

function buildAnalysisParagraphs(structured, mentions, text) {
  const paras = [];

  if (structured?.summary_points?.length) {
    const anomaly = structured.summary_points.find((p) =>
      /anomaly|action required|alert/i.test(p),
    );
    if (anomaly) {
      paras.push(
        `A notable issue appears in the summary: ${anomaly} This is the main operational message in the file and should be reviewed by the relevant team.`,
      );
    }
    const parserHint = structured.summary_points.find((p) => /parser|key fields/i.test(p));
    if (parserHint) {
      paras.push(
        `The document also explains what automated checks should look for — for example status, dates, and other labelled fields — so uploads can be validated consistently.`,
      );
    }
  }

  const sectorMatch = text.match(/Sector\s+([0-9A-Z]+)/i);
  if (sectorMatch) {
    paras.push(
      `The report references Sector ${sectorMatch[1]}, which may refer to a programme area or location code in your ingestion tests rather than a standard NDC emissions sector.`,
    );
  } else if (mentions.sectors.length) {
    const names = mentions.sectors.slice(0, 3).map((s) => sectorLabel(s.name)).join(", ");
    paras.push(`Climate-related sectors mentioned in the text include ${names}.`);
  }

  if (mentions.years.length) {
    const yrs = mentions.years.map((y) => y.year).join(", ");
    paras.push(`Calendar years referenced in the document include ${yrs}.`);
  }

  const mtco2e = mentions.numbers.filter((n) => n.unit === "MtCO2e");
  if (mtco2e.length) {
    const max = Math.max(...mtco2e.map((n) => n.value));
    paras.push(
      `The file cites greenhouse gas figures, with values up to about ${max.toFixed(2)} million tonnes CO₂ equivalent.`,
    );
  } else if (!structured) {
    paras.push(
      `The scan did not find standard emissions totals (MtCO₂e) in this document. It reads mainly as narrative or test content rather than a quantitative inventory.`,
    );
  }

  if (paras.length === 0) {
    paras.push(
      "We read through the full text and did not find enough structured climate data to draw charts. The content is best understood as descriptive reporting rather than a spreadsheet-style dataset.",
    );
  }

  return paras;
}

function buildRecommendationParagraphs(structured, mentions) {
  const parts = [];

  if (structured?.status && /critical|alert/i.test(structured.status)) {
    parts.push(
      "Because the status is flagged as critical, assign a reviewer to confirm whether the reported anomaly is real and document any corrective action taken.",
    );
  }

  if (!mentions.numbers.some((n) => n.unit === "MtCO2e")) {
    parts.push(
      "If this file is meant to support NDC tracking, consider attaching a separate data file with emissions figures and a clear reporting year.",
    );
  }

  if (structured?.summary_points?.some((p) => /sample|test/i.test(p))) {
    parts.push(
      "This appears to be a test document. For production use, replace it with your actual NDC or MRV export so the dashboard reflects real country data.",
    );
  } else {
    parts.push(
      "To enable trend charts in the explorer, export supporting tables as CSV with Year and Value columns when numbers are available elsewhere.",
    );
  }

  return [parts.join(" ")];
}

function buildTextInsights(mentions) {
  const lines = [];
  if (mentions.sectors.length) {
    const top = mentions.sectors
      .slice(0, 3)
      .map((s) => sectorLabel(s.name))
      .join(", ");
    lines.push(`The document talks most about: ${top}. These are the climate sectors that appear most often in the text.`);
  }
  if (mentions.years.length) {
    const min = mentions.years[0].year;
    const max = mentions.years[mentions.years.length - 1].year;
    lines.push(
      `Years mentioned span ${min} to ${max}. That usually shows the reporting period or targets the document refers to.`,
    );
  }
  const mtco2e = mentions.numbers.filter((n) => n.unit === "MtCO2e");
  if (mtco2e.length) {
    const max = Math.max(...mtco2e.map((n) => n.value));
    lines.push(
      `We found ${mtco2e.length} emissions figure(s) in million tonnes CO₂ equivalent. The largest single value mentioned is about ${max.toFixed(2)} million tonnes.`,
    );
  }
  const usd = mentions.numbers.filter((n) => n.unit === "USD");
  if (usd.length) {
    const max = Math.max(...usd.map((n) => n.value));
    lines.push(`The document includes dollar amounts for costs or investment. The largest figure is about USD ${formatMoney(max)}.`);
  }
  const pct = mentions.numbers.filter((n) => n.unit === "%");
  if (pct.length >= 3)
    lines.push(`Several percentage figures appear — often used for targets, shares of emissions, or growth rates.`);
  if (mentions.ministries.length)
    lines.push(
      `Government bodies named in the text include: ${mentions.ministries.slice(0, 4).join(", ")}. These help show who is responsible for delivery.`,
    );
  return lines;
}

function buildTextHighlights(mentions) {
  const highlights = [];
  const mtco2e = mentions.numbers.filter((n) => n.unit === "MtCO2e");
  if (mtco2e.length) {
    const max = mtco2e.reduce((a, b) => (b.value > a.value ? b : a));
    highlights.push({
      label: "Largest emissions figure mentioned",
      value: formatNumberPlain(max),
      note: "Million tonnes CO₂ equivalent (MtCO₂e) is the standard unit for national climate reporting.",
    });
  }
  const usd = mentions.numbers.filter((n) => n.unit === "USD");
  if (usd.length) {
    const max = usd.reduce((a, b) => (b.value > a.value ? b : a));
    highlights.push({
      label: "Largest money figure mentioned",
      value: formatNumberPlain(max),
      note: "Check whether this is a budget, investment need, or programme cost.",
    });
  }
  if (mentions.years.length) {
    const peak = mentions.years.reduce((a, b) => (b.count > a.count ? b : a));
    highlights.push({
      label: "Most frequently referenced year",
      value: String(peak.year),
      note: `This year appears ${peak.count} time(s) in the document — often the main reporting or target year.`,
    });
  }
  if (mentions.sectors[0]) {
    highlights.push({
      label: "Strongest sector focus",
      value: sectorLabel(mentions.sectors[0].name),
      note: `Mentioned ${mentions.sectors[0].count} time(s) in the text.`,
    });
  }
  return highlights.slice(0, 4);
}

function buildChartGuides(mentions, mode, tabularMeta = {}) {
  const guides = [];
  if (mentions.sectors?.length) {
    guides.push({
      id: "sector_bar",
      title: "Which sectors does this talk about?",
      what: "Each bar shows how often a climate sector (energy, forests, agriculture, etc.) appears in the document.",
      how_to_read:
        mode === "tabular"
          ? "Longer bars mean higher total values in your spreadsheet for that sector."
          : "Longer bars mean the sector is discussed more often — not necessarily bigger emissions.",
    });
  }
  if (mentions.years?.length || tabularMeta.hasTimeSeries) {
    guides.push({
      id: "year_timeline",
      title: mode === "tabular" ? "How do values change over time?" : "Which years come up in the text?",
      what:
        mode === "tabular"
          ? "This line connects yearly totals from your data file."
          : "This line shows how often each calendar year is mentioned in the document.",
      how_to_read:
        mode === "tabular"
          ? "An upward slope means totals increased between the first and last year shown; downward means they fell."
          : "Peaks show years that are emphasised — often baselines, inventory years, or target dates.",
    });
  }
  if (tabularMeta.hasNullChart) {
    guides.push({
      id: "null_chart",
      title: "Where is data missing?",
      what: "Each bar is a column in your spreadsheet. The height is the percentage of empty cells.",
      how_to_read: "Bars above 50% (shown in red) mean that column is mostly empty and may need to be filled before official reporting.",
    });
  }
  if (mentions.numbers?.length) {
    const hist = histogramByUnit(mentions.numbers);
    if (hist.length > 1) {
      guides.push({
        id: "unit_histogram",
        title: "What kinds of numbers appear?",
        what: "Counts how many figures use each unit (emissions, money, percentages, energy, land area, etc.).",
        how_to_read: "The tallest bar is the most common type of number in the document — useful to see if it is mainly about emissions, finance, or targets.",
      });
    }
  }
  return guides;
}

function buildAboutNarrative({ title, doc_type, summary, mentions, filename }) {
  const plain = getDocTypePlain(doc_type);
  const topicsPlain = filterTopics(mentions.topics);
  const topicLabels = topicsPlain.map((t) => t.label);

  let description = plain.description;
  if (summary) {
    description = `${plain.description} ${summary.length > 280 ? summary.slice(0, 280) + "…" : summary}`;
  } else if (topicLabels.length) {
    description = `${plain.description} Main themes detected: ${topicLabels.slice(0, 4).join("; ")}.`;
  }

  return {
    title: title || filename,
    doc_type,
    doc_type_plain: plain.label,
    description,
    purpose: plain.purpose,
    topics: mentions.topics,
    topics_plain: topicsPlain,
    entities: { ministries: mentions.ministries, years: mentions.years.map((y) => y.year) },
    summary,
  };
}

function buildTextRecommendations(mentions, kind) {
  const recs = [];
  if (kind === "pdf" || kind === "text") {
    if (!mentions.numbers.some((n) => n.unit === "MtCO2e"))
      recs.push(
        "We did not find clear greenhouse gas totals (MtCO₂e). If the file is a policy note, attach a separate spreadsheet or table with emissions numbers.",
      );
    if (mentions.years.length === 0)
      recs.push("No calendar years were detected. Add a clear reporting year or period (e.g. 2015 baseline, 2030 target) so progress can be tracked.");
    if (mentions.sectors.length === 0)
      recs.push(
        "No standard NDC sectors were detected (forests, energy, industry, agriculture, waste). Tag the file or add a short sector label when you upload it.",
      );
    if (!mentions.numbers.some((n) => n.unit === "USD" || n.unit === "UGX"))
      recs.push("No budget or cost figures were found. If finance is relevant, include investment amounts or link to a funding source.");
    recs.push(
      "For charts and trend lines in the dashboard, export the same information as a CSV or Excel file with Year and Value columns.",
    );
  }
  return recs;
}

function formatMoney(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} bn`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} m`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} k`;
  return v.toFixed(0);
}

export function buildPdfTextSections(text, filename) {
  const mentions = extractTextMentions(text);
  const structured = parseReportFields(text);
  const title = structured?.title || pickTitle(text, filename);
  const doc_type = inferDocType(text, mentions.sectors);
  const summary = buildSummary(text);
  const useParagraphs = preferParagraphMode(text, mentions);

  if (useParagraphs) {
    return {
      about: {
        ...buildAboutNarrative({ title, doc_type, summary, mentions, filename }),
        presentation: "paragraph",
        paragraphs: buildAboutParagraphs(structured, title, doc_type, summary, mentions),
      },
      analysis: {
        mode: "narrative",
        presentation: "paragraph",
        paragraphs: buildAnalysisParagraphs(structured, mentions, text),
        numbers: mentions.numbers.slice(0, 50),
        sectors: mentions.sectors,
        years: mentions.years,
        visuals: {},
      },
      recommendations: buildRecommendationParagraphs(structured, mentions),
    };
  }

  const sectorBar = mentions.sectors.slice(0, 8).map((s) => ({
    name: s.name,
    label: sectorLabel(s.name),
    count: s.count,
  }));
  const insights = buildTextInsights(mentions);

  return {
    about: buildAboutNarrative({ title, doc_type, summary, mentions, filename }),
    analysis: {
      mode: "narrative",
      presentation: "bullets",
      overview:
        "This section summarises what we found in the document text — which sectors and years stand out, and which important numbers were mentioned.",
      numbers: mentions.numbers.slice(0, 50),
      sectors: mentions.sectors,
      years: mentions.years,
      insights,
      highlights: buildTextHighlights(mentions),
      chart_guides: buildChartGuides(mentions, "narrative"),
      visuals: {
        sector_bar: sectorBar,
        year_timeline: mentions.years,
        unit_histogram: histogramByUnit(mentions.numbers),
      },
    },
    recommendations: buildTextRecommendations(mentions, "pdf"),
  };
}

function histogramByUnit(numbers) {
  const map = new Map();
  for (const n of numbers) map.set(n.unit, (map.get(n.unit) || 0) + 1);
  return [...map.entries()].map(([unit, count]) => ({ unit, count }));
}

/* ── Tabular (CSV / JSON array) ─────────────────────────────── */

function detectColumn(headers, candidates) {
  const lc = headers.map((h) => h.toLowerCase());
  for (const c of candidates) {
    const i = lc.indexOf(c);
    if (i !== -1) return headers[i];
  }
  for (const c of candidates) {
    const i = lc.findIndex((h) => h.includes(c));
    if (i !== -1) return headers[i];
  }
  return null;
}

function countDuplicateRows(rows, keys) {
  const usableKeys = keys.filter(Boolean);
  if (usableKeys.length < 2) return 0;
  const seen = new Map();
  let dupes = 0;
  for (const row of rows) {
    const parts = usableKeys.map((k) => {
      const v = row[k];
      return v == null ? "" : String(v).trim().toLowerCase();
    });
    if (parts.some((p) => p === "")) continue;
    const key = parts.join("|");
    const prev = seen.get(key) ?? 0;
    seen.set(key, prev + 1);
  }
  for (const count of seen.values()) {
    if (count > 1) dupes += count;
  }
  return dupes;
}

export function buildTabularSections(rows, columns, filename) {
  const headers = columns.map((c) => c.name);

  const yearCol = detectColumn(headers, ["year", "period_end", "reporting_year"]);
  const sectorCol = detectColumn(headers, ["sector", "category", "sector_id"]);
  const valueCol = detectColumn(headers, [
    "value",
    "value_mtco2e",
    "emissions",
    "mtco2e",
    "amount",
    "quantity",
  ]);
  const districtCol = detectColumn(headers, ["district", "region", "subnational"]);

  const numericCols = columns.filter((c) => c.type === "number");
  const incompleteCols = columns.filter((c) => c.null_ratio >= 0.5);

  const insights = [];
  insights.push(
    `Your file has ${rows.length} rows of data and ${columns.length} columns. Each row is usually one year, district, sector, or indicator reading.`,
  );
  if (numericCols.length)
    insights.push(
      `These columns contain numbers we can chart: ${numericCols.map((c) => c.name).join(", ")}.`,
    );
  if (yearCol && valueCol)
    insights.push(
      `We can plot changes over time using the "${yearCol}" column for the year and "${valueCol}" for the amount.`,
    );
  if (sectorCol)
    insights.push(`You can compare sectors using the "${sectorCol}" column — useful for NDC sector reports.`);
  if (districtCol)
    insights.push(`The "${districtCol}" column allows breakdowns by district or region within Uganda.`);

  let chartRows = rows;
  let nationalNote = null;
  if (districtCol) {
    const filtered = filterNationalRows(rows, districtCol);
    chartRows = filtered.rows;
    nationalNote = filtered.note;
  }

  const sectorBar = [];
  let sectorBarNote = null;
  if (sectorCol && valueCol) {
    const agg = new Map();
    let latestYear = null;
    if (yearCol) {
      for (const r of chartRows) {
        const y = safeNumber(r[yearCol]);
        if (y != null) latestYear = latestYear == null ? y : Math.max(latestYear, y);
      }
    }
    for (const r of chartRows) {
      if (yearCol && latestYear != null) {
        const y = safeNumber(r[yearCol]);
        if (y == null || y !== latestYear) continue;
      }
      const s = r[sectorCol] == null ? null : String(r[sectorCol]).trim().toLowerCase();
      const v = safeNumber(r[valueCol]);
      if (!s || v == null) continue;
      agg.set(s, (agg.get(s) || 0) + v);
    }
    if (yearCol && latestYear != null) {
      sectorBarNote = `Sector chart shows the latest year in the file (${latestYear}) only, so sectors are not summed across multiple years.`;
    }
    for (const [name, total] of agg.entries()) {
      sectorBar.push({ name, total: +total.toFixed(2) });
    }
    sectorBar.sort((a, b) => b.total - a.total);
  }

  const timeSeries = [];
  if (yearCol && valueCol) {
    const agg = new Map();
    for (const r of chartRows) {
      const y = safeNumber(r[yearCol]);
      const v = safeNumber(r[valueCol]);
      if (y == null || v == null) continue;
      agg.set(y, (agg.get(y) || 0) + v);
    }
    for (const [year, total] of agg.entries()) {
      timeSeries.push({ year, total: +total.toFixed(2) });
    }
    timeSeries.sort((a, b) => a.year - b.year);
    if (timeSeries.length >= 2) {
      const first = timeSeries[0];
      const last = timeSeries[timeSeries.length - 1];
      const delta = +(last.total - first.total).toFixed(2);
      const pct = first.total ? ((delta / first.total) * 100).toFixed(1) : null;
      const direction = delta >= 0 ? "increased" : "decreased";
      insights.push(
        `Between ${first.year} and ${last.year}, the total ${direction} by ${Math.abs(delta)}` +
          (pct ? ` — about ${Math.abs(parseFloat(pct))}% change over the period.` : "."),
      );
    }
  }

  const nullChart = columns
    .map((c) => ({
      name: c.name,
      null_pct: +(c.null_ratio * 100).toFixed(1),
    }))
    .sort((a, b) => b.null_pct - a.null_pct)
    .slice(0, 10);

  const doc_type = yearCol && valueCol ? "Structured data (time series candidate)" : "Tabular dataset";
  const plain = getDocTypePlain(doc_type);
  const colBits = [];
  if (yearCol) colBits.push(`year (“${yearCol}”)`);
  if (valueCol) colBits.push(`value (“${valueCol}”)`);
  if (sectorCol) colBits.push(`sector (“${sectorCol}”)`);
  if (districtCol) colBits.push(`location (“${districtCol}”)`);

  const validationNotes = [];
  if (nationalNote) validationNotes.push(nationalNote);
  if (sectorBarNote) validationNotes.push(sectorBarNote);

  const valueCoercionFailures =
    valueCol == null
      ? 0
      : rows.filter((r) => {
          const raw = r[valueCol];
          if (raw == null || String(raw).trim() === "") return false;
          return safeNumber(raw) == null;
        }).length;
  const duplicateKeyRows = countDuplicateRows(rows, [yearCol, sectorCol, districtCol]);

  const recommendations = [];
  if (incompleteCols.length)
    recommendations.push(
      `${incompleteCols.length} column(s) are more than half empty (${incompleteCols
        .map((c) => c.name)
        .slice(0, 3)
        .join(", ")}${incompleteCols.length > 3 ? ", …" : ""}). Fill gaps before using this in official reports.`,
    );
  if (!yearCol)
    recommendations.push('Add a column named "year" (or reporting_year) so we can show trends over time.');
  if (!valueCol)
    recommendations.push('Add a numeric "value" or "emissions" column with the amounts you want to track.');
  if (!sectorCol)
    recommendations.push("Add a sector column (e.g. energy, afolu, agriculture) to compare contributions by sector.");
  if (!districtCol)
    recommendations.push("If this data is local, add a district or region column for maps and regional summaries.");
  if (rows.length < 5)
    recommendations.push("Only a few rows were found — check that you exported the full dataset from the source system.");
  if (recommendations.length === 0)
    recommendations.push("The file structure looks good. You can map these columns to NDC indicators in the structured import tab.");

  const sectorBarLabeled = sectorBar.map((s) => ({
    ...s,
    label: sectorLabel(s.name),
  }));

  const tabularHighlights = [];
  if (timeSeries.length >= 2) {
    const first = timeSeries[0];
    const last = timeSeries[timeSeries.length - 1];
    const delta = +(last.total - first.total).toFixed(2);
    tabularHighlights.push({
      label: "Change over the period in your file",
      value: `${first.year} → ${last.year}: ${delta >= 0 ? "+" : ""}${delta}`,
      note: valueCol ? `Based on adding all values in the “${valueCol}” column by year.` : "",
    });
  }
  if (sectorBarLabeled[0]) {
    tabularHighlights.push({
      label: "Largest sector total in the file",
      value: `${sectorBarLabeled[0].label}: ${sectorBarLabeled[0].total}`,
      note: sectorCol ? `Summed from the “${sectorCol}” column.` : "",
    });
  }
  if (rows.length) {
    tabularHighlights.push({
      label: "How much data is included",
      value: `${rows.length} rows`,
      note: `${columns.length} columns${colBits.length ? ` — including ${colBits.join(", ")}` : ""}.`,
    });
  }

  return {
    qc: {
      rows_input: rows.length,
      rows_used_for_charts: chartRows.length,
      rows_dropped_non_national: Math.max(0, rows.length - chartRows.length),
      duplicate_key_rows: duplicateKeyRows,
      value_coercion_failures: valueCoercionFailures,
    },
    validation:
      validationNotes.length > 0
        ? { notes: validationNotes, aggregation_engine: "javascript_fallback" }
        : { aggregation_engine: "javascript_fallback" },
    about: {
      title: filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      doc_type,
      doc_type_plain: plain.label,
      description: `${plain.description} ${colBits.length ? `We recognised: ${colBits.join("; ")}.` : "Some expected columns (year, value) were not found — see recommendations below."}`,
      purpose: plain.purpose,
      detected_columns: { year: yearCol, value: valueCol, sector: sectorCol, district: districtCol },
      detected_columns_plain: {
        year: yearCol ? `Years are in “${yearCol}”` : "No year column found",
        value: valueCol ? `Amounts are in “${valueCol}”` : "No value column found",
        sector: sectorCol ? `Sectors are in “${sectorCol}”` : "No sector column",
        district: districtCol ? `Locations are in “${districtCol}”` : "No district/region column",
      },
      shape: { rows: rows.length, columns: columns.length },
    },
    analysis: {
      mode: "tabular",
      presentation: "bullets",
      overview:
        "These charts summarise your spreadsheet — sector totals, trends by year, and any columns with many blank cells.",
      validation_notes: validationNotes.length ? validationNotes : undefined,
      insights,
      highlights: tabularHighlights,
      chart_guides: buildChartGuides(
        { sectors: sectorBar, years: timeSeries.map((t) => ({ year: t.year, count: t.total })), numbers: [] },
        "tabular",
        { hasTimeSeries: timeSeries.length > 0, hasNullChart: nullChart.length > 0 },
      ),
      visuals: {
        sector_bar: sectorBarLabeled,
        time_series: timeSeries,
        null_chart: nullChart,
      },
    },
    recommendations,
  };
}

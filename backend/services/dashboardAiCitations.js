/**
 * Deterministic citation resolution for NDC AI — maps fact ids and numeric
 * claims in each paragraph to verified source URLs from the client fact ledger.
 */

function factToCitation(fact, used) {
  const link = {
    id: fact.id,
    label: fact.source_label,
    url: fact.source_url,
    viewer_url: fact.viewer_url,
    domain: fact.domain,
    claim: fact.claim,
  };
  used.set(fact.id, link);
  return link;
}

function buildFactMap(ledger = []) {
  return new Map(ledger.map((f) => [f.id, f]));
}

function extractNumbers(text) {
  if (!text) return [];
  const matches = [...String(text).matchAll(/(\d+(?:\.\d+)?)/g)];
  return matches.map((m) => parseFloat(m[1])).filter((n) => Number.isFinite(n));
}

function valuesMatch(a, b) {
  if (a == null || b == null) return false;
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (Math.abs(x - y) < 0.06) return true;
  const denom = Math.max(Math.abs(x), Math.abs(y), 0.001);
  return Math.abs(x - y) / denom < 0.025;
}

/** Match paragraph numbers to fact ledger entries (deterministic, no guessing). */
export function matchFactsByNumbers(text, ledger = []) {
  const nums = extractNumbers(text);
  if (!nums.length) return [];

  const matched = [];
  for (const fact of ledger) {
    if (fact.value == null) continue;
    for (const n of nums) {
      if (valuesMatch(n, fact.value)) {
        matched.push(fact);
        break;
      }
    }
  }
  return matched;
}

function resolveFactRefs(refs, factMap, used) {
  return (refs ?? [])
    .map((ref) => {
      const fact = factMap.get(ref);
      if (!fact) return null;
      return factToCitation(fact, used);
    })
    .filter(Boolean);
}

function inferFactsFromKeywords(text, context, ledger) {
  const lower = (text ?? "").toLowerCase();
  const sector = context?.selected_target?.sector ?? context?.selected_sector;
  const inferred = [];

  const wantsTrace =
    /climate trace|measured|observed|emission|inventory|satellite|trace|mtco2|mtco₂/.test(lower);
  const wantsNdc =
    /pledge|baseline|2030 target|ndc commitment|unconditional|conditional|bau/.test(lower) &&
    !/progress toward|on track|behind|ahead/.test(lower);

  if (wantsTrace && sector) {
    const traceFacts = ledger.filter(
      (f) => f.id.startsWith(`fact_trace_${sector}_`) && f.value != null,
    );
    const latest = traceFacts.find((f) => f.id.includes("_latest_")) ?? traceFacts[0];
    if (latest) inferred.push(latest);
  }

  if (wantsNdc && context?.selected_target?.id) {
    const targetFacts = ledger.filter((f) =>
      f.id.startsWith(`fact_ndc_${context.selected_target.id}_`),
    );
    if (targetFacts.length) inferred.push(...targetFacts.slice(0, 2));
  }

  return inferred;
}

export function validateParagraphNumbers(text, ledger = []) {
  const nums = extractNumbers(text);
  const allowed = new Set(
    ledger.filter((f) => f.value != null).map((f) => Number(f.value)),
  );
  const unmatched = nums.filter(
    (n) => ![...allowed].some((v) => valuesMatch(n, v)),
  );
  return { valid: unmatched.length === 0, unmatched };
}

export function enrichCitationsFromFacts(parsed, context = {}) {
  const ledger = context.fact_ledger ?? [];
  const factMap = buildFactMap(ledger);
  const used = new Map();
  let hasUnverifiedNumbers = false;

  const sections = (parsed.sections ?? []).map((section) => {
    const lines = (section.lines ?? []).map((line) => {
      const text = typeof line === "string" ? line : line?.text ?? "";
      const rawRefs = typeof line === "string" ? [] : line?.refs ?? [];

      let citations = resolveFactRefs(rawRefs, factMap, used);

      if (citations.length === 0) {
        const byNumbers = matchFactsByNumbers(text, ledger);
        citations = byNumbers.map((f) => factToCitation(f, used));
      }

      if (citations.length === 0) {
        const inferred = inferFactsFromKeywords(text, context, ledger);
        citations = inferred.map((f) => factToCitation(f, used));
      }

      const validation = validateParagraphNumbers(text, ledger);
      if (!validation.valid && extractNumbers(text).length > 0) {
        hasUnverifiedNumbers = true;
      }

      return {
        text,
        refs: citations.map((c) => c.id),
        citations,
      };
    });

    return { ...section, lines };
  });

  return {
    ...parsed,
    sections,
    sources: Array.from(used.values()),
    has_unverified_numbers: hasUnverifiedNumbers,
  };
}

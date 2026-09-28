/**
 * Stores and updates browser-local inventory comparison exercises while preserving their audit history.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import Papa from 'papaparse';
import { z } from 'zod';
import { DEFAULT_FRAMEWORK, getFramework } from '@/data/classifications';
import { validateSelection, type ClassificationSelection } from '@/lib/sector-classification';

export const sourceIds = ['collected', 'a', 'b'] as const;
export type SourceId = typeof sourceIds[number];
const sourceId = z.enum(sourceIds);
const yearSchema = z.number().int().min(1900).max(2200);
const observationSchema = z.object({ category: z.string().min(1), district: z.string().min(1), entryId: z.string().min(1), entryName: z.string().min(1), year: yearSchema, value: z.number().finite() });
export type Observation = z.infer<typeof observationSchema>;
const sourceSchema = z.object({ id: z.enum(['collected', 'a', 'b', 'surrogate']), name: z.string().min(1), version: z.string().min(1), unit: z.string().min(1), basis: z.string().min(1), importedAt: z.string(), rows: z.array(observationSchema).min(1).max(50000) });
export type InventorySource = z.infer<typeof sourceSchema>;
const recalcSchema = z.object({ method: z.enum(['none', 'overlap', 'surrogate', 'interpolation', 'full']), start: yearSchema, change: yearSchema, overlapStart: yearSchema, overlapEnd: yearSchema, includeBase: z.boolean(), justification: z.string(), applied: z.boolean() });
export type Recalculation = z.infer<typeof recalcSchema>;
const exerciseSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1), countryCode: z.string(), name: z.string().min(1), sample: z.boolean(), updatedAt: z.string(), step: z.number().int().min(1).max(4), status: z.enum(['draft', 'ready']),
  selection: z.custom<ClassificationSelection>(), sources: z.array(sourceSchema).max(4), activeCategory: z.string(), start: yearSchema, end: yearSchema,
  thresholds: z.object({ r2: z.number().min(0).max(1), mape: z.number().min(0), bias: z.number().min(0), coverage: z.number().min(0).max(100) }),
  assignments: z.record(sourceId.or(z.literal('mix'))), decisions: z.record(sourceId.or(z.literal('exclude'))), notes: z.record(z.string()), recalculations: z.record(recalcSchema), focalPoints: z.record(z.string()), reviewer: z.string(), acknowledged: z.boolean(),
  audit: z.array(z.object({ at: z.string(), action: z.string() })),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export type SeriesPoint = { year: number; value: number | null };
export const areaKey = (category: string, district: string) => JSON.stringify([category, district]);
export const entryKey = (category: string, district: string, entry: string) => JSON.stringify([category, district, entry]);
export const exerciseKey = (country: string) => `ndc-inventory-exercises-v1:${country}`;
export const yearsIn = (start: number, end: number) => Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
export function validateExercise(raw: unknown, country: string): Exercise {
  const exercise = exerciseSchema.parse(raw);
  validateSelection(exercise.selection, country);
  if (exercise.countryCode !== country || exercise.start > exercise.end || new Set(exercise.sources.map(s => s.id)).size !== exercise.sources.length) throw new Error('Invalid exercise scope');
  for (const source of exercise.sources) validateRows(source.rows, exercise.selection.selectedCodes);
  const comparable = exercise.sources.filter(s => s.id !== 'surrogate');
  if (comparable.some(s => s.unit !== comparable[0].unit || s.basis !== comparable[0].basis)) throw new Error('Incompatible measurement basis');
  if (comparable.some(s => s.rows.some(r => r.district === 'National')) && comparable.some(s => s.rows.some(r => r.district !== 'National'))) throw new Error('National and district data cannot be mixed');
  return exercise;
}
export function readExercises(country: string): Exercise[] {
  const raw = localStorage.getItem(exerciseKey(country));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Unreadable exercises');
  const exercises = parsed.map(e => validateExercise(e, country));
  if (new Set(exercises.map(e => e.id)).size !== exercises.length) throw new Error('Duplicate exercise IDs');
  return exercises;
}
export function writeExercises(country: string, exercises: Exercise[]) {
  const validated = exercises.map(e => validateExercise(e, country));
  localStorage.setItem(exerciseKey(country), JSON.stringify(validated));
}
export function createExercise(countryCode: string, name: string, selection?: ClassificationSelection): Exercise {
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: crypto.randomUUID(), countryCode, name: name.trim(), sample: false, updatedAt: now, step: 1, status: 'draft',
    selection: selection ?? { schemaVersion: 1, countryCode, frameworkId: DEFAULT_FRAMEWORK.id, hierarchyVersion: DEFAULT_FRAMEWORK.version!, selectedCodes: [], savedAt: now },
    sources: [], activeCategory: selection?.selectedCodes[0] ?? '', start: 2010, end: 2024,
    thresholds: { r2: .95, mape: 5, bias: 2, coverage: 90 }, assignments: {}, decisions: {}, notes: {}, recalculations: {}, focalPoints: {}, reviewer: '', acknowledged: false,
    audit: [{ at: now, action: 'Exercise created' }],
  };
}
export function reviseExercise(exercise: Exercise, patch: Partial<Exercise>, action?: string): Exercise {
  const now = new Date().toISOString();
  const affectsBasis = ['sources', 'selection', 'assignments', 'decisions', 'start', 'end', 'thresholds'].some(key => key in patch);
  const substantive = affectsBasis || ['recalculations', 'notes', 'focalPoints', 'reviewer'].some(key => key in patch);
  return { ...exercise, ...patch, updatedAt: now,
    ...(substantive ? { status: 'draft' as const, acknowledged: false } : {}),
    ...(affectsBasis ? { recalculations: Object.fromEntries(Object.entries(exercise.recalculations).map(([key, value]) => [key, { ...value, applied: false }])) } : {}),
    audit: action ? [...exercise.audit, { at: now, action }] : exercise.audit,
  };
}
function validateRows(rows: Observation[], categories: string[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!categories.includes(row.category)) throw new Error(`Category ${row.category} is outside this exercise. Select it in step 1 first.`);
    const key = JSON.stringify([row.category, row.district, row.entryId, row.year]);
    if (keys.has(key)) throw new Error(`Duplicate observation: ${row.category}, ${row.district}, ${row.entryId}, ${row.year}.`);
    keys.add(key);
  }
  if (rows.some(r => r.district === 'National') && rows.some(r => r.district !== 'National')) throw new Error('Use either National totals or district observations, never both in one source.');
}
export const CSV_TEMPLATE = 'category,district,entry_id,entry_name,year,value,unit,basis\n';
export function parseSourceCsv(text: string, meta: Pick<InventorySource, 'id' | 'name' | 'version'>, exercise: Exercise): InventorySource {
  if (!meta.name.trim() || !meta.version.trim()) throw new Error('Provide a source name and release or survey version.');
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim().toLowerCase() });
  if (result.errors.length) throw new Error(`CSV could not be read: ${result.errors[0].message}`);
  const required = CSV_TEMPLATE.trim().split(',');
  if (required.some(h => !result.meta.fields?.includes(h))) throw new Error(`Required columns: ${required.join(', ')}.`);
  if (!result.data.length || result.data.length > 50000) throw new Error('Import between 1 and 50,000 observations.');
  let unit = '', basis = '';
  const rows = result.data.map((raw, index) => {
    const r = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v?.trim()]));
    if (required.some(h => !r[h])) throw new Error(`Row ${index + 2}: every required field must have a value. Missing values must be omitted, not entered as zero.`);
    if (index === 0) { unit = r.unit; basis = r.basis; }
    if (r.unit !== unit || r.basis !== basis) throw new Error(`Row ${index + 2}: all observations must share the same unit and measurement basis.`);
    const numeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
    if (!/^\d{4}$/.test(r.year) || !numeric.test(r.value)) throw new Error(`Row ${index + 2}: year and value must be numeric.`);
    const row = observationSchema.safeParse({ category: r.category, district: r.district, entryId: r.entry_id, entryName: r.entry_name, year: Number(r.year), value: Number(r.value) });
    if (!row.success) throw new Error(`Row ${index + 2}: invalid observation, year must be 1900–2200 and value finite.`);
    return row.data;
  });
  validateRows(rows, exercise.selection.selectedCodes);
  const others = exercise.sources.filter(s => s.id !== meta.id && s.id !== 'surrogate');
  if (meta.id !== 'surrogate' && others.some(s => s.unit !== unit || s.basis !== basis)) throw new Error('Unit or basis differs from the other sources. Convert your data to the same unit, gas and GWP basis before comparing.');
  if (meta.id !== 'surrogate' && others.some(s => s.rows.some(r => r.district === 'National') !== rows.some(r => r.district === 'National'))) throw new Error('The other sources use a different geographic level. National totals cannot be compared with district observations.');
  return { ...meta, name: meta.name.trim(), version: meta.version.trim(), unit, basis, rows, importedAt: new Date().toISOString() };
}
export function districtsFor(exercise: Exercise, category: string): string[] {
  return [...new Set(exercise.sources.find(s => s.id === 'collected')?.rows.filter(r => r.category === category).map(r => r.district) ?? [])].sort();
}
export function entriesFor(exercise: Exercise, category: string, district: string) {
  const entries = new Map<string, string>();
  exercise.sources.filter(s => s.id !== 'surrogate').forEach(s => s.rows.filter(r => r.category === category && r.district === district).forEach(r => entries.set(r.entryId, r.entryName)));
  return [...entries].map(([id, name]) => ({ id, name }));
}
export function sourceSeries(exercise: Exercise, id: InventorySource['id'], category: string, district?: string): SeriesPoint[] {
  const source = exercise.sources.find(s => s.id === id);
  const areas = district ? [district] : districtsFor(exercise, category);
  const rows = source?.rows.filter(r => r.category === category && areas.includes(r.district)) ?? [];
  const expected = new Set(rows.map(r => JSON.stringify([r.district, r.entryId])));
  return yearsIn(exercise.start, exercise.end).map(year => {
    // Never compare partial geographic totals with a complete collected total.
    const yearRows = rows.filter(r => r.year === year);
    const complete = areas.length > 0 && expected.size === yearRows.length && areas.every(area => yearRows.some(r => r.district === area));
    return { year, value: complete ? rows.filter(r => r.year === year).reduce((sum, r) => sum + r.value, 0) : null };
  });
}
export function statistics(reference: SeriesPoint[], candidate: SeriesPoint[]) {
  const byYear = new Map(candidate.map(p => [p.year, p.value]));
  const pairs = reference.flatMap(p => p.value !== null && byYear.get(p.year) != null ? [{ year: p.year, reference: p.value, candidate: byYear.get(p.year)! }] : []);
  const n = pairs.length;
  const nonzero = pairs.filter(p => p.reference !== 0);
  const mean = n ? pairs.reduce((s, p) => s + p.reference, 0) / n : 0;
  const sst = pairs.reduce((s, p) => s + (p.reference - mean) ** 2, 0);
  const sse = pairs.reduce((s, p) => s + (p.candidate - p.reference) ** 2, 0);
  const denominator = pairs.reduce((s, p) => s + Math.abs(p.reference), 0);
  return { n, pairs, r2: n >= 3 && sst > 0 ? 1 - sse / sst : null,
    mape: nonzero.length ? 100 * nonzero.reduce((s, p) => s + Math.abs((p.candidate - p.reference) / p.reference), 0) / nonzero.length : null,
    bias: denominator ? 100 * pairs.reduce((s, p) => s + p.candidate - p.reference, 0) / denominator : null,
    rmse: n ? Math.sqrt(sse / n) : null, zeroCount: n - nonzero.length,
    coverage: reference.filter(p => p.value !== null).length ? 100 * n / reference.filter(p => p.value !== null).length : 0,
  };
}
export function passes(stats: ReturnType<typeof statistics>, thresholds: Exercise['thresholds']) {
  return stats.n >= 3 && stats.r2 !== null && stats.r2 >= thresholds.r2 && stats.mape !== null && stats.mape <= thresholds.mape && stats.bias !== null && Math.abs(stats.bias) <= thresholds.bias && stats.coverage >= thresholds.coverage;
}
export function bestSource(exercise: Exercise, category: string, district: string): SourceId {
  const reference = sourceSeries(exercise, 'collected', category, district);
  return exercise.sources.filter(s => s.id === 'a' || s.id === 'b').map(s => ({ id: s.id as SourceId, stats: statistics(reference, sourceSeries(exercise, s.id, category, district)) }))
    .filter(s => passes(s.stats, exercise.thresholds)).sort((a, b) => a.stats.mape! - b.stats.mape!)[0]?.id ?? 'collected';
}
export function compositeSeries(exercise: Exercise, category: string): SeriesPoint[] {
  const areas = districtsFor(exercise, category);
  const series = areas.map(district => {
    const choice = exercise.assignments[areaKey(category, district)];
    if (choice !== 'mix') return choice ? sourceSeries(exercise, choice, category, district) : yearsIn(exercise.start, exercise.end).map(year => ({ year, value: null }));
    const entries = entriesFor(exercise, category, district);
    return yearsIn(exercise.start, exercise.end).map(year => {
      let sum = 0;
      for (const entry of entries) {
        const decision = exercise.decisions[entryKey(category, district, entry.id)];
        if (!decision) return { year, value: null };
        if (decision === 'exclude') continue;
        const row = exercise.sources.find(s => s.id === decision)?.rows.find(r => r.category === category && r.district === district && r.entryId === entry.id && r.year === year);
        if (!row) return { year, value: null };
        sum += row.value;
      }
      return { year, value: sum };
    });
  });
  return yearsIn(exercise.start, exercise.end).map((year, index) => ({ year, value: areas.length && series.every(s => s[index].value !== null) ? series.reduce((sum, s) => sum + s[index].value!, 0) : null }));
}
export function defaultRecalculation(exercise: Exercise): Recalculation {
  return { method: 'none', start: exercise.start, change: exercise.end, overlapStart: Math.max(exercise.start, exercise.end - 3), overlapEnd: exercise.end - 1, includeBase: true, justification: '', applied: false };
}
export function recalculate(exercise: Exercise, category: string, config: Recalculation) {
  const reference = sourceSeries(exercise, 'collected', category);
  const target = compositeSeries(exercise, category);
  const errors: string[] = [];
  const pairs = statistics(reference, target).pairs.filter(p => p.year >= config.overlapStart && p.year <= config.overlapEnd && p.reference !== 0);
  const factor = pairs.length ? pairs.reduce((s, p) => s + p.candidate / p.reference, 0) / pairs.length : null;
  const changing = districtsFor(exercise, category).some(d => exercise.assignments[areaKey(category, d)] !== 'collected');
  if (config.method === 'none' && changing) errors.push('A new source is selected. Choose a recalculation method to document the change of basis.');
  if (config.method !== 'none' && (config.start < exercise.start || config.start >= config.change || config.change > exercise.end)) errors.push('The recalculation range must start within the exercise and end before the source change.');
  if (config.method === 'overlap' && (pairs.length < 3 || config.overlapStart > config.overlapEnd || config.overlapEnd >= config.change)) errors.push('Overlap needs at least three non-zero paired years before the source change.');
  const surrogate = sourceSeries(exercise, 'surrogate', category);
  const anchor = target.find(p => p.year === config.change)?.value;
  const indicatorAnchor = surrogate.find(p => p.year === config.change)?.value;
  if (config.method === 'surrogate' && (anchor == null || indicatorAnchor == null || indicatorAnchor === 0)) errors.push('Import an indicator with a non-zero value and a new-basis estimate in the source-change year.');
  const first = config.includeBase ? exercise.start : config.start;
  const output = reference.map((p, index) => {
    if (config.method === 'none') return p;
    if (p.year >= config.change) return target[index];
    if (p.year < first) return p;
    let value: number | null = null;
    if (config.method === 'overlap') value = p.value !== null && factor !== null ? p.value * factor : null;
    if (config.method === 'full') value = target[index].value;
    if (config.method === 'surrogate') value = surrogate[index].value !== null && anchor != null && indicatorAnchor ? anchor * surrogate[index].value! / indicatorAnchor : null;
    if (config.method === 'interpolation') {
      const known = target.filter(t => t.value !== null);
      const left = [...known].reverse().find(t => t.year <= p.year);
      const right = known.find(t => t.year >= p.year);
      if (left && right) value = left.year === right.year ? left.value : left.value! + (right.value! - left.value!) * (p.year - left.year) / (right.year - left.year);
    }
    return { year: p.year, value: value !== null && Number.isFinite(value) ? value : null };
  });
  const gaps = output.filter(p => p.value === null).map(p => p.year);
  if (gaps.length) errors.push(`Missing output for ${gaps.join(', ')}. Supply observations or change the method; gaps are never filled with zero.`);
  if (!config.justification.trim()) errors.push('Add a justification for the inventory report.');
  return { reference, target, output, errors, factor, overlapYears: pairs.map(p => p.year), partial: config.method !== 'none' && first > exercise.start };
}
export function reviewCategory(exercise: Exercise, category: string) {
  const districts = districtsFor(exercise, category);
  const assigned = districts.filter(d => !!exercise.assignments[areaKey(category, d)]).length;
  const config = exercise.recalculations[category] ?? defaultRecalculation(exercise);
  const result = recalculate(exercise, category, config);
  const issues: string[] = [];
  if (!districts.length) issues.push('Import collected reference data');
  if (assigned !== districts.length) issues.push(`${districts.length - assigned} reporting areas need a source`);
  if (!config.applied) issues.push('Apply and document the calculation');
  issues.push(...result.errors);
  if (result.partial) issues.push('Earlier years remain on the old basis; include the base year or adjust the reporting period');
  if (!exercise.focalPoints[category]?.trim()) issues.push('Assign a focal point');
  return { districts, assigned, config, result, issues, complete: issues.length === 0 };
}
export function exportPackage(exercise: Exercise) {
  return { ...exercise, exportedAt: new Date().toISOString(), storage: 'Browser-local exercise; not submitted to a remote authority',
    results: exercise.selection.selectedCodes.map(category => ({ category, ...reviewCategory(exercise, category) })),
    statisticsDefinition: { r2: '1 - sum((candidate-reference)^2) / sum((reference-mean(reference))^2); at least 3 pairs', mape: 'Mean absolute percentage error, zero reference values omitted', bias: '100 * sum(candidate-reference) / sum(abs(reference))', coverage: 'Paired years / reference years' },
  };
}
export function downloadFile(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function seriesCsv(rows: Record<string, unknown>[]) { return Papa.unparse(rows, { escapeFormulae: true }); }

/** Explicitly synthetic training data, isolated from all live dashboard datasets. */
export function createSampleExercise(country: string): Exercise {
  const exercise = createExercise(country, 'Livestock · guided sample');
  exercise.sample = true; exercise.step = 2;
  exercise.selection.selectedCodes = ['3.A.1']; exercise.activeCategory = '3.A.1';
  const districts = ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Arua'];
  for (const id of sourceIds) {
    const rows: Observation[] = [];
    districts.forEach((district, di) => yearsIn(2010, 2024).forEach((year, yi) => {
      for (let entry = 0; entry < 3; entry++) {
        if (id === 'b' && district === 'Lira') continue;
        const base = (12 + di * 3 + entry * 4) * (1 + yi * .055 + Math.sin(yi) * .018);
        const deviation = id === 'collected' ? 1 : id === 'a' ? (di === 2 || di === 5 || di === 7 ? 1.12 + Math.sin(yi) * .05 : 1.008 + Math.sin(yi) * .004) : di === 2 ? 1.009 : .88 + Math.sin(yi) * .025;
        rows.push({ category: '3.A.1', district, entryId: `holding-${di}-${entry}`, entryName: `Sample holding ${entry + 1}`, year, value: Number((base * deviation).toFixed(3)) });
      }
    }));
    exercise.sources.push({ id, name: id === 'collected' ? 'Collected National Data' : `Series ${id.toUpperCase()} · sample estimates`, version: 'Synthetic training dataset v1', unit: 'Gg CO₂e', basis: 'Sample CO₂e · AR5 GWP100', importedAt: exercise.updatedAt, rows });
  }
  exercise.audit.push({ at: exercise.updatedAt, action: 'Loaded synthetic sample data for eight illustrative reporting areas' });
  return exercise;
}

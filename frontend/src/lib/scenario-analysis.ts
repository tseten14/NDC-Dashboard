import { z } from 'zod';
import { getFramework } from '@/data/classifications';
import { flattenSectors } from './sector-classification';
import { areaKey, createSampleExercise, defaultRecalculation, entriesFor, entryKey, reviewCategory, yearsIn, type Exercise } from './inventory-workspace';

const year = z.number().int().min(1900).max(2250);
const finite = z.number().finite();
export const safeEvidenceUrl = (url: string) => { try { return ['https:', 'http:'].includes(new URL(url).protocol); } catch { return false; } };
const evidenceSchema = z.object({ id: z.string(), title: z.string().min(1), url: z.string().refine(url => !url || safeEvidenceUrl(url)), passage: z.string().min(1), source: z.string(), level: z.enum(['national', 'subnational']), stance: z.enum(['requires', 'supports', 'restricts', 'forbids', 'mentions']), confirmed: z.boolean(), retrievedAt: z.string(), sample: z.boolean() });
export type PolicyEvidence = z.infer<typeof evidenceSchema>;
const policySchema = z.object({ evidence: z.array(evidenceSchema), decision: z.enum(['pending', 'include', 'conditional', 'exclude']), flag: z.enum(['none', 'barrier', 'gap']), note: z.string(), reviewed: z.boolean() });
const actionSchema = z.object({ id: z.string(), title: z.string().min(1), description: z.string(), category: z.string(), source: z.string(), evidence: z.string(), searchTerm: z.string(), reductionPct: finite.min(0).max(100).nullable(), costPerUnit: finite.nullable(), selected: z.boolean(), scope: z.enum(['whole', 'facilities']), facilityIds: z.array(z.string()), start: year, starts: z.record(year), uptake: z.enum(['immediate', 'gradual']), rampYears: z.number().int().min(1).max(30), policy: policySchema });
export type ScenarioAction = z.infer<typeof actionSchema>;
const basisSchema = z.object({ exerciseId: z.string(), exerciseName: z.string(), exerciseUpdatedAt: z.string(), frameworkId: z.string(), category: z.string(), categoryName: z.string(), district: z.string(), year, unit: z.string().min(1), measurementBasis: z.string().min(1), sample: z.boolean(), entries: z.array(z.object({ id: z.string(), name: z.string(), value: finite.min(0), source: z.string(), version: z.string() })).min(1), method: z.string(), justification: z.string() });
export type ScenarioBasis = z.infer<typeof basisSchema>;
const schema = z.object({ schemaVersion: z.literal(1), id: z.string(), countryCode: z.string(), name: z.string().min(1), createdAt: z.string(), updatedAt: z.string(), savedAt: z.string().nullable(), step: z.number().int().min(1).max(4), basis: basisSchema, horizon: year, annualGrowthPct: finite.min(-99).max(100), targetValue: finite.min(0).nullable(), targetSource: z.string(), currency: z.string().min(1), assumptionNote: z.string(), actions: z.array(actionSchema), audit: z.array(z.object({ at: z.string(), action: z.string() })) });
export type Scenario = z.infer<typeof schema>;
export const scenarioKey = (country: string) => `ndc-scenario-analysis-v1:${country}`;
export function validateScenario(value: unknown, country: string): Scenario {
  const s = schema.parse(value);
  const entryIds = new Set(s.basis.entries.map(e => e.id));
  if (s.countryCode !== country || s.horizon <= s.basis.year || s.horizon > s.basis.year + 50 || entryIds.size !== s.basis.entries.length || new Set(s.actions.map(a => a.id)).size !== s.actions.length) throw new Error('Invalid scenario country, period or duplicate IDs.');
  const framework = getFramework(s.basis.frameworkId);
  if (!framework || !flattenSectors(framework.hierarchy).some(n => n.code === s.basis.category && !n.children.length)) throw new Error('Unsupported inventory category.');
  for (const action of s.actions) {
    if (action.selected && action.category !== s.basis.category) throw new Error('An action belongs to another inventory category.');
    if (action.facilityIds.some(id => !entryIds.has(id)) || new Set(action.facilityIds).size !== action.facilityIds.length || Object.keys(action.starts).some(id => !entryIds.has(id))) throw new Error('Unknown or duplicate facility.');
    if (action.start <= s.basis.year || action.start > s.horizon || Object.values(action.starts).some(y => y <= s.basis.year || y > s.horizon)) throw new Error('Action timing is outside the scenario period.');
    if (!s.basis.sample && action.policy.evidence.some(e => e.sample || !safeEvidenceUrl(e.url))) throw new Error('Real scenarios need linked, non-sample policy evidence.');
  }
  return s;
}
export function readScenarios(country: string): Scenario[] {
  const raw = localStorage.getItem(scenarioKey(country));
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Unreadable scenario storage.');
  const scenarios = value.map(s => validateScenario(s, country));
  if (new Set(scenarios.map(s => s.id)).size !== scenarios.length) throw new Error('Duplicate scenario IDs.');
  return scenarios;
}
export function writeScenarios(country: string, scenarios: Scenario[]) { localStorage.setItem(scenarioKey(country), JSON.stringify(scenarios.map(s => validateScenario(s, country)))); }
export function reviseScenario(scenario: Scenario, patch: Partial<Scenario>, action?: string): Scenario {
  const substantive = Object.keys(patch).some(key => !['step', 'savedAt'].includes(key));
  const now = new Date().toISOString();
  return { ...scenario, ...patch, updatedAt: now, ...(substantive ? { savedAt: null } : {}), audit: action ? [...scenario.audit, { at: now, action }] : scenario.audit };
}
export function pinInventoryBasis(exercise: Exercise, category: string, district: string): ScenarioBasis {
  const review = reviewCategory(exercise, category);
  if (!review.complete || !review.districts.includes(district)) throw new Error('Complete the category review and select a reporting area before creating a scenario.');
  const assignment = exercise.assignments[areaKey(category, district)];
  const entries = entriesFor(exercise, category, district).flatMap(entry => {
    const choice = assignment === 'mix' ? exercise.decisions[entryKey(category, district, entry.id)] : assignment;
    if (choice === 'exclude') return [];
    const source = exercise.sources.find(s => s.id === choice);
    const row = source?.rows.find(r => r.category === category && r.district === district && r.entryId === entry.id && r.year === exercise.end);
    // A source-wide assignment includes only entries in that source, not the union of all candidates.
    if (!row && assignment !== 'mix') return [];
    if (!row) throw new Error(`Missing latest estimate for ${entry.name}.`);
    if (row.value < 0) throw new Error('This reduction model supports non-negative emissions. Removal scenarios need a separate accounting model.');
    return [{ id: entry.id, name: row.entryName, value: row.value, source: source.name, version: source.version }];
  });
  if (!entries.length || entries.every(e => e.value === 0)) throw new Error('This reporting area needs a positive emissions baseline.');
  const source = exercise.sources.find(s => s.id === 'collected')!;
  return { exerciseId: exercise.id, exerciseName: exercise.name, exerciseUpdatedAt: exercise.updatedAt, frameworkId: exercise.selection.frameworkId, category, categoryName: flattenSectors(getFramework(exercise.selection.frameworkId)!.hierarchy).find(n => n.code === category)!.label, district, year: exercise.end, unit: source.unit, measurementBasis: source.basis, sample: exercise.sample, entries, method: review.config.method, justification: review.config.justification };
}
export function inventoryBasisChanged(scenario: Scenario, exercise: Exercise): boolean {
  try {
    const current = pinInventoryBasis(exercise, scenario.basis.category, scenario.basis.district);
    // Navigation updates the exercise timestamp without changing its inventory basis.
    return JSON.stringify({ ...current, exerciseUpdatedAt: '' }) !== JSON.stringify({ ...scenario.basis, exerciseUpdatedAt: '' });
  } catch { return true; }
}
export const emptyPolicy = (): ScenarioAction['policy'] => ({ evidence: [], decision: 'pending', flag: 'none', note: '', reviewed: false });
export function newAction(basis: ScenarioBasis, title = 'New mitigation action'): ScenarioAction {
  return { id: crypto.randomUUID(), title, description: '', category: basis.category, source: 'Analyst-defined', evidence: '', searchTerm: basis.categoryName, reductionPct: null, costPerUnit: null, selected: false, scope: 'whole', facilityIds: [], start: basis.year + 1, starts: {}, uptake: 'gradual', rampYears: 3, policy: emptyPolicy() };
}
export function actionLibrary(basis: ScenarioBasis): ScenarioAction[] {
  const templates = basis.category.startsWith('3.A') ? [
    ['Feed quality and additives', 'Improve feed strategies; document the eligible animals and the evidence supporting a methane reduction.', '3.A.1', 'livestock feed'],
    ['Herd productivity improvement', 'Model the emissions effect of a productivity change while recording the output assumptions.', '3.A.1', 'livestock productivity'],
    ['Grazing management', 'Define the emissions boundary carefully. Land-carbon effects belong in the land category.', '3.A.1', 'grazing'],
    ['Anaerobic digestion of manure', 'Capture manure methane at suitable holdings. Confirm technical eligibility for each site.', '3.A.2', 'biogas manure'],
    ['Covered manure storage', 'Specify the management system and the manure emissions addressed by this measure.', '3.A.2', 'manure'],
    ['Agroforestry on grazing land', 'Account for land effects in the relevant land category, separately from livestock emissions.', '3.B.1', 'agroforestry'],
  ] : [[`Efficiency improvements · ${basis.categoryName}`, 'Define an efficiency measure and document the applicable emissions boundary.', basis.category, basis.categoryName], ['Technology replacement', 'Model a technology change with a documented reduction and implementation schedule.', basis.category, basis.categoryName], ['Operational improvements', 'Specify operational changes, site eligibility and evidence for the expected effect.', basis.category, basis.categoryName]];
  return templates.map(([title, description, category, searchTerm]) => ({ ...newAction(basis, title), description, category, searchTerm, source: 'Planning template' }));
}
export function createScenario(country: string, name: string, basis: ScenarioBasis): Scenario {
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: crypto.randomUUID(), countryCode: country, name: name.trim(), createdAt: now, updatedAt: now, savedAt: null, step: 1, basis, horizon: Math.min(2250, basis.year + 11), annualGrowthPct: 0, targetValue: null, targetSource: '', currency: 'USD', assumptionNote: '', actions: actionLibrary(basis), audit: [{ at: now, action: `Pinned ${basis.exerciseName} · ${basis.category} · ${basis.district} · ${basis.year}` }] };
}
export function affectedEntries(scenario: Scenario, action: ScenarioAction) { return scenario.basis.entries.filter(e => action.scope === 'whole' || action.facilityIds.includes(e.id)); }
export function actionIssues(s: Scenario, action: ScenarioAction): string[] {
  if (!action.selected) return [];
  const issues: string[] = [];
  if (action.category !== s.basis.category) issues.push('Action belongs to another category');
  if (action.reductionPct === null) issues.push('Enter a reduction estimate');
  if (!action.evidence.trim()) issues.push('Document the reduction evidence or assumption');
  if (!affectedEntries(s, action).length) issues.push('Choose at least one inventory entry');
  return issues;
}
export function policyIssues(action: ScenarioAction): string[] {
  if (!action.selected) return [];
  const issues: string[] = [];
  const policy = action.policy;
  if (!policy.reviewed || policy.decision === 'pending') issues.push('Complete the policy review');
  if (policy.evidence.some(e => !e.confirmed)) issues.push('Confirm each linked passage and stance');
  const constrained = policy.evidence.some(e => e.stance === 'forbids' || e.stance === 'restricts');
  if ((constrained || !policy.evidence.length || policy.flag !== 'none' || policy.decision === 'conditional' || policy.decision === 'exclude') && !policy.note.trim()) issues.push('Explain the policy gap, constraint or decision');
  if (constrained && policy.decision === 'include') issues.push('A recorded restriction needs a conditional assumption or exclusion');
  return issues;
}
export function uptakeAt(action: ScenarioAction, entry: string, year: number): number {
  const start = action.scope === 'facilities' ? action.starts[entry] ?? action.start : action.start;
  if (year < start) return 0;
  return action.uptake === 'immediate' ? 1 : Math.min(1, (year - start + 1) / action.rampYears);
}
export function calculateScenario(s: Scenario) {
  const actions = s.actions.filter(a => a.selected && a.category === s.basis.category);
  const issues = actions.flatMap(a => actionIssues(s, a).map(issue => `${a.title}: ${issue}`));
  if (!actions.length) issues.push('Select at least one action.');
  const eligible = actions.filter(a => !actionIssues(s, a).length && a.policy.decision !== 'exclude').sort((a, b) => a.id.localeCompare(b.id));
  const effects: Record<string, { annual: number; cumulative: number; cost: number | null }> = Object.fromEntries(actions.map(a => [a.id, { annual: 0, cumulative: 0, cost: a.costPerUnit == null ? null : 0 }]));
  const rows = yearsIn(s.basis.year, s.horizon).map(year => {
    let bau = 0, withActions = 0, annualCost = 0, unknownCost = false;
    for (const entry of s.basis.entries) {
      const baseline = entry.value * (1 + s.annualGrowthPct / 100) ** (year - s.basis.year);
      const applied = eligible.filter(a => a.scope === 'whole' || a.facilityIds.includes(entry.id)).map(a => ({ action: a, fraction: a.reductionPct! / 100 * uptakeAt(a, entry.id, year) }));
      const remaining = applied.reduce((fraction, a) => fraction * (1 - a.fraction), 1);
      const reduction = baseline * (1 - remaining);
      const sumFractions = applied.reduce((sum, a) => sum + a.fraction, 0);
      // Order-independent allocation of the combined reduction, so reported contributions sum to the total.
      for (const { action, fraction } of applied) {
        const contribution = sumFractions ? reduction * fraction / sumFractions : 0;
        effects[action.id].cumulative += contribution;
        if (year === s.horizon) effects[action.id].annual += contribution;
        if (action.costPerUnit == null) { if (contribution > 0) unknownCost = true; }
        else { const cost = contribution * action.costPerUnit; effects[action.id].cost! += cost; annualCost += cost; }
      }
      bau += baseline; withActions += baseline - reduction;
    }
    return { year, bau, withActions, reduction: bau - withActions, target: s.targetValue, cost: unknownCost ? null : annualCost };
  });
  const latest = rows[rows.length - 1];
  const cumulative = rows.reduce((sum, row) => sum + row.reduction, 0);
  const cost = rows.some(r => r.cost === null) ? null : rows.reduce((sum, r) => sum + r.cost!, 0);
  return { rows, effects, issues, latest, cumulative, cost, averageCost: cost !== null && cumulative > 0 ? cost / cumulative : null, reductionPct: latest.bau > 0 ? 100 * latest.reduction / latest.bau : null, targetGap: s.targetValue === null ? null : Math.max(0, latest.withActions - s.targetValue), overlapCount: s.basis.entries.filter(e => eligible.filter(a => a.scope === 'whole' || a.facilityIds.includes(e.id)).length > 1).length };
}
export function scenarioReadiness(s: Scenario) {
  const issues = calculateScenario(s).issues;
  issues.push(...s.actions.flatMap(a => policyIssues(a).map(issue => `${a.title}: ${issue}`)));
  if (!s.assumptionNote.trim()) issues.push('Document the business-as-usual assumption.');
  if (s.targetValue !== null && !s.targetSource.trim()) issues.push('Name the target source or label it as an analyst-defined target.');
  return issues;
}
export function scenarioExport(s: Scenario) { return { ...s, exportedAt: new Date().toISOString(), results: calculateScenario(s), openItems: scenarioReadiness(s), method: 'BAU grows the pinned inventory by the analyst-supplied annual rate. Actions multiply remaining emissions at each entry; uptake ramps linearly. Contributions allocate combined reductions proportionally to standalone fractions. Costs apply per allocated avoided unit; no discounting, capex or currency conversion. Targets are analyst-entered endpoint benchmarks, not a prescribed trajectory.', storage: 'Browser-local planning scenario; policy stances are analyst assessments, not legal clearance.' }; }
export function createSampleScenario(country: string): Scenario {
  const e = createSampleExercise(country);
  const category = '3.A.1';
  reviewCategory(e, category).districts.forEach(d => { e.assignments[areaKey(category, d)] = 'collected'; });
  e.recalculations[category] = { ...defaultRecalculation(e), applied: true, justification: 'Synthetic training inventory retained.' }; e.focalPoints[category] = 'Sample compiler';
  const s = createScenario(country, 'Livestock transition · sample', pinInventoryBasis(e, category, 'Arua'));
  s.annualGrowthPct = 2; s.assumptionNote = 'Illustrative 2% annual BAU growth; not a forecast.';
  s.targetValue = Number((s.basis.entries.reduce((sum, e) => sum + e.value, 0) * .8).toFixed(3)); s.targetSource = 'Illustrative target, not an official NDC allocation';
  s.actions.slice(0, 3).forEach((a, i) => { a.selected = true; a.reductionPct = [20, 12, 8][i]; a.costPerUnit = [15000, 10000, 5000][i]; a.evidence = 'Synthetic effect and cost assumptions for training only.'; a.scope = i === 1 ? 'whole' : 'facilities'; a.facilityIds = s.basis.entries.slice(0, i === 0 ? 2 : 1).map(e => e.id); a.start = s.basis.year + 2; a.starts = Object.fromEntries(a.facilityIds.map((id, index) => [id, a.start + index])); });
  s.actions[0].policy.evidence = [{ id: crypto.randomUUID(), title: 'Sample feed improvement programme', url: '', passage: 'Training example: a programme encourages improved feeding practices. This is not a real policy passage.', source: 'Synthetic training evidence', level: 'national', stance: 'supports', confirmed: false, retrievedAt: s.createdAt, sample: true }];
  s.actions[1].policy.evidence = [{ id: crypto.randomUUID(), title: 'Sample livestock movement condition', url: '', passage: 'Training example: assumed movement conditions may delay implementation. This is not a real regulation.', source: 'Synthetic training evidence', level: 'national', stance: 'restricts', confirmed: false, retrievedAt: s.createdAt, sample: true }];
  return s;
}

export function replaceAction(scenario: Scenario, action: ScenarioAction) { return scenario.actions.map(a => a.id === action.id ? action : a); }
export const stanceLabels = { requires: 'Requires', supports: 'Supports', restricts: 'Restricts', forbids: 'Forbids', mentions: 'Mentions' };

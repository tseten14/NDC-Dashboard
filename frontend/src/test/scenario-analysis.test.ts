/**
 * Verifies Scenario Analysis behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { describe, expect, it } from 'vitest';
import { areaKey, createSampleExercise, defaultRecalculation, districtsFor } from '@/lib/inventory-workspace';
import { actionIssues, calculateScenario, createSampleScenario, createScenario, inventoryBasisChanged, pinInventoryBasis, policyIssues, reviseScenario, scenarioReadiness, uptakeAt, validateScenario } from '@/lib/scenario-analysis';

function simple() {
  const s = createSampleScenario('UG');
  s.basis.entries = [{ id: 'one', name: 'One', value: 100, source: 'Collected', version: '1' }];
  s.annualGrowthPct = 0;
  s.actions = s.actions.slice(0, 2).map((a, i) => ({ ...a, selected: true, reductionPct: [20, 50][i], costPerUnit: 10, scope: 'whole', facilityIds: [], starts: {}, start: 2025, uptake: 'immediate', policy: { evidence: [], decision: 'include', flag: 'gap', note: 'Documented evidence gap.', reviewed: true } }));
  return s;
}
describe('scenario calculations', () => {
  it('multiplies remaining emissions and allocates the combined saving without order dependence', () => {
    const s = simple(); const r = calculateScenario(s);
    expect(r.rows[0].reduction).toBe(0); expect(r.latest.withActions).toBeCloseTo(40); expect(r.latest.reduction).toBeCloseTo(60);
    expect(r.cumulative).toBeCloseTo(660); expect(r.averageCost).toBeCloseTo(10); expect(r.cost).toBeCloseTo(6600);
    expect(Object.values(r.effects).reduce((sum, effect) => sum + effect.annual, 0)).toBeCloseTo(60);
    expect(calculateScenario({ ...s, actions: [...s.actions].reverse() }).rows).toEqual(r.rows);
    expect(r.overlapCount).toBe(1);
  });
  it('applies gradual uptake and distinct facility start years', () => {
    const s = simple(); const a = s.actions[0];
    a.scope = 'facilities'; a.facilityIds = ['one']; a.starts = { one: 2028 }; a.uptake = 'gradual'; a.rampYears = 4;
    expect(uptakeAt(a, 'one', 2027)).toBe(0); expect(uptakeAt(a, 'one', 2028)).toBe(.25); expect(uptakeAt(a, 'one', 2031)).toBe(1);
    s.actions = [a];
    expect(calculateScenario(s).rows.find(r => r.year === 2028).reduction).toBeCloseTo(5);
    expect(calculateScenario(s).rows.find(r => r.year === 2027).reduction).toBe(0);
  });
  it('preserves out-of-scope facilities, caps full reduction and excludes policy-blocked actions', () => {
    const s = simple(); s.basis.entries.push({ ...s.basis.entries[0], id: 'two', value: 200 });
    s.actions = [{ ...s.actions[0], scope: 'facilities', facilityIds: ['one'], reductionPct: 100 }];
    expect(calculateScenario(s).latest.withActions).toBe(200);
    s.actions[0].policy.decision = 'exclude';
    expect(calculateScenario(s).latest.reduction).toBe(0);
  });
  it('keeps unknown effects and costs explicit rather than assuming zero', () => {
    const s = simple(); s.actions[0].reductionPct = null;
    expect(actionIssues(s, s.actions[0])).toContain('Enter a reduction estimate');
    expect(calculateScenario(s).issues.join()).toMatch(/reduction estimate/);
    s.actions[0].reductionPct = 20; s.actions[0].costPerUnit = null;
    expect(calculateScenario(s).cost).toBeNull(); expect(calculateScenario(s).averageCost).toBeNull();
    s.targetValue = null; expect(calculateScenario(s).targetGap).toBeNull();
  });
  it('computes BAU growth and the target gap from the pinned baseline', () => {
    const s = simple(); s.annualGrowthPct = 2; s.targetValue = 20;
    const r = calculateScenario(s);
    expect(r.latest.bau).toBeCloseTo(100 * 1.02 ** 11);
    expect(r.latest.withActions).toBeCloseTo(r.latest.bau * .4);
    expect(r.targetGap).toBeCloseTo(r.latest.withActions - 20);
  });
});
describe('inventory basis, policy and persistence', () => {
  it('requires a reviewed inventory and pins only entries belonging to the assigned source', () => {
    const e = createSampleExercise('UG');
    expect(() => pinInventoryBasis(e, '3.A.1', 'Arua')).toThrow(/Complete/);
    districtsFor(e, '3.A.1').forEach(d => { e.assignments[areaKey('3.A.1', d)] = 'collected'; });
    e.recalculations['3.A.1'] = { ...defaultRecalculation(e), applied: true, justification: 'Reviewed' }; e.focalPoints['3.A.1'] = 'Compiler';
    const basis = pinInventoryBasis(e, '3.A.1', 'Arua');
    expect(basis.entries).toHaveLength(3);
    const scenario = createScenario('UG', 'Pinned basis', basis);
    e.updatedAt = new Date(Date.now() + 5000).toISOString();
    expect(inventoryBasisChanged(scenario, e)).toBe(false);
    const before = basis.entries[0].value;
    e.sources[0].rows.forEach(r => { r.value = 999; });
    expect(basis.entries[0].value).toBe(before);
    expect(inventoryBasisChanged(scenario, e)).toBe(true);
  });
  it('requires confirmation, a constraint decision and justification for restrictive evidence', () => {
    const s = createSampleScenario('UG'); const a = s.actions[1];
    a.policy.reviewed = true; a.policy.decision = 'include';
    expect(policyIssues(a).join()).toMatch(/Confirm each/);
    expect(policyIssues(a).join()).toMatch(/conditional assumption/);
    a.policy.evidence.forEach(e => { e.confirmed = true; }); a.policy.decision = 'conditional'; a.policy.note = 'Assumes conditions can be met before implementation.';
    expect(policyIssues(a)).toEqual([]);
  });
  it('does not turn missing policy evidence into clearance', () => {
    const s = simple(); const a = s.actions[0]; a.policy.note = '';
    expect(policyIssues(a)).toContain('Explain the policy gap, constraint or decision');
    a.policy.note = 'Manual review needed; modelling a hypothetical action.';
    expect(policyIssues(a)).toEqual([]);
  });
  it('invalidates saved results on edits while preserving them through navigation', () => {
    const s = simple(); s.savedAt = new Date().toISOString();
    expect(reviseScenario(s, { annualGrowthPct: 3 }).savedAt).toBeNull();
    expect(reviseScenario(s, { step: 2 }).savedAt).toBe(s.savedAt);
    expect(scenarioReadiness(s)).toEqual([]);
    s.assumptionNote = ''; expect(scenarioReadiness(s)).toContain('Document the business-as-usual assumption.');
  });
  it('validates countries, IDs, timing, categories and evidence links on restore', () => {
    const s = simple(); expect(validateScenario(s, 'UG').id).toBe(s.id);
    expect(() => validateScenario(s, 'KE')).toThrow();
    expect(() => validateScenario({ ...s, horizon: 2024 }, 'UG')).toThrow();
    expect(() => validateScenario({ ...s, actions: [{ ...s.actions[0], selected: true, category: '3.B.1' }] }, 'UG')).toThrow(/another/);
    expect(() => validateScenario({ ...s, actions: [{ ...s.actions[0], facilityIds: ['unknown'] }] }, 'UG')).toThrow(/facility/);
    expect(() => validateScenario({ ...s, actions: [{ ...s.actions[0], start: 2036 }] }, 'UG')).toThrow(/timing/);
    const unsafe = createSampleScenario('UG'); unsafe.actions[0].policy.evidence[0].url = 'javascript:alert(1)';
    expect(() => validateScenario(unsafe, 'UG')).toThrow();
    const real = createSampleScenario('UG'); real.basis.sample = false;
    expect(() => validateScenario(real, 'UG')).toThrow(/non-sample/);
  });
});

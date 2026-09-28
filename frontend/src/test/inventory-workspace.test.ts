/**
 * Verifies Inventory Workspace behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { describe, it, expect } from 'vitest';
import { areaKey, bestSource, compositeSeries, createSampleExercise, defaultRecalculation, districtsFor, entryKey, entriesFor, parseSourceCsv, passes, recalculate, reviewCategory, reviseExercise, sourceSeries, statistics, validateExercise, type SeriesPoint } from '@/lib/inventory-workspace';
const points = (values: (number | null)[]): SeriesPoint[] => values.map((value, i) => ({ year: 2020 + i, value }));
const assignedSample = () => {
  const e = createSampleExercise('UG');
  for (const d of districtsFor(e, '3.A.1')) e.assignments[areaKey('3.A.1', d)] = bestSource(e, '3.A.1', d);
  return e;
};
describe('inventory statistics', () => {
  it('calculates prediction R², absolute percentage error, signed bias and RMSE from paired years', () => {
    const s = statistics(points([10, 20, 30]), points([11, 22, 33]));
    expect(s.r2).toBeCloseTo(.93); expect(s.mape).toBeCloseTo(10); expect(s.bias).toBeCloseTo(10); expect(s.rmse).toBeCloseTo(Math.sqrt(14 / 3));
  });
  it('does not treat gaps as zero and reports zero denominators and insufficient pairs', () => {
    const s = statistics(points([0, 10, 20, null]), points([0, null, 22, 50]));
    expect(s.n).toBe(2); expect(s.r2).toBeNull(); expect(s.mape).toBeCloseTo(10); expect(s.zeroCount).toBe(1); expect(s.coverage).toBeCloseTo(200 / 3);
    expect(statistics(points([0, 0, 0]), points([0, 0, 0])).bias).toBeNull();
    expect(statistics(points([10, 10, 10]), points([10, 10, 10])).r2).toBeNull();
    expect(passes(s, createSampleExercise('UG').thresholds)).toBe(false);
  });
  it('does not report a partial district or incomplete entry total as a national total', () => {
    const e = createSampleExercise('UG');
    expect(sourceSeries(e, 'b', '3.A.1').every(p => p.value === null)).toBe(true);
    const collected = e.sources.find(s => s.id === 'collected')!;
    collected.rows = collected.rows.filter(r => !(r.district === 'Arua' && r.entryId === 'holding-7-1' && r.year === 2024));
    expect(sourceSeries(e, 'collected', '3.A.1').at(-1).value).toBeNull();
    expect(sourceSeries(e, 'collected', '3.A.1', 'Kampala').at(-1).value).not.toBeNull();
  });
  it('assigns the passing alternative for Mukono and retains collected for poor candidates', () => {
    const e = createSampleExercise('UG');
    expect(bestSource(e, '3.A.1', 'Mukono')).toBe('b');
    expect(bestSource(e, '3.A.1', 'Gulu')).toBe('collected');
    expect(bestSource(e, '3.A.1', 'Kampala')).toBe('a');
  });
});
describe('CSV validation and exercise isolation', () => {
  const header = 'category,district,entry_id,entry_name,year,value,unit,basis\n';
  const row = '3.A.1,Kampala,one,Holding one,2024,10,Gg CO₂e,Sample CO₂e · AR5 GWP100';
  const meta = { id: 'a' as const, name: 'Census', version: '2024 v2' };
  it('imports typed observations and rejects duplicates, missing values, incompatible units and unselected codes', () => {
    const e = createSampleExercise('UG');
    expect(parseSourceCsv(header + row, meta, e).rows[0].value).toBe(10);
    expect(() => parseSourceCsv(header + row + '\n' + row, meta, e)).toThrow(/Duplicate/);
    expect(() => parseSourceCsv(header + row.replace(',10,', ',,'), meta, e)).toThrow(/every required field/);
    expect(() => parseSourceCsv(header + row.replace('Gg CO₂e', 'head'), meta, e)).toThrow(/Unit or basis/);
    expect(() => parseSourceCsv(header + row.replace('3.A.1', '3.B.1'), meta, e)).toThrow(/outside this exercise/);
    expect(() => parseSourceCsv(header + row.replace('Kampala', 'National'), meta, e)).toThrow(/geographic level/);
    expect(() => parseSourceCsv(header + row.replace(',10,', ',Infinity,'), meta, e)).toThrow(/numeric/);
  });
  it('rejects invalid storage without silently reinterpreting source data', () => {
    const e = createSampleExercise('UG');
    expect(validateExercise(e, 'UG').id).toBe(e.id);
    expect(() => validateExercise(e, 'KE')).toThrow();
    expect(() => validateExercise({ ...e, sources: [...e.sources, e.sources[0]] }, 'UG')).toThrow();
    expect(() => validateExercise({ ...e, start: 2025 }, 'UG')).toThrow();
  });
});
describe('mixes, recalculation and review', () => {
  it('requires entry decisions and never double counts both matched sources', () => {
    const e = assignedSample();
    const original = compositeSeries(e, '3.A.1');
    e.assignments[areaKey('3.A.1', 'Kampala')] = 'mix';
    expect(compositeSeries(e, '3.A.1')[0].value).toBeNull();
    entriesFor(e, '3.A.1', 'Kampala').forEach(entry => { e.decisions[entryKey('3.A.1', 'Kampala', entry.id)] = 'a'; });
    expect(compositeSeries(e, '3.A.1')).toEqual(original);
    e.decisions[entryKey('3.A.1', 'Kampala', 'holding-0-0')] = 'exclude';
    expect(compositeSeries(e, '3.A.1')[0].value).toBeLessThan(original[0].value);
  });
  it('uses the arithmetic mean of annual overlap ratios and preserves original observations', () => {
    const e = assignedSample(); const before = JSON.stringify(e.sources);
    const config = { ...defaultRecalculation(e), method: 'overlap' as const, justification: 'Stable overlap confirmed.' };
    const result = recalculate(e, '3.A.1', config);
    const ratios = result.overlapYears.map(year => result.target.find(p => p.year === year).value / result.reference.find(p => p.year === year).value);
    expect(result.factor).toBeCloseTo(ratios.reduce((a, b) => a + b) / ratios.length);
    expect(result.output[0].value).toBeCloseTo(result.reference[0].value * result.factor);
    expect(result.output.at(-1)).toEqual(result.target.at(-1));
    expect(result.errors).toEqual([]); expect(JSON.stringify(e.sources)).toBe(before);
    expect(recalculate(e, '3.A.1', { ...config, overlapStart: 2023 }).errors.join()).toMatch(/three/);
  });
  it('interpolates only internal gaps and refuses unsupported extrapolation', () => {
    const e = assignedSample();
    Object.keys(e.assignments).forEach(key => { e.assignments[key] = 'a'; });
    const candidate = e.sources.find(s => s.id === 'a')!;
    candidate.rows = candidate.rows.filter(r => r.year !== 2015);
    const config = { ...defaultRecalculation(e), method: 'interpolation' as const, justification: 'New estimates at both endpoints.' };
    const result = recalculate(e, '3.A.1', config);
    expect(result.output.find(p => p.year === 2015).value).toBeCloseTo((result.target.find(p => p.year === 2014).value + result.target.find(p => p.year === 2016).value) / 2);
    candidate.rows = candidate.rows.filter(r => r.year !== 2010);
    expect(recalculate(e, '3.A.1', config).output[0].value).toBeNull();
    expect(recalculate(e, '3.A.1', config).errors.join()).toMatch(/2010/);
  });
  it('uses the surrogate anchor ratio and checks required indicator observations', () => {
    const e = assignedSample();
    e.sources.push({ ...e.sources[0], id: 'surrogate', name: 'Activity indicator', unit: 'head', basis: 'Census', rows: e.sources[0].rows.map(r => ({ ...r, value: r.year === 2024 ? 100 : 50 })) });
    const config = { ...defaultRecalculation(e), method: 'surrogate' as const, justification: 'Indicator relationship assessed.' };
    const result = recalculate(e, '3.A.1', config);
    expect(result.output[0].value).toBeCloseTo(result.target.at(-1).value / 2);
    e.sources.pop(); expect(recalculate(e, '3.A.1', config).errors.join()).toMatch(/indicator/);
  });
  it('requires application, complete data and focal point; changes invalidate readiness', () => {
    const e = assignedSample();
    e.recalculations['3.A.1'] = { ...defaultRecalculation(e), method: 'full', justification: 'Complete imported estimates checked.', applied: true };
    expect(reviewCategory(e, '3.A.1').issues).toContain('Assign a focal point');
    e.focalPoints['3.A.1'] = 'Inventory team';
    expect(reviewCategory(e, '3.A.1').complete).toBe(true);
    e.status = 'ready'; e.acknowledged = true;
    const changed = reviseExercise(e, { assignments: { ...e.assignments } }, 'Revised choices');
    expect(changed.status).toBe('draft'); expect(changed.acknowledged).toBe(false); expect(changed.recalculations['3.A.1'].applied).toBe(false);
    expect(reviseExercise(e, { step: 2 }).status).toBe('ready');
  });
});

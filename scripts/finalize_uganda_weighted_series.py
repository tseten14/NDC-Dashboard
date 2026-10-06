#!/usr/bin/env python3
"""Produce the final modeled Uganda source series from archived synthetic totals.

Implements the email's national -> district weighting, then gives every matched
source its own variation factor and rescales each group back to its national
total. National inputs are demo emissions, never official NDC targets.
"""
import csv
from collections import defaultdict
from decimal import Decimal, localcontext
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'data/synthetic/uganda-government-2021-2025'
SUPPORT = ROOT / 'data/synthetic/uganda-government-2021-2025-support'
REFERENCE = FOLDER / 'climate-trace-uganda-sources-2021-2025-with-district.csv'
ORIGINAL = SUPPORT / 'original_uganda_government_synthetic_2021-2025.csv'
OUTPUT = FOLDER / 'uganda_government_synthetic_2021-2025.csv'
ZERO = Decimal(0)
FACTOR_RANGE = (Decimal('0.72'), Decimal('1.35'))
DATA_LABEL = 'SYNTHETIC_DEMONSTRATION_NOT_OFFICIAL'
GENERATED_AT = '2026-10-05T00:00:00Z'
EXTRA = ('model_status', 'quantity_kind', 'allocation_level', 'allocation_component',
         'national_quantity_tco2e', 'district_weight', 'source_weight_within_district',
         'source_variation_factor', 'group_rescale_factor', 'coverage_status', 'data_label')


def read(path):
    with path.open(newline='', encoding='utf-8-sig') as stream:
        reader = csv.DictReader(stream)
        return reader.fieldnames, list(reader)


def group(row):
    return tuple(row[k] for k in ('country', 'year', 'gas', 'sector', 'subsector')) + (
        'removals' if Decimal(row['emissions_tco2e']) < 0 else 'emissions',)


def source_factors(reference, original):
    """Per-source 2021 ratio of the original synthetic file to Climate TRACE."""
    trace = {r['source_id']: Decimal(r['emissions_tco2e']) for r in reference if r['year'] == '2021'}
    factors = {}
    for row in original:
        if row['year'] != '2021' or row['source_id'] not in trace:
            continue
        base = trace[row['source_id']]
        factors[row['source_id']] = Decimal(row['emissions_tco2e']) / base if base else Decimal(1)
    return factors


def main():
    fields, reference = read(REFERENCE)
    _, original = read(ORIGINAL)
    reference_ids = {r['source_id'] for r in reference}
    original_ids = {r['source_id'] for r in original}
    omitted = reference_ids - original_ids
    synthetic_only = original_ids - reference_ids
    assert len(omitted) == 2 and len(synthetic_only) == 11, (len(omitted), len(synthetic_only))
    factors = source_factors(reference, original)
    nonzero = [f for sid, f in factors.items() if f != 1]
    assert all(FACTOR_RANGE[0] <= f <= FACTOR_RANGE[1] for f in nonzero), 'Factor outside 0.72-1.35'

    national = defaultdict(lambda: ZERO)
    synthetic_total = defaultdict(lambda: ZERO)
    for row in original:
        value = abs(Decimal(row['emissions_tco2e']))
        national[group(row)] += value
        if row['source_id'] in synthetic_only:
            synthetic_total[group(row)] += value

    matched = [r for r in reference if r['source_id'] not in omitted]
    denominator = defaultdict(lambda: ZERO)
    districts = defaultdict(lambda: ZERO)
    weighted = defaultdict(lambda: ZERO)
    for row in matched:
        assert row['district'].strip(), 'Unlocated reference requires a national remainder row'
        value = abs(Decimal(row['emissions_tco2e']))
        denominator[group(row)] += value
        districts[group(row), row['district']] += value
        weighted[group(row)] += value * factors[row['source_id']]
    rescale = {}
    for k, target in national.items():
        remaining = target - synthetic_total[k]
        assert remaining >= 0, ('Synthetic-only facilities exceed national total', k)
        assert weighted[k] > 0 or remaining == 0, ('Nonzero national input without reference weights', k)
        # weighted[k] is the group's CT total re-weighted by source factors.
        rescale[k] = remaining / (target * weighted[k] / denominator[k]) if weighted[k] else Decimal(1)

    final = []
    allocated = defaultdict(lambda: ZERO)
    for base in matched:
        row = dict(base)
        k = group(row)
        magnitude = abs(Decimal(base['emissions_tco2e']))
        total = denominator[k]
        district_total = districts[k, row['district']]
        district_weight = district_total / total if total else ZERO
        source_weight = magnitude / district_total if district_total else ZERO
        factor = factors[row['source_id']]
        sign = Decimal(-1) if k[-1] == 'removals' else Decimal(1)
        amount = sign * national[k] * district_weight * source_weight * factor * rescale[k]
        row['emissions_tco2e'] = str(amount)
        row['emissions_mtco2e'] = str(amount / Decimal(1_000_000))
        # Scale activity and capacity factor together, retaining reference factors,
        # capacities, units and the export's capacity-factor conventions.
        scale = abs(amount) / magnitude if magnitude else Decimal(1)
        for column in ('activity', 'capacity_factor'):
            row[column] = str(Decimal(base[column]) * scale)
        row['api_version'] = 'modeled-synthetic-ct-weighted'
        row['api_endpoint'] = ''
        row['extracted_at_utc'] = GENERATED_AT
        row.update(model_status='modeled',
                   quantity_kind='synthetic_government_emissions_not_ndc_target',
                   allocation_level='subsector', allocation_component=k[-1],
                   national_quantity_tco2e=str(sign * national[k]),
                   district_weight=str(district_weight),
                   source_weight_within_district=str(source_weight),
                   source_variation_factor=str(factor),
                   group_rescale_factor=str(rescale[k]),
                   coverage_status='matched', data_label=DATA_LABEL)
        final.append(row)
        allocated[k] += abs(amount)

    for base in original:
        if base['source_id'] not in synthetic_only:
            continue
        row = dict(base)
        k = group(row)
        sign = Decimal(-1) if k[-1] == 'removals' else Decimal(1)
        row['api_version'] = 'synthetic-only-facility'
        row['api_endpoint'] = ''
        row['extracted_at_utc'] = GENERATED_AT
        row.update(model_status='synthetic_facility_not_in_climate_trace',
                   quantity_kind='synthetic_government_emissions_not_ndc_target',
                   allocation_level='subsector', allocation_component=k[-1],
                   national_quantity_tco2e=str(sign * national[k]),
                   district_weight='', source_weight_within_district='',
                   source_variation_factor='', group_rescale_factor='',
                   coverage_status='synthetic_only', data_label=DATA_LABEL)
        final.append(row)
        allocated[k] += abs(Decimal(row['emissions_tco2e']))

    validate(final, national, allocated, omitted, synthetic_only, reference)
    with OUTPUT.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=[*fields, *EXTRA], lineterminator='\n')
        writer.writeheader()
        writer.writerows(final)
    print(f'{len(final):,} modeled rows; {len(national)} national subsector/component totals preserved')
    print(f'{len(omitted)} Climate TRACE-only and {len(synthetic_only)} synthetic-only sources per year')
    print('Verified national reconciliation, factor range, coverage and district variation.')


def validate(final, national, allocated, omitted, synthetic_only, reference):
    assert len(final) == len({(r['source_id'], r['year'], r['gas']) for r in final})
    for k, target in national.items():
        assert abs(allocated[k] - target) < Decimal('0.00000001'), ('National total changed', k)
    years = {str(y) for y in range(2021, 2026)}
    for year in years:
        ids = {r['source_id'] for r in final if r['year'] == year}
        assert not ids & omitted and synthetic_only <= ids, year
    trace = {(r['source_id'], r['year']): Decimal(r['emissions_tco2e']) for r in reference}
    trace_district = defaultdict(lambda: ZERO)
    synth_district = defaultdict(lambda: ZERO)
    for r in final:
        if r['coverage_status'] != 'matched':
            continue
        k = group(r)
        trace_district[k, r['district']] += abs(trace[r['source_id'], r['year']])
        synth_district[k, r['district']] += abs(Decimal(r['emissions_tco2e']))
    ratios = defaultdict(set)
    for (k, district), value in trace_district.items():
        if value:
            ratios[k].add(round(synth_district[k, district] / value, 6))
    multi = [k for k, v in ratios.items() if len(v) > 1]
    assert multi, 'Districts still share a single ratio'
    every = {r for v in ratios.values() for r in v}
    assert min(every) < 1 < max(every), 'Need districts both above and below Climate TRACE'


if __name__ == '__main__':
    with localcontext() as ctx:
        ctx.prec = 36
        main()

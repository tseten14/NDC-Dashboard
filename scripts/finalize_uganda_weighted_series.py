#!/usr/bin/env python3
"""Produce the final modeled Uganda source series from archived synthetic totals.

Implements the email's national -> district weighting and optional source
allocation. National inputs are demo emissions, never official NDC targets.
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


def read(path):
    with path.open(newline='', encoding='utf-8-sig') as stream:
        reader = csv.DictReader(stream)
        return reader.fieldnames, list(reader)


def group(row):
    return tuple(row[k] for k in ('country', 'year', 'gas', 'sector', 'subsector')) + (
        'removals' if Decimal(row['emissions_tco2e']) < 0 else 'emissions',)


def main():
    fields, reference = read(REFERENCE)
    _, original = read(ORIGINAL)
    national = defaultdict(lambda: ZERO)
    denominator = defaultdict(lambda: ZERO)
    districts = defaultdict(lambda: ZERO)
    for row in original:
        national[group(row)] += abs(Decimal(row['emissions_tco2e']))
    for row in reference:
        assert row['district'].strip(), 'Unlocated reference requires a national remainder row'
        value = abs(Decimal(row['emissions_tco2e']))
        denominator[group(row)] += value
        districts[group(row), row['district']] += value
    assert all(denominator[k] > 0 or v == 0 for k, v in national.items()), \
        'Nonzero national input without reference weights must remain unallocated'
    final = []
    allocated = defaultdict(lambda: ZERO)
    allocated_district = defaultdict(lambda: ZERO)
    for base in reference:
        row = dict(base)
        k = group(row)
        magnitude = abs(Decimal(base['emissions_tco2e']))
        total = denominator[k]
        district_total = districts[k, row['district']]
        district_weight = district_total / total if total else ZERO
        source_weight = magnitude / district_total if district_total else ZERO
        sign = Decimal(-1) if k[-1] == 'removals' else Decimal(1)
        amount = sign * national[k] * district_weight * source_weight
        row['emissions_tco2e'] = str(amount)
        row['emissions_mtco2e'] = str(amount / Decimal(1_000_000))
        # Scale activity and capacity factor together, retaining reference factors,
        # capacities, units and the export's capacity-factor conventions.
        scale = abs(amount) / magnitude if magnitude else Decimal(1)
        for column in ('activity', 'capacity_factor'):
            row[column] = str(Decimal(base[column]) * scale)
        row['api_version'] = 'modeled-synthetic-ct-weighted'
        row['api_endpoint'] = ''
        row['extracted_at_utc'] = '2026-10-05T00:00:00Z'
        row.update(model_status='modeled',
                   quantity_kind='synthetic_government_emissions_not_ndc_target',
                   allocation_level='subsector', allocation_component=k[-1],
                   national_quantity_tco2e=str(sign * national[k]),
                   district_weight=str(district_weight),
                   source_weight_within_district=str(source_weight))
        final.append(row)
        allocated[k] += abs(amount)
        allocated_district[k, row['district']] += abs(amount)
    assert len(final) == len({(r['source_id'], r['year'], r['gas']) for r in final})
    for k, target in national.items():
        assert abs(allocated[k] - target) < Decimal('0.00000001')
    for (k, district), value in allocated_district.items():
        expected = national[k] * districts[k, district] / denominator[k] if denominator[k] else ZERO
        assert abs(value - expected) < Decimal('0.00000001')
    with OUTPUT.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(final[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(final)
    print(f'{len(final):,} modeled rows; {len(national)} national subsector/component totals preserved')
    print('Verified national reconciliation and every district allocation; reference unchanged.')


if __name__ == '__main__':
    with localcontext() as ctx:
        ctx.prec = 36
        main()

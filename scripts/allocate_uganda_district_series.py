#!/usr/bin/env python3
"""Demonstrate the emailed Climate TRACE district allocation using synthetic totals.

This does not create official NDC targets. National input is the existing
synthetic government series, aggregated separately from the weighting source.
"""
import argparse
import csv
import hashlib
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'data/synthetic/uganda-government-2021-2025'
BOUNDARIES = ROOT / 'backend/services/translator/uganda-districts.geojson'
ZERO = Decimal(0)


def read(path):
    with path.open(newline='', encoding='utf-8-sig') as stream:
        return list(csv.DictReader(stream))


def key(row, level, value):
    return (row['country'], row['year'], row['gas'], row['sector'],
            row['subsector'] if level == 'subsector' else '',
            'removals' if value < 0 else 'emissions')


def write(path, rows):
    with path.open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)


def allocate(reference, government, level, boundary_hash):
    national = defaultdict(lambda: ZERO)
    located = defaultdict(lambda: defaultdict(lambda: ZERO))
    unlocated = defaultdict(lambda: ZERO)
    counts = defaultdict(lambda: defaultdict(int))
    for row in government:
        value = Decimal(row['emissions_tco2e'])
        national[key(row, level, value)] += abs(value)
    for row in reference:
        value = Decimal(row['emissions_tco2e'])
        group = key(row, level, value)
        if row['district'].strip():
            located[group][row['district']] += abs(value)
            counts[group][row['district']] += 1
        else:
            unlocated[group] += abs(value)
    districts, totals = [], []
    for group in sorted(set(national) | set(located) | set(unlocated)):
        country, year, gas, sector, subsector, component = group
        sign = Decimal(-1) if component == 'removals' else Decimal(1)
        target = national[group]
        weights = located[group]
        denominator = sum(weights.values(), ZERO) + unlocated[group]
        common = dict(country=country, year=year, gas=gas, sector=sector,
                      subsector=subsector, aggregation_level=level, component=component,
                      quantity_kind='synthetic_government_emissions_not_ndc_target',
                      national_quantity_tco2e=str(sign * target),
                      national_input_status='synthetic',
                      weight_input_status='reference_2021' if year == '2021' else 'synthetic',
                      boundary_sha256=boundary_hash,
                      boundary_status='provisional_not_team_confirmed',
                      spatial_method='point_or_reported_centroid_in_polygon',
                      model_status='modeled',
                      gap_status='not_assessed_thresholds_pending')
        allocated = ZERO
        weight_sum = ZERO
        for district, value in sorted(weights.items()):
            share = value / denominator if denominator else ZERO
            amount = target * share
            allocated += amount
            weight_sum += share
            districts.append(dict(common, district=district,
                                  reference_district_tco2e=str(sign * value),
                                  reference_national_component_tco2e=str(sign * denominator),
                                  district_weight=str(share),
                                  modeled_district_tco2e=str(sign * amount),
                                  modeled_district_mtco2e=str(sign * amount / Decimal(1_000_000)),
                                  reference_record_count=counts[group][district]))
        # Denominator includes unlocated emissions: preserve rather than redistribute remainder.
        remainder = target - allocated
        tolerance = max(Decimal('0.00000001'), target * Decimal('1e-20'))
        assert abs(allocated + remainder - target) <= tolerance
        if denominator and not unlocated[group]:
            assert abs(weight_sum - 1) < Decimal('1e-20')
            assert abs(remainder) <= tolerance
        totals.append(dict(common, reference_national_component_tco2e=str(sign * denominator),
                           reference_unlocated_tco2e=str(sign * unlocated[group]),
                           located_weight_sum=str(weight_sum),
                           allocated_district_tco2e=str(sign * allocated),
                           national_unallocated_tco2e=str(sign * remainder),
                           allocation_status='allocated' if denominator else 'unallocated_no_reference_weight',
                           reconciliation_error_tco2e=str(sign * (target - allocated - remainder))))
    return districts, totals


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--use-synthetic-national-totals', action='store_true', required=True,
                        help='Explicitly select demonstration totals; never treat them as NDC targets')
    parser.parse_args()
    reference = read(FOLDER / 'climate-trace-uganda-sources-2021-2025-with-district.csv')
    government = read(FOLDER / 'uganda_government_synthetic_2021-2025.csv')
    boundary_hash = hashlib.sha256(BOUNDARIES.read_bytes()).hexdigest()
    for level in ('sector', 'subsector'):
        districts, totals = allocate(reference, government, level, boundary_hash)
        write(FOLDER / f'uganda_modeled_district_{level}_2021-2025.csv', districts)
        write(FOLDER / f'uganda_synthetic_national_{level}_allocation_2021-2025.csv', totals)
        print(f'{level}: {len(districts):,} district rows; {len(totals)} national component rows; reconciled')


if __name__ == '__main__':
    main()

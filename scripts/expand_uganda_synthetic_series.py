#!/usr/bin/env python3
"""Expand the retained 2021 baselines into reproducible synthetic 2021–2025 series."""
import csv
import hashlib
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'data/synthetic/uganda-government-2021-2025'
FILES = ('climate-trace-uganda-sources-2021-2025-with-district.csv',
         'uganda_government_synthetic_2021-2025.csv')
SEED = 'uganda-series-20211001-v1'
GENERATED_AT = '2026-10-05T00:00:00Z'
# Illustrative annual activity changes, not estimates of actual Uganda trends.
GROWTH = {'manufacturing': .035, 'power': .025, 'transportation': .03,
          'agriculture': .018, 'waste': .025, 'buildings': .022,
          'forestry-and-land-use': -.012}


def variation(key, width):
    value = int.from_bytes(hashlib.sha256(f'{SEED}|{key}'.encode()).digest()[:8], 'big')
    return (value / (2**64 - 1) * 2 - 1) * width


def expand(baseline, government):
    result = list(baseline)
    for year in range(2022, 2026):
        for base in baseline:
            row = dict(base)
            # Related records from the same named facility share annual changes.
            facility = '|'.join(base[k] for k in ('source_name', 'latitude', 'longitude'))
            activity_scale = factor_scale = 1.0
            for step in range(2022, year + 1):
                growth = (GROWTH[base['sector']]
                          + variation(f'trend|{facility}', .025)
                          + variation(f'sector|{base["sector"]}|{step}', .015)
                          + variation(f'district|{base["district"]}|{step}', .01)
                          + variation(f'activity|{facility}|{step}', .02))
                efficiency = -.004 + variation(f'factor|{facility}|{step}', .01)
                if government:
                    growth += (variation(f'government-trend|{facility}', .02)
                               + variation(f'government-activity|{facility}|{step}', .012))
                    efficiency += variation(f'government-factor|{facility}|{step}', .006)
                activity_scale *= 1 + growth
                factor_scale *= 1 + efficiency
            row['year'] = str(year)
            for column, scale in (('activity', activity_scale),
                                  ('capacity_factor', activity_scale),
                                  ('emissions_factor', factor_scale),
                                  ('emissions_tco2e', activity_scale * factor_scale)):
                row[column] = format(float(base[column]) * scale, '.12g')
            row['emissions_mtco2e'] = format(float(row['emissions_tco2e']) / 1_000_000, '.12g')
            row['api_version'] = 'synthetic-from-2021'
            row['api_endpoint'] = ''
            row['extracted_at_utc'] = GENERATED_AT
            result.append(row)
    return result


def validate(rows, baseline):
    assert len(rows) == len(baseline) * 5
    assert rows[:len(baseline)] == baseline, '2021 baseline changed'
    assert len({(r['source_id'], r['year'], r['gas']) for r in rows}) == len(rows)
    assert {r['year'] for r in rows} == {str(y) for y in range(2021, 2026)}
    numeric = ('emissions_tco2e', 'emissions_mtco2e', 'activity',
               'emissions_factor', 'capacity', 'capacity_factor')
    for row in rows:
        assert all(math.isfinite(float(row[k])) for k in numeric)
        if row['year'] != '2021':
            assert math.isclose(float(row['emissions_mtco2e']) * 1_000_000,
                                float(row['emissions_tco2e']), rel_tol=1e-10, abs_tol=1e-8)
            assert row['api_version'] == 'synthetic-from-2021' and not row['api_endpoint']


def main():
    prepared = []
    for filename in FILES:
        path = FOLDER / filename
        with path.open(newline='', encoding='utf-8-sig') as stream:
            reader = csv.DictReader(stream)
            fields = reader.fieldnames
            baseline = [r for r in reader if r['year'] == '2021']
        assert baseline, f'Missing 2021 baseline: {path}'
        rows = expand(baseline, filename.startswith('uganda_'))
        validate(rows, baseline)
        prepared.append((path, fields, rows))
    for path, fields, rows in prepared:
        with path.open('w', newline='', encoding='utf-8') as stream:
            writer = csv.DictWriter(stream, fieldnames=fields, lineterminator='\n')
            writer.writeheader()
            writer.writerows(rows)
        print(f'{path.name}: {len(rows):,} rows; {len(rows) // 5:,} sources per year')


if __name__ == '__main__':
    main()

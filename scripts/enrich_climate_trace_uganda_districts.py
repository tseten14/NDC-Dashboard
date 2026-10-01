#!/usr/bin/env python3
"""Add an ADM2 coordinate district to the supplied Climate TRACE API CSV extract."""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / 'data/synthetic/uganda-government-2021/climate-trace-uganda-sources-2021-with-district.csv'
DISTRICTS = ROOT / 'backend/services/translator/uganda-districts.geojson'


def in_ring(x, y, ring):
    inside = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def load_polygons(path):
    polygons = []
    for feature in json.loads(path.read_text())['features']:
        geometry = feature['geometry']
        parts = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        for part in parts:
            outer = part[0]
            xs = [point[0] for point in outer]
            ys = [point[1] for point in outer]
            polygons.append((feature['properties']['shapeName'], (min(xs), min(ys), max(xs), max(ys)), outer, part[1:]))
    return polygons


def locate_district(row, polygons, cache):
    x, y = float(row['longitude']), float(row['latitude'])
    key = (x, y)
    if key not in cache:
        found = []
        for name, (west, south, east, north), outer, holes in polygons:
            if west <= x <= east and south <= y <= north and in_ring(x, y, outer):
                if not any(in_ring(x, y, hole) for hole in holes):
                    found.append(name)
        names = sorted(set(found))
        if len(names) != 1:
            raise ValueError(f'Expected one ADM2 district at {key}, found {names}')
        cache[key] = names[0]
    return cache[key]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path, help='Supplied Climate TRACE Uganda API CSV extract')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    raw = args.reference.read_bytes()
    dialect = csv.Sniffer().sniff(raw.decode('utf-8-sig')[:12000])
    with args.reference.open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        columns = reader.fieldnames
        if columns is None or 'district' in columns:
            raise ValueError('Expected the original Climate TRACE schema without a district column')
        rows = [row for row in reader if row['country'] == 'UGA' and row['year'] == '2021']
    if not rows or len({(r['source_id'], r['year'], r['gas']) for r in rows}) != len(rows):
        raise ValueError('The 2021 Uganda extract is empty or has duplicate observations')
    polygons = load_polygons(DISTRICTS)
    cache = {}
    for row in rows:
        row['district'] = locate_district(row, polygons, cache)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', encoding='utf-8-sig' if raw.startswith(b'\xef\xbb\xbf') else 'utf-8', newline='') as output:
        output_columns = [columns[0], 'district', *columns[1:]]
        writer = csv.DictWriter(output, fieldnames=output_columns, dialect=dialect, lineterminator='\r\n' if b'\r\n' in raw else '\n')
        writer.writeheader()
        writer.writerows(rows)
    with args.output.open(encoding='utf-8-sig', newline='') as output:
        reader = csv.DictReader(output)
        saved = list(reader)
        assert reader.fieldnames == output_columns
    assert saved == rows
    print(f'Wrote {len(saved)} unmodified 2021 Climate TRACE observations plus district to {args.output}')
    print(f'{len(cache)} unique coordinates; {len(set(row["district"] for row in saved))} ADM2 districts; 0 unresolved')


if __name__ == '__main__':
    main()

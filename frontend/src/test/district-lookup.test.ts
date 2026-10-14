/** Checks polygon membership with reversed rings, holes, outside coordinates and the actual map geometry. */
import { expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { createDistrictLookup } from "@/lib/district-lookup";
import uganda from "@/data/uganda-adm2.geo.json";

it("finds separate polygons regardless of ring winding, excludes holes and preserves edge membership", () => {
  const lookup = createDistrictLookup({ type: "FeatureCollection", features: [
    { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[0,0],[2,0],[2,2],[0,2],[0,0]], [[0.5,0.5],[1.5,0.5],[1.5,1.5],[0.5,1.5],[0.5,0.5]]] } },
    { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: [[[[3,0],[3,2],[5,2],[5,0],[3,0]]]] } },
  ] });
  expect(lookup(0.25, 0.25)).toBe(0);
  expect(lookup(4, 1)).toBe(1);
  expect(lookup(1, 1)).toBe(-1);
  expect(lookup(2, 1)).toBe(0);
  expect(lookup(40, 30)).toBe(-1);
  expect(lookup(NaN, 1)).toBe(-1);
  expect(lookup(4, 1)).toBe(1);
});

it("matches uncached polygon tests across Uganda rather than treating the polygons as the rest of the world", () => {
  const data = uganda as FeatureCollection<Polygon | MultiPolygon>;
  const lookup = createDistrictLookup(data);
  const matches = new Set<number>();
  for (let lat = -1.5; lat <= 4.3; lat += 0.3) for (let lng = 29.5; lng <= 35.1; lng += 0.3) {
    const expected = data.features.findIndex((feature) => booleanPointInPolygon([lng, lat], feature));
    expect(lookup(lng, lat)).toBe(expected);
    if (expected >= 0) matches.add(expected);
  }
  expect(matches.size).toBeGreaterThan(50);
  expect(lookup(0, 0)).toBe(-1);
});

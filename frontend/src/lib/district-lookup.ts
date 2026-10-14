/** Finds local polygon membership independent of GeoJSON ring direction, with cached bounds and point results. */
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export function createDistrictLookup(collection: FeatureCollection) {
  const polygons = collection.features.flatMap((feature, index) => {
    const geometry = feature.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return [];
    const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    for (const ring of rings) for (const [lng, lat] of ring) {
      bounds[0] = Math.min(bounds[0], lng);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lng);
      bounds[3] = Math.max(bounds[3], lat);
    }
    return [{ index, geometry: geometry as Polygon | MultiPolygon, bounds }];
  });
  const cache = new Map<string, number>();
  return (lng: number, lat: number): number => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return -1;
    const key = `${lng},${lat}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const match = polygons.find(({ bounds: [west, south, east, north], geometry }) =>
      lng >= west && lng <= east && lat >= south && lat <= north
      && booleanPointInPolygon([lng, lat], geometry),
    );
    const index = match?.index ?? -1;
    // Bound memory even if many inventories are visited in one browser session.
    if (cache.size >= 8192) cache.clear();
    cache.set(key, index);
    return index;
  };
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { area } from "@turf/area";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { booleanValid } from "@turf/boolean-valid";
import { kinks } from "@turf/kinks";
import clipping from "polygon-clipping";

export const BOUNDARY_PROVENANCE = {
  source: "Uganda Bureau of Statistics / WHO / UN OCHA, via geoBoundaries",
  year: 2020, version: "UGA-ADM2-80733802", license: "CC BY 3.0 IGO",
  url: "https://www.geoboundaries.org/api/current/gbHumanitarian/UGA/ADM2/",
  source_url: "https://data.humdata.org/dataset/cod-ab-uga",
  note: "135 district boundaries representing 2020. Subsequent administrative changes are not represented. Map outlines are simplified; analysis uses full source geometry. These identifiers are not Climate TRACE GADM IDs.",
};
export const districts = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "uganda-districts.geojson"), "utf8"));
export const districtById = new Map(districts.features.map((feature) => [feature.properties.shapeID, feature]));
const boundsById = new Map(districts.features.map((feature) => [feature.properties.shapeID, geometryBounds(feature.geometry)]));

export function geometryBounds(geometry) {
  const coordinates = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
  return coordinates.reduce((box, point) => [Math.min(box[0], point[0]), Math.min(box[1], point[1]), Math.max(box[2], point[0]), Math.max(box[3], point[1])], [Infinity, Infinity, -Infinity, -Infinity]);
}
export function pointInGeometry(point, geometry) { return booleanPointInPolygon(point, geometry); }
export function geometryAreaKm2(geometry) { return area(geometry) / 1_000_000; }
function multi(coordinates) { return { type: "MultiPolygon", coordinates }; }

export function intersectedDistricts(geometry) {
  const bounds = geometryBounds(geometry);
  const selectionArea = geometryAreaKm2(geometry);
  const results = [];
  const intersections = [];
  for (const feature of districts.features) {
    const districtBounds = boundsById.get(feature.properties.shapeID);
    if (bounds[0] > districtBounds[2] || bounds[2] < districtBounds[0] || bounds[1] > districtBounds[3] || bounds[3] < districtBounds[1]) continue;
    const intersection = clipping.intersection(geometry.coordinates, feature.geometry.coordinates);
    const overlapArea = geometryAreaKm2(multi(intersection));
    if (overlapArea <= 1e-9) continue;
    intersections.push(intersection);
    results.push({ name: feature.properties.shapeName, boundary_id: feature.properties.shapeID, overlap_km2: overlapArea, overlap_pct: overlapArea / selectionArea * 100 });
  }
  const outsideArea = intersections.length ? geometryAreaKm2(multi(clipping.difference(geometry.coordinates, ...intersections))) : selectionArea;
  return { districts: results.sort((first, second) => second.overlap_km2 - first.overlap_km2), outside_area_km2: outsideArea };
}

export function validateTranslatorGeometry(geometry) {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type) || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length) return { ok: false, error: "geometry_must_be_polygon" };
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let vertices = 0;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) return { ok: false, error: "invalid_polygon" };
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) return { ok: false, error: "polygon_must_be_closed" };
      vertices += ring.length;
      if (vertices > 512) return { ok: false, error: "geometry_too_complex" };
      if (ring.some((point) => !Array.isArray(point) || point.length !== 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90)) return { ok: false, error: "invalid_coordinate" };
      if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) return { ok: false, error: "polygon_must_be_closed" };
      if (new Set(ring.slice(0, -1).map((point) => point.join(","))).size < 3) return { ok: false, error: "polygon_needs_three_vertices" };
    }
  }
  try {
    if (kinks(geometry).features.length) return { ok: false, error: "polygon_self_intersects" };
    if (!booleanValid(geometry)) return { ok: false, error: "invalid_polygon" };
    for (const polygon of polygons) {
      for (let index = 1; index < polygon.length; index++) {
        if (!pointInGeometry(polygon[index][0], { type: "Polygon", coordinates: [polygon[0]] })) return { ok: false, error: "invalid_polygon_holes" };
        for (let other = 1; other < index; other++) {
          if (clipping.intersection([polygon[index]], [polygon[other]]).length) return { ok: false, error: "invalid_polygon_holes" };
        }
      }
    }
    for (let index = 1; index < polygons.length; index++) {
      for (let other = 0; other < index; other++) {
        if (clipping.intersection(polygons[index], polygons[other]).length) return { ok: false, error: "overlapping_polygons" };
      }
    }
    const areaKm2 = geometryAreaKm2(geometry);
    if (!Number.isFinite(areaKm2) || areaKm2 <= 1e-9) return { ok: false, error: "polygon_has_no_area" };
    if (areaKm2 > 300_000) return { ok: false, error: "polygon_too_large" };
    const overlap = intersectedDistricts(geometry);
    if (overlap.outside_area_km2 > Math.max(1e-6, areaKm2 * 1e-8)) return { ok: false, error: "polygon_must_be_inside_uganda" };
    return { ok: true, areaKm2, districts: overlap.districts };
  } catch { return { ok: false, error: "invalid_polygon" }; }
}

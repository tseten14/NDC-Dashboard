import { useEffect, useRef } from "react";
import * as maplibregl from "@/lib/maplibre";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import type { MapSourcePoint, TranslatorGeometry } from "@/lib/api";
import { sourceKey } from "@/lib/translator";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  mode: "draw" | "district";
  draft: [number, number][];
  geometry: TranslatorGeometry | null;
  selectedDistrictId?: string;
  districts?: FeatureCollection<TranslatorGeometry>;
  points: MapSourcePoint[];
  insideKeys: Set<string>;
  showDistricts: boolean;
  showSources: boolean;
  onAddPoint: (point: [number, number]) => void;
  onFinish: () => void;
  onClear: () => void;
  onSelectDistrict: (geometry: TranslatorGeometry, label: string, id: string) => void;
  onError: (message: string) => void;
}

export default function DistrictTranslatorMap(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current, center: [32.4, 1.37], zoom: 6.2, minZoom: 5, maxZoom: 18,
        doubleClickZoom: false,
        style: { version: 8, sources: { basemap: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "basemap", type: "raster", source: "basemap" }] },
      });
    } catch { propsRef.current.onError("The map could not start. Check that your browser supports WebGL."); return; }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    let ready = false;
    let focusedDistrictId: string | undefined;
    let previous: Props | undefined;
    const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
    const sync = () => {
      if (!ready) return;
      const current = propsRef.current;
      const draft: FeatureCollection<Geometry> = { type: "FeatureCollection", features: [] };
      if (!current.geometry) {
        if (current.draft.length > 1) draft.features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: current.draft } });
        for (const point of current.draft) draft.features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: point } });
      }
      if (!previous || current.districts !== previous.districts) (map.getSource("districts") as GeoJSONSource).setData(current.districts ?? empty);
      if (!previous || current.draft !== previous.draft || current.geometry !== previous.geometry) (map.getSource("draft") as GeoJSONSource).setData(draft);
      if (!previous || current.geometry !== previous.geometry) (map.getSource("selection") as GeoJSONSource).setData(current.geometry ? { type: "Feature", properties: {}, geometry: current.geometry } : empty);
      if (!previous || current.points !== previous.points || current.insideKeys !== previous.insideKeys) (map.getSource("trace") as GeoJSONSource).setData({ type: "FeatureCollection", features: current.points.map((point) => ({ type: "Feature", geometry: { type: "Point", coordinates: [point.lng, point.lat] }, properties: { inside: current.insideKeys.has(sourceKey(point)) ? 1 : 0 } })) });
      for (const id of ["district-fill", "district-lines", "district-hover"]) map.setLayoutProperty(id, "visibility", current.showDistricts || current.mode === "district" ? "visible" : "none");
      map.setFilter("district-hover", ["==", ["get", "shapeID"], ""]);
      map.setLayoutProperty("trace-points", "visibility", current.showSources ? "visible" : "none");
      map.setPaintProperty("trace-points", "circle-opacity", current.geometry ? ["case", ["==", ["get", "inside"], 1], 0.95, 0.15] : 0.65);
      map.getCanvas().style.cursor = current.mode === "draw" && !current.geometry ? "crosshair" : "";
      map.getCanvas().setAttribute("aria-label", current.mode === "draw"
        ? "District map. Arrow keys pan; Enter adds a point at the center; Shift Enter finishes; Escape clears."
        : "District map. Click a district boundary to select it; arrow keys pan the map.");
      if (current.selectedDistrictId && current.selectedDistrictId !== focusedDistrictId && current.geometry) {
        const coordinates = current.geometry.type === "Polygon" ? current.geometry.coordinates.flat() : current.geometry.coordinates.flat(2);
        const bounds = new maplibregl.LngLatBounds();
        for (const point of coordinates) bounds.extend([point[0], point[1]]);
        map.fitBounds(bounds, { padding: 35, maxZoom: 12, duration: 0 });
      }
      focusedDistrictId = current.selectedDistrictId;
      previous = current;
    };
    syncRef.current = sync;
    map.on("load", () => {
      for (const id of ["districts", "selection", "draft", "trace"]) map.addSource(id, { type: "geojson", data: empty });
      map.addLayer({ id: "district-fill", type: "fill", source: "districts", paint: { "fill-color": "#10b981", "fill-opacity": 0.04 } });
      map.addLayer({ id: "district-lines", type: "line", source: "districts", paint: { "line-color": "#64748b", "line-width": 1, "line-opacity": 0.7 } });
      map.addLayer({ id: "district-hover", type: "fill", source: "districts", paint: { "fill-color": "#34d399", "fill-opacity": 0.2 }, filter: ["==", ["get", "shapeID"], ""] });
      map.addLayer({ id: "selection-fill", type: "fill", source: "selection", paint: { "fill-color": "#10b981", "fill-opacity": 0.2 } });
      map.addLayer({ id: "selection-line", type: "line", source: "selection", paint: { "line-color": "#047857", "line-width": 3 } });
      map.addLayer({ id: "draft-line", type: "line", source: "draft", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#f59e0b", "line-width": 3, "line-dasharray": [2, 2] } });
      map.addLayer({ id: "draft-points", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#f59e0b", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
      map.addLayer({ id: "trace-points", type: "circle", source: "trace", paint: { "circle-radius": ["case", ["==", ["get", "inside"], 1], 5, 3], "circle-color": ["case", ["==", ["get", "inside"], 1], "#ef4444", "#64748b"], "circle-stroke-color": "#fff", "circle-stroke-width": 0.5 } });
      ready = true;
      sync();
    });
    map.on("error", () => propsRef.current.onError("Some map tiles could not load. District selection and analysis may still be available."));
    map.on("mousemove", "district-fill", (event) => {
      if (propsRef.current.mode !== "district") return;
      map.setFilter("district-hover", ["==", ["get", "shapeID"], event.features?.[0]?.properties?.shapeID ?? ""]);
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "district-fill", () => {
      if (!ready) return;
      map.setFilter("district-hover", ["==", ["get", "shapeID"], ""]);
    });
    map.on("click", (event) => {
      if (!ready) return;
      const current = propsRef.current;
      if (current.mode === "draw") { if (!current.geometry) current.onAddPoint([event.lngLat.lng, event.lngLat.lat]); return; }
      const hit = map.queryRenderedFeatures(event.point, { layers: ["district-fill"] })[0];
      const feature = current.districts?.features.find((entry) => entry.properties?.shapeID === hit?.properties?.shapeID);
      if (feature) current.onSelectDistrict(feature.geometry, feature.properties.shapeName, feature.properties.shapeID);
    });
    map.on("dblclick", (event) => {
      event.preventDefault();
      if (propsRef.current.mode === "draw" && !propsRef.current.geometry) propsRef.current.onFinish();
    });
    const canvas = map.getCanvas();
    const keydown = (event: KeyboardEvent) => {
      if (propsRef.current.mode !== "draw") return;
      if (event.key === "Escape") { event.preventDefault(); propsRef.current.onClear(); }
      if (event.key !== "Enter" || propsRef.current.geometry) return;
      event.preventDefault();
      if (event.shiftKey) propsRef.current.onFinish();
      else { const center = map.getCenter(); propsRef.current.onAddPoint([center.lng, center.lat]); }
    };
    canvas.addEventListener("keydown", keydown);
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); canvas.removeEventListener("keydown", keydown); syncRef.current = () => {}; map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => { syncRef.current(); }, [props]);
  return <div ref={containerRef} className="h-full min-h-[32rem] w-full" aria-label="District Translator map" />;
}

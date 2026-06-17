import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { MapLayerMouseEvent, GeoJSONSource } from "maplibre-gl";
import type { MapSourcePoint } from "@/lib/api";
import { cn } from "@/lib/utils";
import ugandaGeo from "@/data/uganda-adm2.geo.json";
import "maplibre-gl/dist/maplibre-gl.css";

const DISTRICTS = ugandaGeo as unknown as FeatureCollection;

/** Uganda extent [west, south, east, north] — used to frame the camera so the
 *  country fills the view at the correct aspect ratio regardless of container. */
const UGANDA_BOUNDS: [number, number, number, number] = [29.5, -1.6, 35.1, 4.3];
const UGANDA_CENTER: [number, number] = [32.4, 1.37];

/** Keyless basemap + terrain sources.
 *  - Esri World Imagery: free satellite raster tiles (attribution required).
 *  - AWS "terrarium" DEM (Nextzen/Mapzen terrain tiles, AWS Open Data): free
 *    elevation tiles that give the map real 3-D relief with no API token. */
const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** Circle layers are GPU-rendered, so we can afford far more points than the
 *  old Three.js globe. Still cap for hover/query budget on huge inventories. */
const MAX_RENDER_POINTS = 4000;

const DIM_COLOR = "rgba(148, 163, 184, 0.35)";

export interface EmissionsMap3DProps {
  points: MapSourcePoint[];
  maxPointMt: number;
  sectorColor: (sector: string) => string;
  highlightedSector: string | null;
  pointKey: (p: MapSourcePoint, i: number) => string;
  onPointHover: (
    p: MapSourcePoint | null,
    key: string | null,
    e?: globalThis.MouseEvent,
  ) => void;
  className?: string;
}

/** Reference bubble radius in px at mid zoom — area ∝ emissions (sqrt of the
 *  value). The circle layer scales this by zoom so bubbles shrink when zoomed
 *  out (less overlap, map stays visible) and grow when zoomed in. */
function bubbleRadiusPx(mt: number | null | undefined, maxMt: number): number {
  const v = mt ?? 0;
  if (maxMt <= 0 || v <= 0) return 2;
  return 2 + Math.sqrt(v / maxMt) * 16;
}

/** Keep largest emitters + evenly sample the rest to stay within the cap. */
function capPoints(points: MapSourcePoint[], limit: number): MapSourcePoint[] {
  if (points.length <= limit) return points;
  const sorted = [...points].sort((a, b) => (b.mtco2e ?? 0) - (a.mtco2e ?? 0));
  const head = sorted.slice(0, Math.floor(limit * 0.85));
  const tail = sorted.slice(Math.floor(limit * 0.85));
  const step = Math.max(1, Math.ceil(tail.length / (limit - head.length)));
  const sampled = tail.filter((_, i) => i % step === 0);
  return [...head, ...sampled].slice(0, limit);
}

const BUBBLE_SOURCE = "emission-bubbles";
const BUBBLE_LAYER = "emission-bubbles-circles";
const DISTRICT_SOURCE = "uganda-districts";

function titleizeLabel(s: string): string {
  return s ? s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : s;
}

function fmtMtValue(v: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v >= 1 ? v.toFixed(2) : v.toFixed(3);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

/** Build the click-popup body for a bubble from its feature properties. */
function buildPopupHtml(
  pr: Record<string, unknown>,
  sectorColor: (sector: string) => string,
): string {
  const name = escapeHtml(String(pr.name ?? "Unnamed source"));
  const sector = String(pr.sector ?? "");
  const color = sectorColor(sector);
  const sub = pr.subsector ? ` · ${escapeHtml(titleizeLabel(String(pr.subsector)))}` : "";
  const mt = pr.mtco2e == null ? null : Number(pr.mtco2e);

  return `
    <div class="emap-pop">
      <div class="emap-pop-name">${name}</div>
      <div class="emap-pop-sector">
        <span class="emap-pop-dot" style="background:${color}"></span>
        <span>${escapeHtml(titleizeLabel(sector))}${sub}</span>
      </div>
      <div class="emap-pop-value">${fmtMtValue(mt)}<span class="emap-pop-unit"> MtCO₂e / yr</span></div>
    </div>`;
}

export function EmissionsMap3D({
  points,
  maxPointMt,
  sectorColor,
  highlightedSector,
  pointKey,
  onPointHover,
  className,
}: EmissionsMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const hoverRef = useRef(onPointHover);
  // rAF handles so mousemove/resize floods collapse to at most one update per
  // frame (the hover state update re-renders the whole page, and resize during
  // the header-condense transition would otherwise thrash the GL canvas).
  const rafRef = useRef({ hover: 0, resize: 0 });
  const lastHoverKeyRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  hoverRef.current = onPointHover;

  // Kept in a ref so the click handler — registered once on mount — always
  // builds popups with the current sector palette.
  const sectorColorRef = useRef(sectorColor);
  sectorColorRef.current = sectorColor;

  // Bubbles as a GeoJSON FeatureCollection — all per-feature styling (radius,
  // colour, dimming) is precomputed into properties so the circle layer can be
  // a single GPU draw call with no per-frame JS.
  const bubbleData: FeatureCollection<Point> = useMemo(() => {
    const capped = capPoints(points, MAX_RENDER_POINTS);
    const features: Feature<Point>[] = capped.map((p, i) => {
      const dimmed = highlightedSector != null && highlightedSector !== p.sector;
      return {
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          key: pointKey(p, i),
          idx: i,
          radius: bubbleRadiusPx(p.mtco2e, maxPointMt),
          color: dimmed ? DIM_COLOR : sectorColor(p.sector),
          opacity: dimmed ? 0.35 : 0.85,
          // carry the original record so hover can reconstruct it cheaply
          name: p.name,
          sector: p.sector,
          subsector: p.subsector,
          is_asset: p.is_asset,
          mtco2e: p.mtco2e,
          lat: p.lat,
          lng: p.lng,
          srcId: p.id,
        },
      };
    });
    return { type: "FeatureCollection", features };
  }, [points, maxPointMt, highlightedSector, sectorColor, pointKey]);

  // Mount the map once.
  useEffect(() => {
    const raf = rafRef.current; // stable ref object; safe to use in cleanup
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      let maplibregl;
      try {
        const maplibre = await import("maplibre-gl");
        maplibregl = maplibre.default ?? maplibre;
      } catch {
        if (!disposed) setLoadError(true);
        return;
      }
      if (disposed || !containerRef.current) return;

      try {
      const map = new maplibregl.Map({
        container: el,
        attributionControl: { compact: true },
        center: UGANDA_CENTER,
        zoom: 6,
        pitch: 55,
        bearing: -12,
        maxPitch: 75,
        minZoom: 4.5,
        maxZoom: 12,
        dragRotate: true,
        // Cap pixel ratio — full retina is the dominant frame-time cost.
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        style: {
          version: 8,
          // glyphs only needed if we add text labels; bubbles use none.
          sources: {
            satellite: {
              type: "raster",
              tiles: [SATELLITE_TILES],
              tileSize: 256,
              maxzoom: 19,
              attribution:
                'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
            },
            terrain: {
              type: "raster-dem",
              tiles: [TERRAIN_TILES],
              tileSize: 256,
              maxzoom: 13,
              encoding: "terrarium",
              attribution: "Elevation: Nextzen / AWS Open Data",
            },
          },
          layers: [
            { id: "bg", type: "background", paint: { "background-color": "#0a0f1a" } },
            { id: "satellite", type: "raster", source: "satellite", paint: { "raster-fade-duration": 200 } },
          ],
          sky: {
            "sky-color": "#0b1220",
            "horizon-color": "#1b2a44",
            "fog-color": "#0a0f1a",
            "sky-horizon-blend": 0.5,
            "horizon-fog-blend": 0.6,
            "fog-ground-blend": 0.4,
            "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 10, 0],
          },
        } as unknown as maplibregl.StyleSpecification,
      });

      map.scrollZoom.setWheelZoomRate(1 / 200);
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

      map.on("load", () => {
        if (disposed) return;

        // Real 3-D relief from the free DEM. Best-effort: if tiles fail the map
        // simply stays flat rather than erroring.
        try {
          map.setTerrain({ source: "terrain", exaggeration: 1.4 });
        } catch {
          /* terrain optional */
        }

        // District boundaries — thin light borders, faint fill (no opaque cover).
        map.addSource(DISTRICT_SOURCE, { type: "geojson", data: DISTRICTS });
        map.addLayer({
          id: "district-fill",
          type: "fill",
          source: DISTRICT_SOURCE,
          paint: { "fill-color": "#ffffff", "fill-opacity": 0.04 },
        });
        map.addLayer({
          id: "district-line",
          type: "line",
          source: DISTRICT_SOURCE,
          paint: {
            "line-color": "rgba(255,255,255,0.55)",
            "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.4, 9, 1.1],
          },
        });

        // Emission bubbles — one GPU circle layer, styled entirely by feature
        // properties so updates are a single setData call.
        map.addSource(BUBBLE_SOURCE, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: BUBBLE_LAYER,
          type: "circle",
          source: BUBBLE_SOURCE,
          paint: {
            // Scale the per-feature reference radius by zoom: small (less
            // overlap) when zoomed out, larger when zoomed in.
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              4.5, ["*", ["get", "radius"], 0.4],
              6, ["*", ["get", "radius"], 0.7],
              9, ["get", "radius"],
              12, ["*", ["get", "radius"], 1.4],
            ],
            "circle-color": ["get", "color"],
            "circle-opacity": ["get", "opacity"],
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(255,255,255,0.7)",
            "circle-stroke-opacity": ["*", ["get", "opacity"], 0.8],
            // viewport alignment: bubbles always face the camera so they stay
            // circular and legible on the pitched 3-D view (map alignment would
            // squash them into ellipses).
            "circle-pitch-alignment": "viewport",
          },
        });

        // Hover → tooltip. The layer-scoped event already carries the features
        // under the cursor (e.features), so no queryRenderedFeatures call is
        // needed. We rAF-throttle so a flood of mousemove events causes at most
        // one parent re-render per frame.
        let pending: MapLayerMouseEvent | null = null;
        const processHover = () => {
          raf.hover = 0;
          const e = pending;
          pending = null;
          if (!e) return;
          const f = e.features?.[0];
          if (!f) {
            lastHoverKeyRef.current = null;
            hoverRef.current(null, null, e.originalEvent);
            return;
          }
          const pr = f.properties ?? {};
          const record: MapSourcePoint = {
            id: pr.srcId ?? null,
            name: pr.name ?? null,
            sector: pr.sector,
            subsector: pr.subsector ?? null,
            is_asset: pr.is_asset === true || pr.is_asset === "true",
            lat: Number(pr.lat),
            lng: Number(pr.lng),
            mtco2e: pr.mtco2e == null ? null : Number(pr.mtco2e),
          };
          lastHoverKeyRef.current = String(pr.key);
          hoverRef.current(record, String(pr.key), e.originalEvent);
        };

        map.on("mousemove", BUBBLE_LAYER, (e: MapLayerMouseEvent) => {
          pending = e;
          map.getCanvas().style.cursor = "pointer";
          if (!raf.hover) {
            raf.hover = requestAnimationFrame(processHover);
          }
        });
        map.on("mouseleave", BUBBLE_LAYER, (e: MapLayerMouseEvent) => {
          if (raf.hover) {
            cancelAnimationFrame(raf.hover);
            raf.hover = 0;
          }
          pending = null;
          lastHoverKeyRef.current = null;
          map.getCanvas().style.cursor = "";
          hoverRef.current(null, null, e?.originalEvent);
        });

        // Click → pinned popup anchored on the bubble. Hover tooltips are easy
        // to miss on the pitched 3-D view, so a click opens persistent details
        // about that source's emissions.
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: "emap-popup",
          maxWidth: "200px",
          offset: 8,
        });
        popupRef.current = popup;
        map.on("click", BUBBLE_LAYER, (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const pr = (f.properties ?? {}) as Record<string, unknown>;
          const coords: [number, number] =
            f.geometry.type === "Point"
              ? (f.geometry.coordinates as [number, number])
              : [Number(pr.lng), Number(pr.lat)];
          popup.setLngLat(coords).setHTML(buildPopupHtml(pr, sectorColorRef.current)).addTo(map);
        });

        // Frame Uganda precisely once the map knows its size.
        map.fitBounds(UGANDA_BOUNDS, { padding: 24, pitch: 55, bearing: -12, duration: 0 });

        mapRef.current = map;
        setReady(true);
      });

      // Debounce to one resize per frame: the header-condense transition fires
      // a burst of ResizeObserver callbacks that would otherwise thrash the GL
      // canvas and stutter.
      resizeObserver = new ResizeObserver(() => {
        if (raf.resize) return;
        raf.resize = requestAnimationFrame(() => {
          raf.resize = 0;
          mapRef.current?.resize();
        });
      });
      resizeObserver.observe(el);
      } catch {
        if (!disposed) setLoadError(true);
      }
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (raf.hover) cancelAnimationFrame(raf.hover);
      if (raf.resize) cancelAnimationFrame(raf.resize);
      raf.hover = 0;
      raf.resize = 0;
      if (popupRef.current) {
        try {
          popupRef.current.remove();
        } catch {
          /* best-effort */
        }
        popupRef.current = null;
      }
      const map = mapRef.current;
      if (map) {
        try {
          map.remove();
        } catch {
          /* best-effort teardown */
        }
      }
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Push new bubble data whenever points / highlight change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(BUBBLE_SOURCE) as GeoJSONSource | undefined;
    if (src) src.setData(bubbleData);
  }, [bubbleData, ready]);

  return (
    <div
      ref={containerRef}
      className={cn("emissions-map relative h-full w-full min-h-[360px] overflow-hidden bg-[#0a0f1a]", className)}
      role="img"
      aria-label="3D satellite map of Uganda; bubble size shows emissions, color shows sector"
    >
      {loadError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-[#0a0f1a] px-4 text-center">
          <span className="text-sm font-medium text-slate-200">Map failed to load</span>
          <span className="text-xs text-slate-400">
            Your browser may not support WebGL, or map tiles are unreachable.
          </span>
        </div>
      )}
    </div>
  );
}

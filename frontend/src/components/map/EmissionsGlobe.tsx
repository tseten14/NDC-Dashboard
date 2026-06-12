import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { MapSourcePoint } from "@/lib/api";
import { cn } from "@/lib/utils";
import ugandaGeo from "@/data/uganda-adm2.geo.json";

const GEO = ugandaGeo as unknown as FeatureCollection;

/** Camera aimed at Uganda — altitude ≈ zoom (lower = closer).
 *  0.5 keeps Uganda prominent while the Earth stays visible around it;
 *  closer than ~0.35 the sphere geometry and atmosphere start to glitch. */
const UGANDA_POV = { lat: 1.37, lng: 32.29, altitude: 0.5 };

/** Same assets on two CDNs — if one fails the globe goes plain white,
 *  so we preload and use whichever responds. */
const GLOBE_IMGS = [
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
];
const SKY_IMGS = [
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png",
  "https://unpkg.com/three-globe/example/img/night-sky.png",
];

/** Lower = faster. 1200 keeps every large emitter and samples the rest. */
const MAX_RENDER_POINTS = 1200;

function firstLoadableImage(urls: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) {
        resolve(null);
        return;
      }
      const url = urls[i++];
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(url);
      img.onerror = tryNext;
      img.src = url;
    };
    tryNext();
  });
}

export interface EmissionsGlobeProps {
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

type GlobePoint = MapSourcePoint & { __key: string; __r: number; __color: string };

/** Bubble radius in degrees — sized like the flat map (area ∝ emissions). */
function bubbleRadius(mt: number | null | undefined, maxMt: number): number {
  const v = mt ?? 0;
  if (maxMt <= 0 || v <= 0) return 0.05;
  return 0.05 + Math.sqrt(v / maxMt) * 0.4;
}

/** Keep largest emitters + evenly sample the rest for GPU budget. */
function capPoints(points: MapSourcePoint[], limit: number): MapSourcePoint[] {
  if (points.length <= limit) return points;
  const sorted = [...points].sort((a, b) => (b.mtco2e ?? 0) - (a.mtco2e ?? 0));
  const head = sorted.slice(0, Math.floor(limit * 0.85));
  const tail = sorted.slice(Math.floor(limit * 0.85));
  const step = Math.max(1, Math.ceil(tail.length / (limit - head.length)));
  const sampled = tail.filter((_, i) => i % step === 0);
  return [...head, ...sampled].slice(0, limit);
}

export function EmissionsGlobe({
  points,
  maxPointMt,
  sectorColor,
  highlightedSector,
  pointKey,
  onPointHover,
  className,
}: EmissionsGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const hoverRef = useRef(onPointHover);
  const [ready, setReady] = useState(false);
  const povLockedRef = useRef(false);

  hoverRef.current = onPointHover;

  const renderPoints: GlobePoint[] = useMemo(() => {
    const capped = capPoints(points, MAX_RENDER_POINTS);
    return capped.map((p, i) => {
      const dimmed = highlightedSector != null && highlightedSector !== p.sector;
      return {
        ...p,
        __key: pointKey(p, i),
        __r: bubbleRadius(p.mtco2e, maxPointMt),
        __color: dimmed ? "rgba(148, 163, 184, 0.25)" : sectorColor(p.sector),
      };
    });
  }, [points, maxPointMt, highlightedSector, sectorColor, pointKey]);

  // Mount globe once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const [{ default: Globe }, globeImg, skyImg] = await Promise.all([
        import("globe.gl"),
        firstLoadableImage(GLOBE_IMGS),
        firstLoadableImage(SKY_IMGS),
      ]);
      if (disposed || !containerRef.current) return;

      const create = Globe as unknown as () => (node: HTMLElement) => InstanceType<typeof Globe>;
      const globe = create()(el)
        .backgroundColor("#060a12")
        .showAtmosphere(true)
        .atmosphereColor("rgba(148, 163, 184, 0.22)")
        .atmosphereAltitude(0.14)
        .pointOfView(UGANDA_POV, 0);

      // Apply only textures that actually loaded — a missing texture
      // otherwise renders the whole sphere flat white.
      if (globeImg) globe.globeImageUrl(globeImg);
      if (skyImg) globe.backgroundImageUrl(skyImg);

      // Cap pixel ratio — full retina rendering is the main frame-time cost.
      globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      const controls = globe.controls();
      controls.enablePan = false;
      controls.autoRotate = false;
      // Globe radius is 100. Below ~138 the sphere mesh and atmosphere
      // shader visibly break down, so clamp zoom above that range.
      controls.minDistance = 140;
      controls.maxDistance = 480;
      controls.zoomSpeed = 0.6;

      // Google-Earth style: satellite imagery with thin light borders,
      // no opaque fill over the country.
      globe
        .polygonsData(GEO.features)
        .polygonCapColor(() => "rgba(255, 255, 255, 0.06)")
        .polygonSideColor(() => "rgba(0, 0, 0, 0)")
        .polygonStrokeColor(() => "rgba(255, 255, 255, 0.65)")
        .polygonAltitude(0.0035);

      // globe.gl types declare 2 args, but the runtime passes the mouse
      // event as a 3rd — cast to keep the event for tooltip positioning.
      globe.onPointHover(((
        pt: GlobePoint | null,
        _prev: GlobePoint | null,
        e?: globalThis.MouseEvent,
      ) => {
        if (!pt) {
          hoverRef.current(null, null, e);
          return;
        }
        hoverRef.current(pt, pt.__key, e);
      }) as unknown as (point: object | null, prevPoint: object | null) => void);

      const syncSize = () => {
        if (!containerRef.current) return;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        if (w > 0 && h > 0) globe.width(w).height(h);
      };

      syncSize();
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(el);

      globeRef.current = globe;
      setReady(true);
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      // Fully release the WebGL context. Without this, every remount
      // (route change, HMR, StrictMode) leaks a context until the browser
      // starts killing them and the scene renders as corrupted geometry.
      const globe = globeRef.current;
      if (globe) {
        try {
          globe.pauseAnimation();
          const renderer = globe.renderer?.();
          renderer?.dispose();
          renderer?.forceContextLoss?.();
        } catch {
          // best-effort GPU cleanup
        }
      }
      globeRef.current = null;
      setReady(false);
      el.innerHTML = "";
    };
  }, []);

  // Emission bubbles — flat sector-colored discs sized by emissions
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;

    globe
      .pointsData(renderPoints)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude(0.006)
      .pointRadius((d: GlobePoint) => d.__r)
      .pointColor((d: GlobePoint) => d.__color)
      .pointResolution(8)
      .pointsMerge(false);

    if (!povLockedRef.current && renderPoints.length > 0) {
      globe.pointOfView(UGANDA_POV, 900);
      povLockedRef.current = true;
    }
  }, [renderPoints, ready]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full min-h-[360px] overflow-hidden bg-[#060a12]", className)}
      role="img"
      aria-label="3D globe zoomed to Uganda; bubble size shows emissions, color shows sector"
    />
  );
}

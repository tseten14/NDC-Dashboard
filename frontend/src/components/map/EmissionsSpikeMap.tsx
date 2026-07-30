/**
 * Map: where emissions are changing fastest.
 *
 * Draws a spike at each location scaled by how much its emissions have moved,
 * making rapid change visible geographically.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { geoIdentity, geoPath, geoContains } from "d3-geo";
import type { FeatureCollection } from "geojson";
import type { MapSourcePoint } from "@/lib/api";
import { cn } from "@/lib/utils";
import ugandaGeo from "@/data/uganda-adm2.geo.json";

const GEO = ugandaGeo as unknown as FeatureCollection;
const WIDTH = 1000;
const HEIGHT = 1000;
const MAX_SPIKE_PX = 72;
const MIN_SPIKE_PX = 4;
const HIT_RADIUS = 10;

export interface EmissionsSpikeMapProps {
  points: MapSourcePoint[];
  maxPointMt: number;
  sectorColor: (sector: string) => string;
  highlightedSector: string | null;
  onPointHover: (
    p: MapSourcePoint | null,
    key: string | null,
    e?: globalThis.MouseEvent,
  ) => void;
  pointKey: (p: MapSourcePoint, i: number) => string;
  className?: string;
}

function choroplethFill(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.03) return "#f8f7f4";
  const h = 148;
  const s = 18 + clamped * 34;
  const l = 93 - clamped * 50;
  return `hsl(${h} ${s}% ${l}%)`;
}

function spikePx(mt: number | null | undefined, maxMt: number): number {
  const v = mt ?? 0;
  if (maxMt <= 0 || v <= 0) return MIN_SPIKE_PX;
  return MIN_SPIKE_PX + Math.sqrt(v / maxMt) * (MAX_SPIKE_PX - MIN_SPIKE_PX);
}

type ProjectedPoint = MapSourcePoint & { key: string; x: number; y: number; h: number };

export function EmissionsSpikeMap({
  points,
  maxPointMt,
  sectorColor,
  highlightedSector,
  onPointHover,
  pointKey,
  className,
}: EmissionsSpikeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectedRef = useRef<ProjectedPoint[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const hoverRafRef = useRef<number | null>(null);
  const lastHoverKeyRef = useRef<string | null>(null);

  const { projection, districtPaths, districtMt, maxDistrictMt } = useMemo(() => {
    const projection = geoIdentity()
      .reflectY(true)
      .fitExtent([[24, 24], [WIDTH - 24, HEIGHT - 24]], GEO);
    const pathGen = geoPath(projection);
    const districtPaths = GEO.features.map((f, idx) => ({
      d: pathGen(f) ?? "",
      key: idx,
    }));
    const districtMt = new Float64Array(GEO.features.length);
    for (const p of points) {
      const idx = findDistrictIndex(p.lng, p.lat);
      if (idx >= 0) districtMt[idx] += p.mtco2e ?? 0;
    }
    const maxDistrictMt = districtMt.reduce((m, v) => Math.max(m, v), 0);
    return { projection, districtPaths, districtMt, maxDistrictMt };
  }, [points]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    if (w <= 0 || h <= 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const sx = w / WIDTH;
    const sy = h / HEIGHT;

    ctx.save();
    ctx.scale(sx, sy);

    // Background
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, "#eef4f8");
    bg.addColorStop(0.5, "#f9f8f5");
    bg.addColorStop(1, "#eef2f8");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Districts
    for (const p of districtPaths) {
      const t = maxDistrictMt > 0 ? districtMt[p.key] / maxDistrictMt : 0;
      ctx.fillStyle = choroplethFill(t);
      ctx.strokeStyle = "#d4dde6";
      ctx.lineWidth = 0.45;
      const path = new Path2D(p.d);
      ctx.fill(path);
      ctx.stroke(path);
    }

    // Spikes — draw smallest first so large ones sit on top
    const projected: ProjectedPoint[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const xy = projection([p.lng, p.lat]);
      if (!xy) continue;
      const hPx = spikePx(p.mtco2e, maxPointMt);
      projected.push({ ...p, key: pointKey(p, i), x: xy[0], y: xy[1], h: hPx });
    }
    projected.sort((a, b) => a.h - b.h);
    projectedRef.current = projected;

    for (const p of projected) {
      const dimmed = highlightedSector != null && highlightedSector !== p.sector;
      const color = dimmed ? "rgba(100, 116, 139, 0.35)" : sectorColor(p.sector);
      const top = p.y - p.h;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, p.h * 0.04);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, top);
      ctx.stroke();

      ctx.fillStyle = dimmed ? "rgba(100, 116, 139, 0.5)" : color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [districtMt, districtPaths, highlightedSector, maxDistrictMt, maxPointMt, pointKey, points, projection, sectorColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const pickPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { w, h } = sizeRef.current;
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const y = ((clientY - rect.top) / rect.height) * HEIGHT;
    const hit = (HIT_RADIUS / Math.min(rect.width, rect.height)) * WIDTH;

    let best: ProjectedPoint | null = null;
    let bestD = hit * hit;
    for (const p of projectedRef.current) {
      const dx = p.x - x;
      const dy = p.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = p;
      }
    }
    return best;
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { clientX, clientY } = e;
      const native = e.nativeEvent;
      if (hoverRafRef.current != null) cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        const hit = pickPoint(clientX, clientY);
        const key = hit?.key ?? null;
        if (key === lastHoverKeyRef.current) return;
        lastHoverKeyRef.current = key;
        onPointHover(hit, key, native);
      });
    },
    [onPointHover, pickPoint],
  );

  const onLeave = useCallback(() => {
    if (hoverRafRef.current != null) cancelAnimationFrame(hoverRafRef.current);
    lastHoverKeyRef.current = null;
    onPointHover(null, null);
  }, [onPointHover]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block h-full w-full cursor-crosshair", className)}
      role="img"
      aria-label="Uganda emissions map; bar height shows emissions at each source"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    />
  );
}

function findDistrictIndex(lng: number, lat: number): number {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return -1;
  for (let i = 0; i < GEO.features.length; i++) {
    if (geoContains(GEO.features[i], [lng, lat])) return i;
  }
  return -1;
}

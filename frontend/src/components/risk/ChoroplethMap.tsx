/**
 * Map: districts shaded by risk.
 *
 * Colours each district by its score for the selected hazard, with a legend
 * explaining the scale.
 */
// Lightweight SVG choropleth: renders district polygons colored by selected-hazard intensity.
import { useMemo, useState } from "react";
import { riskColor, type RiskCell, type RiskDistrict } from "@/hooks/use-risk-data";

interface Props {
  districts: RiskDistrict[];
  cells: RiskCell[];
  selectedHazardId: string | null;
  onSelectDistrict?: (districtId: string) => void;
}

export function ChoroplethMap({ districts, cells, selectedHazardId, onSelectDistrict }: Props) {
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  const cellsByKey = useMemo(() => {
    const m = new Map<string, RiskCell>();
    cells.forEach(c => m.set(`${c.district_id}::${c.hazard_layer_id}`, c));
    return m;
  }, [cells]);

  // Compute bounding box across all polygons
  const { minX, minY, w, h } = useMemo(() => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    districts.forEach(d => {
      const coords = d.geojson?.coordinates?.[0] || [];
      coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    });
    if (!isFinite(minLng)) return { minX: 0, minY: 0, w: 100, h: 100 };
    const padX = (maxLng - minLng) * 0.1 || 0.5;
    const padY = (maxLat - minLat) * 0.1 || 0.5;
    return {
      minX: minLng - padX,
      minY: minLat - padY,
      w: (maxLng - minLng) + 2 * padX,
      h: (maxLat - minLat) + 2 * padY,
    };
  }, [districts]);

  // Convert lng,lat to SVG x,y (flip Y because SVG y-axis is inverted)
  const project = (lng: number, lat: number) => [lng - minX, (minY + h) - lat] as const;

  const hovered = hover ? districts.find(d => d.id === hover.id) : null;
  const hoveredCell = hover && selectedHazardId
    ? cellsByKey.get(`${hover.id}::${selectedHazardId}`) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[420px] bg-muted/30 rounded border border-border"
        preserveAspectRatio="xMidYMid meet"
      >
        {districts.map(d => {
          const coords = d.geojson?.coordinates?.[0] || [];
          const points = coords.map(([lng, lat]) => project(lng, lat).join(",")).join(" ");
          const cell = selectedHazardId ? cellsByKey.get(`${d.id}::${selectedHazardId}`) : null;
          const fill = cell ? riskColor(cell.intensity_score_0_100) : "hsl(var(--muted))";
          return (
            <polygon
              key={d.id}
              points={points}
              fill={fill}
              fillOpacity={0.75}
              stroke="hsl(var(--foreground))"
              strokeWidth={w / 400}
              style={{ cursor: "pointer" }}
              onMouseMove={e => {
                const rect = (e.target as SVGElement).ownerSVGElement!.getBoundingClientRect();
                setHover({ id: d.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectDistrict?.(d.id)}
            />
          );
        })}
      </svg>
      {hover && hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-semibold">{hovered.name}</div>
          {hoveredCell ? (
            <>
              <div>Score: <strong>{hoveredCell.intensity_score_0_100}</strong> / 100</div>
              <div>Level: {hoveredCell.risk_level}</div>
            </>
          ) : (
            <div className="text-muted-foreground">No data for selected hazard</div>
          )}
        </div>
      )}
    </div>
  );
}

export function RiskLegend() {
  const stops = [
    { label: "0–25 Low", color: riskColor(10) },
    { label: "26–50 Medium", color: riskColor(40) },
    { label: "51–75 High", color: riskColor(60) },
    { label: "76–100 Extreme", color: riskColor(90) },
  ];
  return (
    <div className="flex items-center gap-3 text-[10px]">
      <span className="text-muted-foreground uppercase tracking-wider">Risk index</span>
      {stops.map(s => (
        <div key={s.label} className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: s.color }} />
          <span className="text-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { AlertTriangle, Download, Loader2, MapPinned, MousePointer2, Pentagon, RotateCcw, Undo2, X } from "lucide-react";
import DistrictTranslatorMap from "@/components/map/DistrictTranslatorMap";
import { Button } from "@/components/ui/button";
import { emissionsApi, type TranslatorGeometry } from "@/lib/api";
import { downloadAnalysis, formatEmissions, sourceKey, translatorError } from "@/lib/translator";
import { cn } from "@/lib/utils";

function titleize(value: string) { return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export default function DistrictTranslator() {
  const [mode, setMode] = useState<"draw" | "district">("draw");
  const [draft, setDraft] = useState<[number, number][]>([]);
  const draftRef = useRef<[number, number][]>([]);
  const [selection, setSelection] = useState<{ geometry: TranslatorGeometry; name: string; districtId?: string } | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<string[] | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showSources, setShowSources] = useState(true);
  const metadata = useQuery({ queryKey: ["translator-metadata"], queryFn: ({ signal }) => emissionsApi.translatorMetadata(signal), staleTime: 3600_000 });
  const boundaries = useQuery({ queryKey: ["translator-boundaries", metadata.data?.boundary.version], queryFn: ({ signal }) => emissionsApi.translatorDistricts(signal), staleTime: Infinity, enabled: !!metadata.data });
  const selectedYear = year ?? metadata.data?.default_year;
  const mapQuery = useQuery({ queryKey: ["translator-sources", selectedYear], queryFn: ({ signal }) => emissionsApi.translatorSources(selectedYear!, signal), enabled: !!selectedYear, staleTime: 3600_000, retry: 1 });
  const analysis = useQuery({
    queryKey: ["translator-insights", selection?.districtId ?? selection?.geometry, selectedYear, selectedSectors],
    queryFn: ({ signal }) => emissionsApi.polygonInsights({ geometry: selection?.districtId ? undefined : selection!.geometry, district_id: selection?.districtId, selection_kind: selection?.districtId ? "district" : "custom", year: selectedYear!, sectors: selectedSectors ?? undefined }, signal),
    enabled: !!selection && !!selectedYear, staleTime: 3600_000, retry: false,
  });
  const result = selection ? analysis.data : undefined;
  const geometry = result?.geometry ?? selection?.geometry ?? null;
  const sectors = useMemo(() => [...new Set(mapQuery.data?.points.map((point) => point.sector) ?? [])].sort(), [mapQuery.data]);
  const visiblePoints = useMemo(() => (mapQuery.data?.points ?? []).filter((point) => selectedSectors === null || selectedSectors.includes(point.sector)), [mapQuery.data, selectedSectors]);
  const insideKeys = useMemo(() => {
    if (!geometry) return new Set<string>();
    try { return new Set(visiblePoints.filter((point) => booleanPointInPolygon([point.lng, point.lat], geometry)).map(sourceKey)); }
    catch { return new Set<string>(); }
  }, [geometry, visiblePoints]);

  const addPoint = useCallback((point: [number, number]) => {
    if (selection) return;
    if (draftRef.current.length >= 511) { setToolError("Use at most 511 points for a custom polygon."); return; }
    const previous = draftRef.current.at(-1);
    if (previous && Math.abs(previous[0] - point[0]) < 1e-7 && Math.abs(previous[1] - point[1]) < 1e-7) return;
    draftRef.current = [...draftRef.current, point];
    setDraft(draftRef.current);
    setToolError(null);
  }, [selection]);
  const finish = useCallback(() => {
    const points = draftRef.current;
    if (points.length < 3) { setToolError("Add at least three points before finishing."); return; }
    const last = points.at(-1)!;
    const ring = last[0] === points[0][0] && last[1] === points[0][1] ? points : [...points, points[0]];
    setSelection({ geometry: { type: "Polygon", coordinates: [ring] }, name: "Custom area" });
    setToolError(null);
  }, []);
  const clear = useCallback(() => {
    draftRef.current = [];
    setDraft([]);
    setSelection(null);
    setToolError(null);
  }, []);
  const undo = () => {
    if (selection?.districtId) { clear(); return; }
    if (selection) { setSelection(null); setToolError(null); return; }
    draftRef.current = draftRef.current.slice(0, -1);
    setDraft(draftRef.current);
    setToolError(null);
  };
  const selectDistrict = (nextGeometry: TranslatorGeometry, name: string, districtId: string) => {
    draftRef.current = [];
    setDraft([]);
    setSelection({ geometry: nextGeometry, name, districtId });
    setToolError(null);
  };
  const previous = result?.trend.find((entry) => entry.year === result.year - 1);
  const yoy = result?.period.complete_year && result.missing_emissions_count === 0 && previous?.complete_year && previous.status === "available" && previous.mapped_total_mtco2e > 0 && result.mapped_total_mtco2e != null ? (result.mapped_total_mtco2e - previous.mapped_total_mtco2e) / previous.mapped_total_mtco2e * 100 : null;
  const annualTrend = result?.trend.filter((entry) => entry.complete_year || entry.status === "unavailable") ?? [];
  const trendMax = Math.max(...annualTrend.map((entry) => Math.abs(entry.mapped_total_mtco2e ?? 0)), 1e-9);
  const provider = metadata.data?.providers[0];

  return <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-background p-3 md:p-4 xl:overflow-hidden">
    <nav aria-label="Translator sections" className="sticky top-0 z-20 mb-3 flex gap-1 rounded-xl border bg-card p-1 shadow-sm xl:hidden">
      {[["Area tools", "translator-tools"], ["Map", "translator-map"], ["Insights", "translator-insights"]].map(([label, id]) => <a key={id} href={`#${id}`} className="flex min-h-10 flex-1 items-center justify-center rounded-lg px-2 text-sm font-medium hover:bg-muted">{label}</a>)}
    </nav>
    <div className="grid gap-3 xl:h-full xl:min-h-0 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
      <aside id="translator-tools" tabIndex={-1} className="scroll-mt-16 rounded-xl border bg-card p-4 xl:overflow-y-auto" aria-label="Area tools">
        <div className="mb-4 flex items-center gap-2"><MapPinned className="h-5 w-5 text-emerald-600" /><div><h1 className="font-display text-lg font-bold">District Translator</h1><p className="text-xs text-muted-foreground">Turn a map area into local evidence.</p></div></div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant={mode === "district" ? "default" : "outline"} aria-pressed={mode === "district"} onClick={() => { clear(); setMode("district"); }}><MousePointer2 className="mr-1 h-4 w-4" />District</Button>
          <Button size="sm" variant={mode === "draw" ? "default" : "outline"} aria-pressed={mode === "draw"} onClick={() => { clear(); setMode("draw"); }}><Pentagon className="mr-1 h-4 w-4" />Draw</Button>
        </div>
        <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{mode === "draw" ? "Click to place vertices, then Finish or double-click. Keyboard: focus the map, pan with arrows, Enter adds the center point, Shift+Enter finishes." : "Choose a district by name or click its boundary. Calculations use the full 2020 UBOS boundary."}</p>
        {mode === "district" && <label className="mt-3 block text-xs">District<select aria-label="Select district" className="mt-1 w-full rounded-md border bg-background p-2" value={selection?.districtId ?? ""} disabled={!boundaries.data} onChange={(event) => {
          const feature = boundaries.data?.features.find((entry) => entry.properties?.shapeID === event.target.value);
          if (feature) selectDistrict(feature.geometry, feature.properties.shapeName, feature.properties.shapeID);
          else clear();
        }}><option value="">Choose district…</option>{boundaries.data?.features.slice().sort((first, second) => first.properties.shapeName.localeCompare(second.properties.shapeName)).map((feature) => <option key={feature.properties.shapeID} value={feature.properties.shapeID}>{feature.properties.shapeName}</option>)}</select></label>}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" aria-label="Undo point" onClick={undo} disabled={!draft.length && !selection}><Undo2 className="h-4 w-4" /></Button>
          <Button size="sm" onClick={finish} disabled={mode !== "draw" || draft.length < 3 || !!selection}>Finish</Button>
          <Button size="sm" variant="outline" aria-label="Clear selection" onClick={clear}><X className="h-4 w-4" /></Button>
        </div>
        <Button className="mt-2 w-full" size="sm" variant="ghost" onClick={clear}><RotateCcw className="mr-1 h-4 w-4" />Start over</Button>
        <fieldset className="mt-4 border-t pt-3"><legend className="text-xs font-bold">Year</legend><div className="flex flex-wrap gap-1">{metadata.data?.years.map((value) => <button key={value} aria-pressed={selectedYear === value} className={cn("rounded-md px-2 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500", selectedYear === value ? "bg-emerald-600 text-white" : "bg-muted")} onClick={() => setYear(value)}>{value}{value > metadata.data.default_year ? "*" : ""}</button>)}</div><p className="mt-2 text-[11px] text-muted-foreground">* Partial year. Annual comparisons use complete years.</p></fieldset>
        <fieldset className="mt-4 border-t pt-3"><legend className="text-xs font-bold">Sector filter</legend><div className="mb-2 flex gap-3"><button className="text-xs underline" onClick={() => setSelectedSectors(null)}>All sectors</button><button className="text-xs underline" onClick={() => setSelectedSectors([])}>No sectors</button></div>{sectors.map((sector) => <label key={sector} className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedSectors === null || selectedSectors.includes(sector)} onChange={(event) => setSelectedSectors((current) => event.target.checked ? [...(current ?? sectors), sector].filter((value, index, entries) => entries.indexOf(value) === index) : (current ?? sectors).filter((value) => value !== sector))} />{titleize(sector)}</label>)}</fieldset>
        <fieldset className="mt-4 border-t pt-3"><legend className="text-xs font-bold">Map layers</legend><label className="flex gap-2 text-xs"><input type="checkbox" checked={showDistricts || mode === "district"} disabled={mode === "district"} onChange={(event) => setShowDistricts(event.target.checked)} />District boundaries</label><label className="mt-2 flex gap-2 text-xs"><input type="checkbox" checked={showSources} onChange={(event) => setShowSources(event.target.checked)} />Climate TRACE sources</label></fieldset>
        {provider && <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground"><a href={provider.published_release.url} target="_blank" rel="noreferrer" className="underline">Published release {provider.published_release.version}</a> · through {provider.published_release.data_through}. Live {provider.api_version} API; the API does not report its dataset release number.</p>}
        {metadata.data && <p className="mt-3 text-[11px] text-muted-foreground">{metadata.data.boundary.note}</p>}
      </aside>

      <section id="translator-map" tabIndex={-1} className="relative min-h-[32rem] scroll-mt-16 overflow-hidden rounded-xl border bg-card xl:min-h-0" aria-label="Analysis map">
        <DistrictTranslatorMap mode={mode} draft={draft} geometry={geometry} selectedDistrictId={selection?.districtId} districts={boundaries.data} points={visiblePoints} insideKeys={insideKeys} showDistricts={showDistricts} showSources={showSources} onAddPoint={addPoint} onFinish={finish} onClear={clear} onSelectDistrict={selectDistrict} onError={setMapError} />
        <div className="pointer-events-none absolute left-3 top-3 max-w-[75%] space-y-2 text-xs" role="status">
          {(metadata.isLoading || boundaries.isLoading || mapQuery.isLoading) && <p className="rounded-lg border bg-card p-2"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Loading boundaries and Climate TRACE sources…</p>}
          {mapQuery.data && <p className="rounded-lg border bg-card p-2">{mapQuery.data.points.length.toLocaleString()} geolocated records · {mapQuery.data.period.label}</p>}
          {mapError && <p className="rounded-lg border bg-card p-2">{mapError}</p>}
          {(metadata.isError || boundaries.isError || mapQuery.isError) && <div className="pointer-events-auto rounded-lg border bg-card p-2">Data could not be loaded. <button className="underline" onClick={() => { void metadata.refetch(); void boundaries.refetch(); void mapQuery.refetch(); }}>Retry data</button></div>}
        </div>
      </section>

      <aside id="translator-insights" tabIndex={-1} className="scroll-mt-16 rounded-xl border bg-card p-4 xl:overflow-y-auto" aria-label="Area insights" aria-live="polite" aria-busy={!!selection && analysis.isFetching}>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Area insights</p><h2 className="font-display text-xl font-bold">{selection?.name ?? "Select an area"}</h2>
        {!selection && <p className="mt-6 text-sm text-muted-foreground">Draw a polygon or choose a district to calculate mapped emissions.</p>}
        {selection && analysis.isFetching && <p className="mt-4 text-sm"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Analyzing source records and available years…</p>}
        {(toolError || (selection && analysis.error)) && <div role="alert" className="mt-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{toolError ?? translatorError(analysis.error)}{selection && <Button variant="outline" size="sm" className="mt-2 block" onClick={() => void analysis.refetch()}>Retry analysis</Button>}</div>}
        {result && !analysis.isFetching && !analysis.isError && <div className="mt-4 space-y-4">
          {!result.period.complete_year && <p className="rounded-lg bg-amber-500/10 p-3 text-xs">{result.period.label}: incomplete annual coverage. A year-over-year percentage is not calculated.</p>}
          <div className="grid grid-cols-2 gap-2"><Metric label="Mapped net emissions" value={formatEmissions(result.mapped_total_mtco2e)} /><Metric label="Area" value={`${result.area_km2.toLocaleString(undefined, { maximumFractionDigits: 2 })} km²`} /><Metric label="Mapped records" value={String(result.source_count)} /><Metric label="Facilities / admin areas" value={`${result.asset_count} / ${result.administrative_source_count}`} /></div>
          <p className="text-[11px] text-muted-foreground">Emissions in CO₂e, 100-year GWP. One record represents a source and subsector.</p>
          <div className="rounded-lg border p-3 text-xs"><p>Facilities: <strong>{formatEmissions(result.asset_total_mtco2e)}</strong></p><p className="mt-1">Administrative centroids: <strong>{formatEmissions(result.administrative_total_mtco2e)}</strong></p>{result.administrative_source_count > 0 && <p className="mt-2 text-muted-foreground">Administrative values cover larger areas around their centroids. They are not precise emissions measurements within this selection.</p>}{result.unknown_source_count > 0 && <p>Unclassified: {result.unknown_source_count} records · {formatEmissions(result.unknown_total_mtco2e)}</p>}</div>
          {result.source_count === 0 && <p className="rounded-lg bg-muted p-3 text-xs">{selectedSectors?.length === 0 ? "No sectors selected. Choose All sectors to include data." : "No mapped source centroids fall inside this area for the selected filters. This does not mean the area has no emissions."}</p>}
          {result.missing_emissions_count > 0 && <p className="rounded-lg bg-amber-500/10 p-3 text-xs">{result.missing_emissions_count} records have unavailable emissions. Totals include only reported values.</p>}
          <section><h3 className="text-sm font-bold">Complete-year trend</h3>{yoy != null && <p className="text-xs">{yoy >= 0 ? "+" : ""}{yoy.toFixed(1)}% vs {result.year - 1} · source coverage may change</p>}<div className="mt-2 space-y-2">{annualTrend.map((entry) => <div key={entry.year} className="text-xs"><div className="flex justify-between"><span>{entry.year}</span><span>{formatEmissions(entry.mapped_total_mtco2e)}{entry.status === "missing_emissions" ? " (incomplete estimates)" : ""}</span></div><div className="mt-1 h-1.5 rounded bg-muted"><div className={cn("h-full rounded", (entry.mapped_total_mtco2e ?? 0) < 0 ? "bg-sky-500" : "bg-emerald-500")} style={{ width: `${Math.abs(entry.mapped_total_mtco2e ?? 0) / trendMax * 100}%` }} /></div></div>)}</div>{result.trend.some((entry) => entry.status === "unavailable") && <p className="mt-2 text-xs text-muted-foreground">Some years could not be retrieved. Retry analysis to reload them.</p>}</section>
          <section><h3 className="mb-2 text-sm font-bold">Sector breakdown</h3>{result.sectors.map((sector) => <div key={sector.sector} className="mb-2 flex justify-between gap-2 text-xs"><span>{titleize(sector.sector)}</span><span className="text-right tabular-nums">{formatEmissions(sector.mtco2e)}{sector.share_pct != null ? ` · ${sector.share_pct.toFixed(1)}%` : ""}</span></div>)}</section>
          <section><h3 className="mb-2 text-sm font-bold">Intersected districts</h3><p className="mb-2 text-[11px] text-muted-foreground">Share of selected polygon area, using full boundary intersections.</p>{result.intersected_districts.map((district) => <p key={district.boundary_id} className="mb-1 text-xs">{district.name} · {district.overlap_pct.toFixed(2)}% · {district.overlap_km2.toFixed(2)} km²</p>)}</section>
          <section><h3 className="mb-2 text-sm font-bold">Top mapped records</h3><div className="divide-y rounded-lg border">{result.top_sources.map((source) => <div key={sourceKey(source)} className="p-2 text-xs"><div className="flex justify-between gap-2"><a className="truncate underline" href={source.source_url} target="_blank" rel="noreferrer">{source.name ?? "Unnamed source"}</a><span className="shrink-0">{formatEmissions(source.mtco2e)}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{titleize(source.subsector ?? source.sector)} · {source.source_kind === "administrative" ? "Administrative centroid" : source.source_kind === "asset" ? "Facility" : "Unclassified"}</p></div>)}</div></section>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed"><AlertTriangle className="mr-1 inline h-4 w-4" />{result.spatial_confidence.explanation}</div>
          <div className="text-[11px] leading-relaxed text-muted-foreground"><p>Climate TRACE · {result.provenance.license}</p><p>Retrieved {new Date(result.provenance.retrieved_at).toLocaleString()}</p><p>All source pages retrieved. {result.coverage.missing_coordinates} national records lack usable coordinates.</p><p>Boundary: {result.boundary_provenance.year} · <a className="underline" href={result.boundary_provenance.url} target="_blank" rel="noreferrer">UBOS / WHO / UN OCHA</a> · {result.boundary_provenance.license}</p></div>
          <div className="grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={() => downloadAnalysis(result, selection!.name, "geojson")}><Download className="mr-1 h-4 w-4" />GeoJSON</Button><Button size="sm" onClick={() => downloadAnalysis(result, selection!.name, "csv")}><Download className="mr-1 h-4 w-4" />CSV</Button></div>
        </div>}
      </aside>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/30 p-3"><p className="text-[10px] font-bold text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}

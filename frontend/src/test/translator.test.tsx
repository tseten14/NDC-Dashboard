import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DistrictTranslator from "@/pages/DistrictTranslator";
import { emissionsApi, type PolygonInsightsResponse, type TranslatorGeometry } from "@/lib/api";
import { csvCell, formatEmissions, translatorCsv, translatorGeoJson } from "@/lib/translator";

vi.mock("@/components/map/DistrictTranslatorMap", () => ({ default: ({ mode, onSelectDistrict }: { mode: string; onSelectDistrict: (nextGeometry: TranslatorGeometry, name: string, id: string) => void }) => <div data-testid="translator-map" data-mode={mode}><button onClick={() => onSelectDistrict(geometry, "Kampala", "kampala")}>Select on map</button></div> }));
vi.mock("@/lib/api", () => ({ emissionsApi: { translatorMetadata: vi.fn(), translatorDistricts: vi.fn(), translatorSources: vi.fn(), polygonInsights: vi.fn() } }));

const geometry = { type: "Polygon" as const, coordinates: [[[32.54, 0.29], [32.61, 0.31], [32.57, 0.36], [32.54, 0.29]]] };
const boundary = { source: "UBOS", year: 2020, version: "test", license: "CC BY 3.0 IGO", url: "https://www.geoboundaries.org/", source_url: "https://data.humdata.org/", note: "2020 district boundaries" };
const provider = { id: "climate-trace", name: "Climate TRACE", spatial_method: "point_filter" as const, metric: "emissions", units: "MtCO2e", gas: "co2e_100yr", api_version: "v7", api_url: "https://api.climatetrace.org/v7/docs/index.html", api_dataset_release: null, published_release: { version: "5.11.0", published_at: "2026-09-24", data_through: "2026-07", verified_at: "2026-09-25", url: "https://climatetrace.org/data" }, license: "CC BY 4.0", license_url: "https://climatetrace.org/terms" };
const coverage = { fetched_rows: 1, duplicate_rows: 0, missing_coordinates: 0, missing_emissions: 0, complete_pagination: true };
const source = { id: 1, key: "1", name: "=formula", sector: "power", subsector: "electricity-generation", is_asset: true, source_kind: "asset" as const, lat: 0.32, lng: 32.57, mtco2e: 0.000000123456789, source_url: "https://api.climatetrace.org/v7/sources/1" };
const result: PolygonInsightsResponse = { schema_version: "2.0", geometry, selection_name: "Custom area", year: 2025, period: { year: 2025, complete_year: true, label: "2025" }, boundary_provenance: boundary, coverage, area_km2: 10.125, intersected_districts: [{ name: "Kampala", boundary_id: "kampala", overlap_km2: 10.125, overlap_pct: 100 }], mapped_total_mtco2e: source.mtco2e, source_count: 1, missing_emissions_count: 0, asset_count: 1, administrative_source_count: 0, unknown_source_count: 0, asset_total_mtco2e: source.mtco2e, administrative_total_mtco2e: 0, unknown_total_mtco2e: 0, filters: { sectors: null }, sectors: [{ sector: "power", mtco2e: source.mtco2e, source_count: 1, share_pct: 100, missing_emissions_count: 0 }], sources: [source], top_sources: [source], trend: [{ year: 2025, mapped_total_mtco2e: source.mtco2e, source_count: 1, complete_year: true, status: "available", retrieved_at: "2026-09-20T10:00:00Z" }], spatial_confidence: { scope: "mapped_sources_only", complete_inventory: false, explanation: "Mapped centroids are not a complete inventory." }, provenance: { ...provider, source: "Climate TRACE", dataset_year: 2025, retrieved_at: "2026-09-20T10:00:00Z" }, indicators: [] };

beforeEach(() => {
  vi.mocked(emissionsApi.translatorMetadata).mockResolvedValue({ years: [2021, 2022, 2023, 2024, 2025, 2026], default_year: 2025, providers: [provider], boundary });
  vi.mocked(emissionsApi.translatorDistricts).mockResolvedValue({ type: "FeatureCollection", features: [{ type: "Feature", geometry, properties: { shapeID: "kampala", shapeName: "Kampala" } }] });
  vi.mocked(emissionsApi.translatorSources).mockResolvedValue({ year: 2025, points: [source], coverage, retrieved_at: result.provenance.retrieved_at, period: result.period });
  vi.mocked(emissionsApi.polygonInsights).mockResolvedValue(result);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><DistrictTranslator /></QueryClientProvider>);
}

describe("District Translator interactions", () => {
  it("starts in district mode with drawing hidden and prevents stale results after clear", async () => {
    let resolve: (value: PolygonInsightsResponse) => void;
    vi.mocked(emissionsApi.polygonInsights).mockImplementation(() => new Promise((done) => { resolve = done; }));
    mount();
    await screen.findByRole("button", { name: "2025" });
    expect(screen.getByTestId("translator-map")).toHaveAttribute("data-mode", "district");
    expect(screen.getByRole("combobox", { name: "Select district" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draw" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo point" })).not.toBeInTheDocument();
    expect(screen.getByText("Choose a district to see its estimated greenhouse gas emissions.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select on map" }));
    await waitFor(() => expect(emissionsApi.polygonInsights).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    await act(async () => resolve(result));
    expect(screen.getByRole("heading", { name: "Select an area" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Spreadsheet" })).not.toBeInTheDocument();
  });
  it("selects a district by ID and updates filters without redrawing", async () => {
    mount();
    await screen.findByRole("checkbox", { name: "Power" });
    expect(screen.getByRole("checkbox", { name: "Power" })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Select district" })).toBeEnabled());
    fireEvent.change(screen.getByRole("combobox", { name: "Select district" }), { target: { value: "kampala" } });
    await screen.findByRole("button", { name: "Spreadsheet" });
    expect(vi.mocked(emissionsApi.polygonInsights).mock.calls.at(-1)?.[0]).toMatchObject({ district_id: "kampala", geometry: undefined, year: 2025 });
    fireEvent.click(screen.getByRole("button", { name: "No sectors" }));
    await waitFor(() => expect(vi.mocked(emissionsApi.polygonInsights).mock.calls.at(-1)?.[0].sectors).toEqual([]));
    fireEvent.click(screen.getByRole("button", { name: "2026*" }));
    await waitFor(() => expect(vi.mocked(emissionsApi.polygonInsights).mock.calls.at(-1)?.[0]).toMatchObject({ district_id: "kampala", year: 2026 }));
    expect(screen.getByRole("heading", { name: "Kampala" })).toBeInTheDocument();
  });
  it("shows an analysis failure and retry for a selected district", async () => {
    vi.mocked(emissionsApi.polygonInsights).mockRejectedValue(new Error("polygon_insights_failed"));
    mount();
    await screen.findByRole("button", { name: "2025" });
    fireEvent.click(screen.getByRole("button", { name: "Select on map" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Climate TRACE analysis could not finish");
    expect(screen.getByRole("button", { name: "Retry analysis" })).toBeInTheDocument();
  });
});

describe("Translator exports and precision", () => {
  it("preserves geometry, all records, units, and provenance in both formats", () => {
    const geojson = translatorGeoJson(result, "Kampala");
    expect(geojson.features[0].geometry).toEqual(geometry);
    expect(geojson.features[0].properties.provenance.retrieved_at).toBe(result.provenance.retrieved_at);
    expect(geojson.features[1].properties.mtco2e).toBe(source.mtco2e);
    expect(geojson.features[0].properties.spatial_confidence.complete_inventory).toBe(false);
    const csv = translatorCsv(result, "Kampala");
    for (const value of ["Geometry GeoJSON", "MtCO2e", "2025", "2020", "CC BY 4.0", "CC BY 3.0 IGO", "Mapped centroids are not a complete inventory.", String(source.mtco2e), "Not reported by upstream"]) expect(csv).toContain(value);
    expect(csv).toContain("'=formula");
  });
  it("escapes CSV control characters and preserves numeric removals", () => {
    expect(csvCell("a\rb")).toBe('"a\rb"');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("\t=1+1")).toBe("'\t=1+1");
    expect(csvCell(-1.25)).toBe("-1.25");
  });
  it("distinguishes unavailable estimates, zero, and small removals", () => {
    expect(formatEmissions(null)).toBe("Unavailable");
    expect(formatEmissions(0)).toBe("0 tonnes");
    expect(formatEmissions(-0.000000125)).toBe("-0.125 tonnes");
  });
});

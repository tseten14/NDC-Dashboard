import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
import { getFramework } from "@/data/classifications";
import { emissionsApi } from "@/lib/api";
import { flattenSectors } from "@/lib/sector-classification";
import { downloadFile, seriesCsv } from "@/lib/inventory-workspace";
import { formatEmissions } from "@/lib/translator";

const categories = flattenSectors(getFramework("ipcc-2006")!.hierarchy).filter((node) => !node.children.length);

export default function SectorClassification() {
  const { country } = useCountry();
  const [code, setCode] = useState("1.A.1");
  const [since, setSince] = useState(2021);
  const [to, setTo] = useState(2025);
  const catalog = useQuery({ queryKey: ["classification-catalog"], queryFn: ({ signal }) => emissionsApi.classificationCatalog(signal), staleTime: 3600_000 });
  const mapped = useMemo(() => new Map(catalog.data?.categories.map((entry) => [entry.code, entry]) ?? []), [catalog.data]);
  const series = useQuery({
    queryKey: ["classification-series", code, since, to],
    queryFn: ({ signal }) => emissionsApi.classificationSeries(code, since, to, signal),
    enabled: !!catalog.data && mapped.has(code), staleTime: 3600_000, retry: 1,
  });
  const latest = [...(series.data?.series ?? [])].reverse().find((entry) => entry.status === "available");
  const max = Math.max(1e-9, ...(series.data?.series.map((entry) => Math.abs(entry.value_mtco2e ?? 0)) ?? []));

  if (!country) return <p role="status" className="p-6">Choose a country to explore classification data.</p>;
  if (country.code !== "UG") return <p className="p-6">Climate TRACE classification mappings are currently available for Uganda.</p>;

  const exportSeries = () => {
    if (!series.data) return;
    downloadFile(`climate-trace-uganda-${code}-${since}-${to}.csv`, seriesCsv(series.data.series.map((entry) => ({
      ipcc_code: code, climate_trace_subsector: series.data!.category.subsector, year: entry.year,
      emissions_mtco2e: entry.value_mtco2e, status: entry.status, complete_year: entry.complete_year,
      source_url: entry.source_url ?? "", retrieved_at: series.data!.retrieved_at,
    }))), "text/csv;charset=utf-8");
  };

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="border-b pb-6">
      <p className="text-sm font-semibold text-primary">Uganda · Climate TRACE</p>
      <h1 className="mt-2 text-3xl font-bold">Sector Classification</h1>
      <p className="mt-3 max-w-3xl text-base text-muted-foreground">Explore annual emissions from the Climate TRACE API alongside selected IPCC reporting categories. These are partial mappings, not official IPCC category totals.</p>
      <Link className="mt-4 inline-block text-sm text-primary underline" to="/sector-classification/archive">View saved exercise archive</Link>
    </header>

    {catalog.isError && <div role="alert" className="mt-6 border p-4">The category list could not be loaded. <Button variant="outline" size="sm" className="ml-2" onClick={() => void catalog.refetch()}>Retry</Button></div>}
    {catalog.isLoading && <p role="status" className="mt-6">Loading categories…</p>}
    {catalog.data && <>
      <section aria-label="Choose data" className="mt-6 grid gap-4 rounded border bg-card p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block text-sm font-semibold">IPCC 2006 category
          <select className="mt-2 min-h-11 w-full rounded-sm border bg-background px-3" value={code} onChange={(event) => setCode(event.target.value)}>
            <optgroup label="Climate TRACE data available">
              {catalog.data.categories.map((entry) => <option value={entry.code} key={entry.code}>{entry.code} · {entry.label}</option>)}
            </optgroup>
            <optgroup label="Other categories · data unavailable">
              {categories.filter((entry) => !mapped.has(entry.code)).map((entry) => <option value={entry.code} key={entry.code}>{entry.code} · {entry.label}</option>)}
            </optgroup>
          </select>
        </label>
        <label className="block text-sm font-semibold">From year
          <select className="mt-2 min-h-11 w-full rounded-sm border bg-background px-3" value={since} onChange={(event) => setSince(Math.min(Number(event.target.value), to))}>
            {Array.from({ length: catalog.data.latest_available_year - catalog.data.year_min + 1 }, (_, index) => catalog.data!.year_min + index).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">To year
          <select className="mt-2 min-h-11 w-full rounded-sm border bg-background px-3" value={to} onChange={(event) => setTo(Math.max(Number(event.target.value), since))}>
            {Array.from({ length: catalog.data.latest_available_year - catalog.data.year_min + 1 }, (_, index) => catalog.data!.year_min + index).map((year) => <option key={year} value={year}>{year}{year > catalog.data!.latest_complete_year ? " · partial" : ""}</option>)}
          </select>
        </label>
      </section>

      {!mapped.has(code) && <div className="mt-6 border p-5"><h2 className="text-lg font-bold">Data unavailable for this category</h2><p className="mt-2 text-sm text-muted-foreground">No verified Climate TRACE subsector mapping is available for IPCC {code}. Select one of the six mapped categories to view an API series.</p></div>}
      {mapped.has(code) && <>
        {series.isFetching && <p role="status" className="mt-6">Loading Climate TRACE emissions…</p>}
        {series.isError && <div role="alert" className="mt-6 border p-4">Climate TRACE data could not be loaded. <Button variant="outline" size="sm" className="ml-2" onClick={() => void series.refetch()}>Retry</Button></div>}
        {series.data && !series.isError && <>
          <section className="mt-6 border bg-card p-5" aria-label="Emissions summary">
            <p className="text-sm font-semibold text-primary">{series.data.category.code} · {series.data.category.label}</p>
            <h2 className="mt-2 text-2xl font-bold">{latest ? formatEmissions(latest.value_mtco2e) : "Unavailable"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest available year: {latest?.year ?? "none"} · Uganda national · CO₂e, 100-year GWP</p>
            <p className="mt-4 border-l-4 border-primary pl-3 text-sm"><strong>Partial IPCC coverage.</strong> {series.data.category.scope}</p>
          </section>
          <section className="mt-6 border bg-card p-5" aria-label="Annual emissions series">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Annual Climate TRACE series</h2><p className="text-sm text-muted-foreground">Values are national aggregate estimates for the mapped subsector.</p></div><Button variant="outline" size="sm" onClick={exportSeries}><Download className="mr-2 h-4 w-4" />Download CSV</Button></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[35rem] border-collapse text-left text-sm"><thead><tr className="border-b"><th scope="col" className="py-2 pr-4">Year</th><th scope="col" className="py-2 pr-4">Emissions</th><th scope="col" className="py-2 pr-4">Relative size</th><th scope="col" className="py-2 pr-4">Coverage</th><th scope="col" className="py-2">Source</th></tr></thead><tbody>{series.data.series.map((entry) => <tr className="border-b last:border-0" key={entry.year}><th scope="row" className="py-3 pr-4 font-medium">{entry.year}</th><td className="py-3 pr-4 tabular-nums">{formatEmissions(entry.value_mtco2e)}</td><td className="w-1/3 py-3 pr-4"><div className="h-2 bg-muted" aria-hidden="true"><div className="h-full bg-primary" style={{ width: `${Math.abs(entry.value_mtco2e ?? 0) / max * 100}%` }} /></div></td><td className="py-3 pr-4">{entry.status === "available" ? entry.complete_year ? "Complete year" : "Partial year" : entry.status === "no_data" ? "No estimate" : "Unavailable · retry"}</td><td className="py-3">{entry.source_url ? <a href={entry.source_url} target="_blank" rel="noreferrer" aria-label={`View Climate TRACE API response for ${entry.year}`} className="text-primary underline">API response</a> : "—"}</td></tr>)}</tbody></table></div>
            {series.data.series.some((entry) => entry.status === "upstream_error") && <p role="status" className="mt-3 text-sm">Some years could not be retrieved. <button className="text-primary underline" onClick={() => void series.refetch()}>Retry series</button></p>}
          </section>
          <section className="mt-6 border bg-card p-5 text-sm" aria-label="Data source"><h2 className="font-bold">Where this data comes from</h2><p className="mt-2">Climate TRACE public API {series.data.provenance.api_version}, queried for <code>{series.data.category.subsector}</code> in Uganda. <a className="text-primary underline" href={series.data.provenance.api_url} target="_blank" rel="noreferrer">API reference</a>.</p><p className="mt-2"><a className="text-primary underline" href={series.data.provenance.published_release.url} target="_blank" rel="noreferrer">Published release {series.data.provenance.published_release.version}</a> was checked {series.data.provenance.published_release.verified_at}; it includes monthly data through {series.data.provenance.published_release.data_through}. The API does not report its dataset release number.</p><p className="mt-2 text-muted-foreground">Retrieved {new Date(series.data.retrieved_at).toLocaleString()}. The public API is in beta; estimates and historical years can change with later releases.</p></section>
        </>}
      </>}
    </>}
  </div>;
}

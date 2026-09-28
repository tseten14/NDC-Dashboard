/**
 * Explains the difference between aggregate emissions and mapped source coverage without converting that difference into a confidence score.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { useQuery } from "@tanstack/react-query";
import { emissionsApi } from "@/lib/api";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { formatEmissions } from "@/lib/translator";

/** Compare coverage without interpreting a difference as measured spatial certainty. */
export function SpatialConfidencePanel() {
  const emissions = useEmissionsData();
  const districtName = emissions.isDistrictView ? emissions.districtName : null;
  const query = useQuery({
    queryKey: ["emissions", "spatial-confidence", districtName ?? "national"],
    queryFn: () => emissionsApi.spatialConfidence(districtName ? { district: districtName } : undefined),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  const data = query.data;
  return <section className="h-full overflow-y-auto p-4 space-y-4" aria-label="Map data coverage">
    <header><h2 className="text-lg font-semibold">Map data coverage</h2>
      <p className="text-sm text-muted-foreground">{districtName ?? "Uganda (national)"}{data && ` · ${data.year}`}</p></header>
    <p className="text-sm">Climate TRACE publishes an overall estimate and individual source records.
      Records with map coordinates include facilities and estimates for larger administrative areas.
      These cover different scopes, so their totals are not expected to match.</p>
    {query.isLoading && <p role="status">Loading source records…</p>}
    {query.isError && <p role="alert">Source coverage could not be loaded. No estimate is shown.</p>}
    {data && <>
      <dl className="divide-y rounded border p-3 text-sm">
        <div className="flex justify-between gap-3 py-2"><dt>Overall Climate TRACE estimate</dt><dd>{formatEmissions(data.aggregate_mtco2e)}</dd></div>
        <div className="flex justify-between gap-3 py-2"><dt>Records with map coordinates</dt><dd>{formatEmissions(data.located_mtco2e)}</dd></div>
        <div className="flex justify-between gap-3 py-2"><dt>Difference in coverage</dt><dd>{formatEmissions(data.difference_mtco2e ?? null)}</dd></div>
      </dl>
      <p className="text-sm text-muted-foreground">{data.located_source_count} facility records and {data.located_aggregation_count} administrative records.
        {" "}Negative emissions represent net removals. This comparison does not measure data accuracy or confidence.</p>
      {!!data.missing_coordinates && <p className="text-sm">{data.missing_coordinates} records have no usable map coordinates and are excluded from the mapped total.</p>}
      {!!data.missing_emissions && <p role="note" className="text-sm">{data.missing_emissions} mapped records have no emissions estimate. Their total and the difference are unavailable.</p>}
      <details className="border-t pt-3"><summary className="cursor-pointer font-semibold">Coverage by sector</summary>
        <dl className="mt-3 divide-y text-sm">{data.sectors.map((sector) => <div key={sector.sector} className="py-2">
          <dt className="font-semibold capitalize">{sector.sector.replace(/-/g, " ")}</dt>
          <dd>Overall: {formatEmissions(sector.total_mtco2e)} · Mapped: {formatEmissions(sector.located_mtco2e)}</dd>
        </div>)}</dl>
      </details>
      <a className="text-sm text-primary underline" href="https://api.climatetrace.org/v7/docs/index.html" target="_blank" rel="noreferrer">Source: Climate TRACE public API v7</a>
    </>}
  </section>;
}

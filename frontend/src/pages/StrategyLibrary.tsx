import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { indicatorRegistry, type Strategy } from "@/data/indicator-registry";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const labels: Record<Strategy, string> = { NDC: "Updated NDC", NDPIV: "NDP IV", TENFOLD: "Tenfold Growth" };

export default function StrategyLibrary() {
  const [strategy, setStrategy] = useState<Strategy | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => indicatorRegistry.filter(ind =>
    (strategy === "ALL" || ind.strategy === strategy) &&
    `${ind.indicator_name} ${ind.objective_or_outcome} ${ind.sector_or_programme}`.toLowerCase().includes(query.toLowerCase())
  ), [strategy, query]);
  return <section className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
    <h1 className="text-2xl font-bold">Strategy Library</h1>
    <p className="text-muted-foreground">Policy commitments transcribed from the named documents. These figures describe policy baselines and goals; they do not measure current delivery. Individual transcriptions still need source review.</p>
    <div className="flex flex-wrap gap-4">
      <label className="space-y-1 text-sm">Strategy<select className="block rounded-sm border bg-background p-2" value={strategy} onChange={e => setStrategy(e.target.value as Strategy | "ALL")}>{(["ALL", "NDC", "NDPIV", "TENFOLD"] as const).map(s => <option key={s} value={s}>{s === "ALL" ? "All strategies" : labels[s]}</option>)}</select></label>
      <label className="min-w-0 flex-1 space-y-1 text-sm">Search indicators<Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search indicators…" /></label>
    </div>
    <p className="text-sm">{filtered.length} policy indicators · Current observations are not connected to this registry.</p>
    <Accordion type="multiple" className="space-y-3">
      {(Object.keys(labels) as Strategy[]).map(s => {
        const rows = filtered.filter(ind => ind.strategy === s);
        if (!rows.length) return null;
        return <AccordionItem key={s} value={s} className="rounded-sm border px-4">
          <AccordionTrigger>{labels[s]} · {rows.length} indicators</AccordionTrigger>
          <AccordionContent><ul className="divide-y">{rows.map(ind => <li key={ind.id} className="space-y-2 py-4">
            <h2 className="font-semibold">{ind.indicator_name}</h2>
            <p className="text-sm text-muted-foreground">{ind.sector_or_programme} · {ind.objective_or_outcome}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Policy baseline · {ind.baseline_year ?? "Year not recorded"}</dt><dd>{ind.baseline_value?.toLocaleString() ?? "Not stated"} {ind.baseline_value != null && ind.unit}</dd></div>
              <div><dt className="text-muted-foreground">Policy goal · {ind.target_year_primary}</dt><dd>{(ind.target_value_2030 ?? ind.target_value_2025 ?? ind.target_value_2040)?.toLocaleString() ?? "Not stated"} {ind.unit}</dd></div>
            </dl>
            <p className="text-sm">Source: {ind.data_source ?? "Not recorded"}</p>
            <p className="text-sm text-muted-foreground">Policy reference · Needs source review</p>
          </li>)}</ul></AccordionContent>
        </AccordionItem>;
      })}
    </Accordion>
    {!filtered.length && <p>No policy indicators match this search.</p>}
    <div className="flex flex-wrap gap-5 border-t pt-4">
      <Link className="text-primary underline" to="/documents">Read the source documents</Link>
      <Link className="text-primary underline" to="/dashboard">View emissions observations</Link>
      <Link className="text-primary underline" to="/activities/new">Record an activity</Link>
    </div>
  </section>;
}

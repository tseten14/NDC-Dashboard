import { ArrowDown, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  {
    title: "Find assets",
    items: ["Public & commercial datasets", "Satellite imagery + ML", "Manual data gathering"],
  },
  {
    title: "Estimate activity",
    items: ["Statistical models", "Disaggregating production", "Satellite imagery + ML"],
  },
  {
    title: "Gather model inputs",
    items: [
      "Emission factors",
      "Fuel mix",
      "Flaring",
      "Plant characteristics",
      "Weather data",
      "Country-specific info",
    ],
  },
] as const;

export function ClimateTraceEstimationFlow({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          How emission data is estimated
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
          Climate TRACE combines thousands of sources — satellite imagery from Planet is the largest input.
        </p>
      </div>

      {/* Planet → Climate TRACE */}
      <div className="rounded-xl border border-border/80 bg-gradient-to-br from-sky-500/8 via-background to-teal-500/8 p-3 dash-fade-up">
        <p className="text-[10px] font-medium text-foreground mb-2 leading-snug">
          Planet provides high-resolution satellite imagery — sharper than Sentinel or Landsat — so
          facilities and land areas can be detected precisely.
        </p>
        <figure className="rounded-lg overflow-hidden border border-border/60 bg-background">
          <img
            src="/climate-trace/planet-satellite-comparison.png"
            alt="Satellite resolution comparison: Harmonized Sentinel-2, Landsat 8, and PlanetScope imagery of an industrial site"
            className="w-full h-auto"
            loading="lazy"
          />
          <figcaption className="px-2 py-1.5 text-[9px] text-muted-foreground text-center border-t border-border/60">
            PlanetScope captures far more detail than standard public satellites
          </figcaption>
        </figure>

        <div className="flex flex-col items-center gap-1 my-2 text-muted-foreground" aria-hidden>
          <ArrowDown className="h-4 w-4" />
        </div>

        <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <Satellite className="h-4 w-4 text-primary shrink-0" />
          <span className="text-[10px] font-semibold text-foreground">Climate TRACE ingests &amp; models</span>
        </div>
      </div>

      {/* Estimation pipeline */}
      <figure className="rounded-xl border border-border/80 overflow-hidden bg-card dash-fade-up dash-card-hover">
        <img
          src="/climate-trace/estimation-pipeline.png"
          alt="Climate TRACE estimation pipeline: find assets, estimate activity, gather model inputs, then GHG emissions estimates"
          className="w-full h-auto"
          loading="lazy"
        />
        <figcaption className="px-3 py-2 text-[9px] text-muted-foreground border-t border-border/60 leading-snug">
          Three modelling stages turn observations into greenhouse gas emissions estimates
        </figcaption>
      </figure>

      {/* Compact step summary for narrow column / accessibility */}
      <div className="grid grid-cols-1 gap-2">
        {PIPELINE_STEPS.map((step, index) => (
          <div
            key={step.title}
            className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-2.5 py-2 dash-fade-up"
            style={{ animationDelay: `${0.15 + index * 0.07}s` }}
          >
            <p className="text-[10px] font-semibold text-foreground">
              {index + 1}. {step.title}
            </p>
            <ul className="mt-1 space-y-0.5">
              {step.items.map((item) => (
                <li key={item} className="text-[9px] text-muted-foreground flex gap-1.5">
                  <span className="text-teal-600/70 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-lg bg-gradient-to-r from-slate-800 to-teal-900 px-3 py-2 text-center dash-fade-up">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white">
            GHG emissions estimates
          </p>
        </div>
      </div>
    </section>
  );
}

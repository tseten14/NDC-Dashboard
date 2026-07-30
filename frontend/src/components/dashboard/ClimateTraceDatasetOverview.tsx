/**
 * Panel: what the Climate TRACE dataset contains.
 *
 * Explains the coverage and limits of the underlying dataset.
 */
import {
  Globe2,
  CalendarRange,
  Factory,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DATASET_GROUPS = [
  {
    title: "100% of anthropogenic GHGs",
    items: ["CO₂", "Methane", "N₂O", "Less common gases"],
    icon: Wind,
    accent: "from-teal-500/15 to-emerald-500/5",
  },
  {
    title: "Geographic coverage",
    items: ["Country or territory", "State", "Province", "County", "Major urban area"],
    icon: Globe2,
    accent: "from-cyan-500/15 to-teal-500/5",
  },
  {
    title: "Jan 2015 to 2 months ago",
    items: [] as string[],
    icon: CalendarRange,
    accent: "from-sky-500/15 to-cyan-500/5",
  },
  {
    title: 'At 745 million specific "assets"',
    items: [
      "Facilities (factories, airports, feedlots, etc.)",
      "Areas (1 km × 1 km forests, etc.)",
    ],
    icon: Factory,
    accent: "from-emerald-500/15 to-green-500/5",
  },
] as const;

export function ClimateTraceDatasetOverview({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          What&apos;s in Climate TRACE&apos;s dataset
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
          Global emissions intelligence built from satellites, models, and thousands of data sources.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DATASET_GROUPS.map((group, index) => {
          const Icon = group.icon;
          return (
            <div
              key={group.title}
              className={cn(
                "rounded-lg border border-border/80 bg-gradient-to-br p-2.5 dash-card-hover dash-fade-up",
                group.accent,
              )}
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="flex items-start gap-2">
                <div className="rounded-md bg-background/80 border border-border/60 p-1.5 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-foreground leading-snug">{group.title}</p>
                  {group.items.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {group.items.map((item) => (
                        <li key={item} className="text-[9px] text-muted-foreground leading-snug flex gap-1.5">
                          <span className="text-primary/60 shrink-0">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

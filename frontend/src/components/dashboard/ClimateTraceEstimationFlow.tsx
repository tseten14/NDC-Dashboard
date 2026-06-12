import { useId } from "react";
import {
  ArrowRight,
  BookOpen,
  CloudSun,
  Database,
  Factory,
  FileSpreadsheet,
  Flame,
  LineChart,
  PieChart,
  Satellite,
  ScanSearch,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  {
    title: "Find assets",
    short: "Assets",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    items: [
      { label: "Public & commercial datasets", icon: FileSpreadsheet },
      { label: "Satellite imagery + ML", icon: ScanSearch },
      { label: "Manual data gathering", icon: UserRound },
    ],
  },
  {
    title: "Estimate activity",
    short: "Activity",
    border: "border-teal-500/30",
    bg: "bg-teal-500/5",
    items: [
      { label: "Statistical models", icon: LineChart },
      { label: "Disaggregating production", icon: LineChart },
      { label: "Satellite imagery + ML", icon: ScanSearch },
    ],
  },
  {
    title: "Gather model inputs",
    short: "Inputs",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    items: [
      { label: "Emission factors", icon: Database },
      { label: "Fuel mix", icon: PieChart },
      { label: "Flaring", icon: Flame },
      { label: "Plant characteristics", icon: Factory },
      { label: "Weather data", icon: CloudSun },
      { label: "Country-specific info", icon: BookOpen },
    ],
  },
] as const;

const COMPACT_STEPS = [
  { label: "Planet imagery", icon: Satellite },
  { label: "Climate TRACE", icon: ScanSearch },
  ...PIPELINE_STAGES.map((s) => ({ label: s.short, icon: null as null })),
  { label: "GHG estimates", icon: null as null },
] as const;

function FlowArrow({ large = false }: { large?: boolean }) {
  return (
    <div
      className={cn("flex shrink-0 items-center self-center text-muted-foreground/50", large ? "px-2" : "px-0.5")}
      aria-hidden
    >
      <ArrowRight className={large ? "h-5 w-5" : "h-3.5 w-3.5"} />
    </div>
  );
}

function CompactFlowchart() {
  return (
    <div
      className="flex flex-nowrap items-center gap-0 overflow-x-auto py-1 scrollbar-thin"
      role="img"
      aria-label="Planet imagery to Climate TRACE to three modelling stages to GHG estimates"
    >
      {COMPACT_STEPS.map((step, i) => (
        <div key={step.label} className="flex shrink-0 items-center">
          {i > 0 && <FlowArrow />}
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[8px] font-medium leading-tight whitespace-nowrap",
              i === 0 && "border-sky-500/30 bg-sky-500/10 text-foreground",
              i === 1 && "border-primary/30 bg-primary/10 text-foreground",
              i === COMPACT_STEPS.length - 1 && "border-teal-800/40 bg-gradient-to-r from-slate-800 to-teal-900 text-white font-semibold",
              i > 1 && i < COMPACT_STEPS.length - 1 && "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {step.icon && <step.icon className="inline h-2.5 w-2.5 mr-0.5 -mt-px opacity-80" aria-hidden />}
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SatelliteImageryLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const gradId = useId();
  const box = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <div
      className="flex flex-col items-center gap-1 shrink-0"
      role="img"
      aria-label="High-resolution Planet satellite imagery"
    >
      <div
        className={cn(
          "relative rounded-xl border border-sky-500/25 bg-gradient-to-br from-slate-800 via-slate-700 to-teal-900 shadow-sm overflow-hidden",
          box,
        )}
      >
        <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(30 58 95)" />
              <stop offset="100%" stopColor="rgb(15 76 69)" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" fill={`url(#${gradId})`} />
          <path d="M0 28 Q12 22 24 28 T48 28" fill="none" stroke="rgb(56 189 176 / 0.35)" strokeWidth="0.75" />
          <rect x="10" y="30" width="4" height="3" rx="0.5" fill="rgb(255 255 255 / 0.25)" />
          <path d="M24 8 L16 38 L32 38 Z" fill="rgb(56 189 176 / 0.12)" />
        </svg>
        <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" aria-hidden>
          <g transform="translate(24 10)">
            <rect x="-5" y="-2" width="10" height="4" rx="1" fill="rgb(226 232 240)" />
            <rect x="-9" y="-1" width="4" height="2" rx="0.25" fill="rgb(125 211 252 / 0.9)" />
            <rect x="5" y="-1" width="4" height="2" rx="0.25" fill="rgb(125 211 252 / 0.9)" />
          </g>
        </svg>
      </div>
      {size === "md" && (
        <p className="text-[8px] text-muted-foreground text-center leading-tight whitespace-nowrap">
          PlanetScope EO
        </p>
      )}
    </div>
  );
}

function HorizontalFlowchart({ detailed = false }: { detailed?: boolean }) {
  const large = detailed;

  return (
    <div className={cn("w-full", large ? "overflow-x-auto px-2 sm:px-3" : "overflow-x-auto pb-1")}>
      <div
        className={cn(
          "flex items-stretch gap-0",
          large ? "w-max mx-auto py-1" : "min-w-max px-1",
        )}
      >
        {/* Planet */}
        <div
          className={cn(
            "flex shrink-0 flex-col items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/8 text-center",
            large ? "w-[136px] min-h-[188px] gap-2.5 p-3.5" : "w-[100px] gap-1.5 p-2",
          )}
        >
          <SatelliteImageryLogo size={large ? "lg" : "sm"} />
          <p className={cn("font-semibold text-foreground leading-snug", large ? "text-sm" : "text-[9px]")}>
            Planet imagery
          </p>
          {large && (
            <p className="text-xs text-muted-foreground leading-snug">
              Sharper than Sentinel or Landsat
            </p>
          )}
        </div>

        <FlowArrow large={large} />

        {/* Climate TRACE */}
        <div
          className={cn(
            "flex shrink-0 flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/8 text-center",
            large ? "w-[136px] min-h-[188px] gap-2.5 p-3.5" : "w-[100px] gap-1 p-2",
          )}
        >
          <Satellite className={large ? "h-8 w-8 text-primary" : "h-5 w-5 text-primary"} />
          <p className={cn("font-semibold text-foreground leading-snug", large ? "text-sm" : "text-[9px]")}>
            Climate TRACE
          </p>
          {large && (
            <p className="text-xs text-muted-foreground leading-snug">Ingests &amp; models</p>
          )}
        </div>

        <FlowArrow large={large} />

        {/* Three pipeline stages */}
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage.title} className="flex shrink-0 items-stretch">
            <div
              className={cn(
                "flex flex-col rounded-xl border-2",
                stage.border,
                stage.bg,
                large ? "w-[188px] min-h-[188px] p-3.5" : "w-[130px] p-2",
              )}
            >
              <p
                className={cn(
                  "font-bold uppercase tracking-wide text-foreground text-center leading-snug",
                  large ? "text-xs mb-2.5" : "text-[9px] mb-1.5",
                )}
              >
                {stage.title}
              </p>
              <div className={cn("flex flex-1 flex-col", large ? "gap-2" : "gap-1")}>
                {stage.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-start rounded-lg bg-background/70 border border-border/40",
                        large ? "gap-2 px-2.5 py-1.5" : "gap-1 px-1 py-0.5",
                      )}
                    >
                      <Icon
                        className={cn("text-primary shrink-0 mt-px", large ? "h-4 w-4" : "h-2.5 w-2.5")}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "text-muted-foreground leading-snug",
                          large ? "text-xs" : "text-[7px]",
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <FlowArrow large={large} />
          </div>
        ))}

        {/* Output */}
        <div
          className={cn(
            "flex shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-teal-900 text-center self-stretch",
            large ? "w-[120px] min-h-[188px] p-3.5" : "w-[90px] p-2",
          )}
        >
          <p
            className={cn(
              "font-bold uppercase tracking-wide text-white leading-snug",
              large ? "text-[11px]" : "text-[9px]",
            )}
          >
            GHG emissions estimates
          </p>
        </div>
      </div>
    </div>
  );
}

function FullMethodologyContent() {
  return (
    <div className="px-6 py-5 space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed text-center">
        Planet satellite imagery feeds Climate TRACE, which runs three modelling stages to produce
        greenhouse gas emissions estimates.
      </p>
      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-4 sm:px-5">
        <HorizontalFlowchart detailed />
      </div>
      <p className="text-xs text-muted-foreground text-center leading-relaxed pb-1">
        Data flows left to right — from observation to estimate
      </p>
    </div>
  );
}

export function ClimateTraceEstimationFlow({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-2", className)}>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          How emission data is estimated
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
          Planet satellite imagery feeds Climate TRACE models across three stages.
        </p>
      </div>

      <div className="rounded-lg border border-border/80 bg-gradient-to-br from-sky-500/6 via-background to-teal-500/6 p-2.5 dash-fade-up space-y-2">
        <CompactFlowchart />

        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] gap-1.5"
            >
              <Satellite className="h-3 w-3" />
              View full methodology
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] p-0 gap-0 overflow-y-auto">
            <DialogHeader className="px-6 py-4 border-b border-border">
              <DialogTitle className="text-base font-semibold">How emission data is estimated</DialogTitle>
            </DialogHeader>
            <FullMethodologyContent />
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

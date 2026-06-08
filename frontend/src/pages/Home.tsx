import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { NdcGapSummary } from "@/components/NdcGapSummary";
import { cn } from "@/lib/utils";
import {
  ArrowRight, BarChart3, Globe2, LayoutDashboard, Sparkles, Target,
  TrendingUp, Upload, Leaf, Satellite, ChevronRight, Scale, Presentation,
} from "lucide-react";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { DataHonestyBadge, type DataHonestyKind } from "@/components/DataHonestyBadge";

const FEATURES: {
  icon: typeof Target;
  title: string;
  blurb: string;
  to: string;
  accent: string;
  honesty: DataHonestyKind;
}[] = [
  {
    icon: Target,
    title: "Explore NDCs",
    blurb: "Browse sector targets, pledges and linked measures.",
    to: "/dashboard",
    accent: "from-emerald-500/20 to-emerald-500/5",
    honesty: "live",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    blurb: "Compare live Climate TRACE data against NDC goals.",
    to: "/dashboard",
    accent: "from-sky-500/20 to-sky-500/5",
    honesty: "live",
  },
  {
    icon: BarChart3,
    title: "Analyze Targets",
    blurb: "Drill into districts, sources and spatial certainty.",
    to: "/dashboard",
    accent: "from-violet-500/20 to-violet-500/5",
    honesty: "live",
  },
  {
    icon: Leaf,
    title: "Mitigation Measures",
    blurb: "Review activities and options tied to each target.",
    to: "/dashboard",
    accent: "from-teal-500/20 to-teal-500/5",
    honesty: "indicative",
  },
  {
    icon: Upload,
    title: "Data Ingestion",
    blurb: "Import your own files and publish trusted observations.",
    to: "/ingest",
    accent: "from-amber-500/20 to-amber-500/5",
    honesty: "live",
  },
  {
    icon: Sparkles,
    title: "AI Predictions",
    blurb: "Forecast 2030 trajectories and spot emerging gaps.",
    to: "/ai-2030",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5",
    honesty: "indicative",
  },
  {
    icon: Scale,
    title: "Policy documents",
    blurb: "Browse national documents and see how interventions link to intended outcomes.",
    to: "/documents",
    accent: "from-slate-500/20 to-slate-500/5",
    honesty: "live",
  },
];

export default function Home() {
  const { country, clearCountry } = useCountry();
  const { activeRole, getHomeRoleStartHere } = useCurrentRole();
  const { startDemoPresentation } = useDemoMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleStart = getHomeRoleStartHere();

  // Legacy deep-links: /?target=... → /dashboard?target=...
  useEffect(() => {
    if (searchParams.has("target") || searchParams.has("sector")) {
      navigate(`/dashboard?${searchParams.toString()}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const countryLabel = country?.name ?? "your country";

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-muted/30 via-background to-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, hsl(var(--accent) / 0.12), transparent 45%), radial-gradient(circle at 80% 0%, hsl(var(--sidebar-primary) / 0.15), transparent 40%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
            <Badge variant="outline" className="mb-4 text-[10px] font-medium tracking-wide gap-1.5">
              <Sparkles className="h-3 w-3 text-sidebar-primary" />
              {country ? `${country.flag} ${country.name}` : "NDC Data Explorer"} · Decision-support cockpit
            </Badge>

            <h1 className="font-brand text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground max-w-3xl leading-[1.15]">
              Turn {countryLabel}&apos;s climate commitments into{" "}
              <span className="text-sidebar-primary">delivery decisions</span>.
            </h1>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Link NDC targets to live emissions, track progress, explore mitigation options, and
              see where delivery is off track — all in one place.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Button
                type="button"
                size="default"
                className="gap-1.5 shadow-sm"
                onClick={startDemoPresentation}
              >
                <Presentation className="h-4 w-4" />
                Start 3-minute demo
              </Button>
              <Button asChild size="default" variant="outline" className="gap-1.5">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Open Dashboard
                </Link>
              </Button>
              <Button
                variant="outline"
                size="default"
                className="gap-1.5"
                onClick={() => {
                  clearCountry();
                  navigate("/select-country");
                }}
              >
                <Globe2 className="h-4 w-4" />
                Explore Countries
              </Button>
              <Button asChild variant="ghost" size="default" className="gap-1.5 text-muted-foreground">
                <Link to="/dashboard">
                  Start Analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {activeRole === "SeniorDecisionMaker" && (
          <section className="mx-auto max-w-5xl px-4 sm:px-6 py-2 sm:py-4">
            <NdcGapSummary />
          </section>
        )}

        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          <Card className="border-primary/25 bg-primary/[0.04]">
            <CardContent className="p-4 sm:p-5">
              <h2 className="font-brand text-sm font-semibold text-foreground">{roleStart.title}</h2>
              <ul className="mt-2 space-y-1">
                {roleStart.bullets.map((b) => (
                  <li key={b} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
              <Button asChild size="sm" className="mt-3 h-8 text-xs gap-1">
                <Link to={roleStart.to}>
                  {roleStart.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* What you can do */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="mb-6 max-w-xl">
            <h2 className="font-brand text-lg sm:text-xl font-semibold text-foreground">What you can do here</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A concise cockpit for planners, MRV teams and partners — built on Climate TRACE and
              Uganda&apos;s Updated NDC.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link key={f.title} to={f.to} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                <Card className="h-full border-border/80 transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <div
                      className={cn(
                        "mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ring-border/50",
                        f.accent,
                      )}
                    >
                      <f.icon className="h-5 w-5 text-foreground/80" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {f.title}
                      </h3>
                      <DataHonestyBadge kind={f.honesty} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.blurb}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ChevronRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Banner */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-10 sm:pb-14">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-sm">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-0">
                <div className="p-6 sm:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <Satellite className="h-4 w-4 text-sidebar-primary" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Powered by Climate TRACE
                    </span>
                  </div>
                  <h2 className="font-brand text-xl sm:text-2xl font-bold text-foreground leading-snug">
                    Evidence you can see — from satellite to sector dashboard
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
                    Observed emissions, asset-level sources, district views and spatial certainty —
                    connected to the NDC targets that matter for {countryLabel}.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary" className="gap-1.5">
                      <Link to="/map">
                        View Emissions Map
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link to="/docs">Read the docs</Link>
                    </Button>
                  </div>
                </div>
                <div
                  className="relative min-h-[180px] md:min-h-0 bg-gradient-to-br from-sidebar-primary/15 via-accent/10 to-transparent flex items-center justify-center p-6"
                  aria-hidden
                >
                  <div className="grid grid-cols-2 gap-3 w-full max-w-[220px]">
                    {[
                      { label: "Sectors", value: "7" },
                      { label: "Targets", value: "11" },
                      { label: "Live data", value: "TRACE" },
                      { label: "Horizon", value: "2030" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-white/10 bg-background/60 backdrop-blur-sm px-3 py-2.5 text-center shadow-sm"
                      >
                        <p className="text-lg font-bold tabular-nums text-foreground">{stat.value}</p>
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ScrollArea>
  );
}

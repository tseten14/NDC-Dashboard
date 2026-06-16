import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/context/CountryContext";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { CountUpNumber } from "@/components/dashboard/CountUpNumber";
import { HERO_GRADIENT_TEXT } from "@/lib/hero-styles";
import { cn } from "@/lib/utils";
import {
  ArrowRight, LayoutDashboard, Sparkles, Target,
  Upload, Satellite, ChevronRight, Scale, Workflow, Briefcase,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Explore NDCs",
    blurb: "Browse sector targets, pledges, progress, and linked measures.",
    to: "/dashboard",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Upload,
    title: "Data Ingestion",
    blurb: "Import your own files and publish trusted observations.",
    to: "/ingest",
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Sparkles,
    title: "AI Predictions",
    blurb: "Forecast 2030 trajectories and spot emerging gaps.",
    to: "/ai-2030",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5",
  },
  {
    icon: Scale,
    title: "Policy documents",
    blurb: "Browse national documents and see how interventions link to intended outcomes.",
    to: "/documents",
    accent: "from-slate-500/20 to-slate-500/5",
  },
  {
    icon: Workflow,
    title: "Policy Impact",
    blurb: "Model the impact of specific policies and trace outcomes to NDC targets.",
    to: "/policy-impact",
    accent: "from-indigo-500/20 to-indigo-500/5",
  },
  {
    icon: Briefcase,
    title: "My Work",
    blurb: "Track your activities, approvals queue and pending verifications.",
    to: "/my-work",
    accent: "from-orange-500/20 to-orange-500/5",
  },
];

export default function Home() {
  const { country } = useCountry();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const featuresReveal = useScrollReveal();
  const bannerReveal = useScrollReveal();

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

            <h1 className="hero-headline font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground max-w-3xl leading-[1.15]">
              Turn {countryLabel}&apos;s climate commitments into{" "}
              <span className={HERO_GRADIENT_TEXT}>delivery decisions.</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Link NDC targets to live emissions, track progress, explore mitigation options, and
              see where delivery is off track — all in one place.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Button asChild size="default" className="gap-1.5 shadow-sm">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Open Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What you can do */}
        <section ref={featuresReveal} className="reveal mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="mb-6 max-w-xl">
            <h2 className="font-brand text-lg sm:text-xl font-semibold text-foreground">What you can do here</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A concise cockpit for planners, MRV teams and partners — built on Climate TRACE and
              Uganda&apos;s Updated NDC.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Link
                key={f.title}
                to={f.to}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl dash-fade-up"
                style={{ "--dash-fade-delay": `${0.04 + i * 0.04}s` } as CSSProperties}
              >
                <Card className="h-full border-border/80 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:-translate-y-1">
                  <CardContent className="p-4">
                    <div
                      className={cn(
                        "mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ring-border/50",
                        f.accent,
                      )}
                    >
                      <f.icon className="h-5 w-5 text-foreground/80" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {f.title}
                    </h3>
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
        <section ref={bannerReveal} className="reveal mx-auto max-w-5xl px-4 sm:px-6 pb-10 sm:pb-14">
          <Card className="gradient-border-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-sm">
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
                      { label: "Sectors", value: 7 },
                      { label: "Targets", value: 11 },
                      { label: "Live data", value: "TRACE" },
                      { label: "Horizon", value: 2030 },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-white/10 bg-background/60 backdrop-blur-sm px-3 py-2.5 text-center shadow-sm transition-transform duration-300 hover:scale-105"
                      >
                        <p className="text-lg font-bold tabular-nums text-foreground font-display">
                          {typeof stat.value === "number" ? (
                            <CountUpNumber value={stat.value} durationMs={800} startWhenVisible />
                          ) : (
                            stat.value
                          )}
                        </p>
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

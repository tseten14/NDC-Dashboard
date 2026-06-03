import { Navigate, useNavigate } from "react-router-dom";
import { COUNTRY_OPTIONS, type CountryCode } from "@/data/countries";
import { useCountry } from "@/context/CountryContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Globe2, ChevronRight, Lock, Satellite, BarChart3, MapPin, Sparkles, Leaf,
} from "lucide-react";
import { toast } from "sonner";

const HIGHLIGHTS = [
  { icon: Satellite, label: "Climate TRACE", detail: "Live observed emissions" },
  { icon: BarChart3, label: "NDC targets", detail: "Progress & gap analysis" },
  { icon: MapPin, label: "District views", detail: "Sub-national drill-down" },
  { icon: Leaf, label: "Mitigation", detail: "Measures & finance screening" },
];

function LandingBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 landing-gradient-bg" />
      <div className="absolute inset-0 landing-grid-pattern opacity-60" />
      <div
        className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full landing-orb opacity-40 blur-3xl"
        style={{ background: "hsl(var(--sidebar-primary) / 0.35)" }}
      />
      <div
        className="absolute top-1/3 -right-20 h-[360px] w-[360px] rounded-full landing-orb landing-orb-delay-1 opacity-30 blur-3xl"
        style={{ background: "hsl(152 40% 45% / 0.25)" }}
      />
      <div
        className="absolute -bottom-24 left-1/4 h-[320px] w-[320px] rounded-full landing-orb landing-orb-delay-2 opacity-25 blur-3xl"
        style={{ background: "hsl(var(--accent) / 0.2)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80" />
      {/* Decorative network arcs — climate data motif */}
      <svg
        className="absolute right-0 top-0 h-full w-1/2 max-w-lg opacity-[0.07] text-foreground"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" />
        <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 8" />
        <path d="M200 80 L280 200 L200 320 L120 200 Z" stroke="currentColor" strokeWidth="0.6" />
        <path d="M80 200 L200 120 L320 200 L200 280 Z" stroke="currentColor" strokeWidth="0.4" opacity="0.7" />
      </svg>
    </div>
  );
}

export default function CountrySelect() {
  const navigate = useNavigate();
  const { country, selectCountry } = useCountry();

  if (country) {
    return <Navigate to="/" replace />;
  }

  const handleSelect = (code: CountryCode, available: boolean) => {
    if (!available) {
      toast.message("This country cockpit is not available yet.", {
        description: "Uganda is fully supported today. More countries will be added later.",
      });
      return;
    }
    selectCountry(code);
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr,minmax(0,420px)] lg:gap-14 xl:grid-cols-[1.1fr,minmax(0,440px)]">
          {/* Hero column */}
          <div className="landing-fade-up landing-stagger-1 text-center lg:text-left">
            <Badge
              variant="outline"
              className="mb-5 border-sidebar-primary/30 bg-card/60 backdrop-blur-sm text-[10px] font-medium tracking-wide gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3 w-3 text-sidebar-primary" />
              UN NDC decision-support · Climate TRACE
            </Badge>

            <div className="mb-6 flex justify-center lg:justify-start">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-sidebar-primary/20 blur-xl landing-card-glow" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--sidebar-background))] shadow-lg ring-1 ring-sidebar-primary/40">
                  <img src="/app-icon.svg" alt="" className="h-10 w-10" width={40} height={40} />
                </div>
              </div>
            </div>

            <h1 className="font-brand text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] leading-[1.12]">
              NDC Data
              <span className="block text-sidebar-primary">Explorer</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Choose your country to open a decision-support cockpit — link climate commitments to
              live emissions, districts, and delivery priorities.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3 max-w-md mx-auto lg:mx-0 lg:max-w-none">
              {HIGHLIGHTS.map((h, i) => (
                <div
                  key={h.label}
                  className={cn(
                    "landing-fade-up rounded-xl border border-border/60 bg-card/70 backdrop-blur-md px-3 py-2.5 text-left shadow-sm transition-shadow hover:shadow-md hover:border-sidebar-primary/25",
                    `landing-stagger-${Math.min(i + 2, 5)}`,
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <h.icon className="h-3.5 w-3.5 text-sidebar-primary shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">{h.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-5">{h.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Country picker */}
          <div className="landing-fade-up landing-stagger-3 w-full max-w-md mx-auto lg:max-w-none">
            <Card className="border-border/50 bg-card/85 shadow-xl backdrop-blur-xl ring-1 ring-white/50 dark:ring-white/10 overflow-hidden">
              <div className="relative h-1 w-full overflow-hidden bg-muted">
                <div className="landing-shimmer-bar absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sidebar-primary/60 to-transparent" />
              </div>
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-sidebar-primary" />
                  <CardTitle className="text-base font-brand">Select country</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Your selection applies for this browser session.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-5">
                <ul className="grid gap-2 sm:grid-cols-1">
                  {COUNTRY_OPTIONS.map((c, i) => (
                    <li
                      key={c.code}
                      className={cn("landing-fade-up", `landing-stagger-${Math.min(i + 3, 5)}`)}
                    >
                      <button
                        type="button"
                        disabled={!c.available}
                        onClick={() => handleSelect(c.code, c.available)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-300",
                          c.available
                            ? cn(
                                "border-border/80 bg-background/80 hover:border-sidebar-primary/50 hover:bg-sidebar-primary/5 hover:shadow-md hover:-translate-y-0.5",
                                c.code === "UG" && "ring-1 ring-sidebar-primary/20 landing-card-glow",
                              )
                            : "border-border/50 bg-muted/20 opacity-70 cursor-not-allowed",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl transition-transform duration-300",
                            c.available && "group-hover:scale-110",
                            c.available ? "bg-muted/50" : "bg-muted/30 grayscale",
                          )}
                          aria-hidden
                        >
                          {c.flag}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">{c.name}</span>
                          {!c.available ? (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <Lock className="h-3 w-3" />
                              Coming soon
                            </span>
                          ) : (
                            <span className="text-[10px] text-sidebar-primary mt-0.5 font-medium">
                              Full cockpit available
                            </span>
                          )}
                        </span>
                        {c.available ? (
                          <Badge className="shrink-0 bg-sidebar-primary/15 text-sidebar-primary border-sidebar-primary/30 hover:bg-sidebar-primary/20 text-[10px]">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
                            Soon
                          </Badge>
                        )}
                        {c.available && (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-sidebar-primary" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <p className="mt-5 text-center text-[11px] text-muted-foreground landing-fade-up landing-stagger-5">
              Need another country?{" "}
              <span className="text-foreground/80">Contact your programme administrator</span> to request onboarding.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] text-muted-foreground/80 landing-fade-up landing-stagger-5">
          Data: Climate TRACE (CC BY 4.0) · NDC alignment: Uganda Updated NDC (2022)
        </p>
      </div>
    </div>
  );
}

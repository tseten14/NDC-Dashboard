import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, Layers3, MapPinned, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { isPrimaryNavVisible } from "@/lib/role-capabilities";
import { PRIMARY_NAV } from "@/lib/navigation";

export default function Home() {
  const { country } = useCountry();
  const { activeRole } = useCurrentRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canExplore = isPrimaryNavVisible(activeRole, "/dashboard");
  const tools = PRIMARY_NAV.filter((item) => item.url !== "/" && isPrimaryNavVisible(activeRole, item.url));

  useEffect(() => {
    if (searchParams.has("target") || searchParams.has("sector")) {
      navigate(`/dashboard?${searchParams.toString()}`, { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-card">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_65%)]" />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12 lg:p-12">
            <div className="flex flex-col items-start justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground">
                <span aria-hidden="true">{country?.flag ?? "🌍"}</span>{country?.name ?? "National"} climate workspace
              </span>
              <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                Climate evidence.<br /><span className="text-primary">Clearer decisions.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Explore emissions, understand local priorities, and connect {country?.name ?? "your country"}’s climate commitments to the work ahead.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="h-11 gap-2 rounded-xl px-5">
                  <Link to={canExplore ? "/district-translator" : "/my-work"}>
                    {canExplore ? <MapPinned className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />}
                    {canExplore ? "Explore a district" : "Open Database"}<ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {canExplore && <Button asChild variant="outline" className="h-11 gap-2 rounded-xl px-5">
                  <Link to="/dashboard">Open Dashboard<ArrowUpRight className="h-4 w-4" /></Link>
                </Button>}
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />Source-linked evidence. Clear coverage and limitations.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">A practical starting point</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">From national to local.</h2>
              <div className="mt-6 space-y-6">
                {[
                  { icon: Target, title: "Understand the commitment", description: "Start with national targets and sector-level progress." },
                  { icon: MapPinned, title: "Look closer at a place", description: "Select a district or draw an area to examine mapped sources." },
                  { icon: Layers3, title: "Take the evidence with you", description: "Export insights with their sources, units, and coverage notes." },
                ].map((step, index) => <div key={step.title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary"><step.icon className="h-5 w-5" aria-hidden="true" /></span>
                  <div><h3 className="text-sm font-semibold"><span className="mr-1.5 text-muted-foreground">{index + 1}.</span>{step.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p></div>
                </div>)}
              </div>
              <p className="mt-6 border-t pt-4 text-xs leading-relaxed text-muted-foreground">District Translator reports mapped Climate TRACE sources, not a complete district inventory.</p>
            </div>
          </div>
        </section>
        <section aria-labelledby="workspace-tools-heading" className="py-9 sm:py-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">Choose your next step</p><h2 id="workspace-tools-heading" className="mt-2 text-2xl font-semibold tracking-tight">Your tools, in one place.</h2></div>
            <p className="text-sm text-muted-foreground">Explore, plan, and deliver with context.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((item) => <Link key={item.url} to={item.url} className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"><item.icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{item.description}</span></span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
            </Link>)}
          </div>
        </section>
        {isPrimaryNavVisible(activeRole, "/docs") && <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><BookOpen className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><h2 className="font-semibold">Know what the data can—and cannot—tell you.</h2><p className="mt-1 text-sm text-muted-foreground">Read about methods, coverage, and how to interpret the results.</p></div></div>
          <Button asChild variant="outline" className="h-10 shrink-0 gap-2"><Link to="/docs">Read the guide<ArrowRight className="h-4 w-4" /></Link></Button>
        </section>}
      </div>
    </div>
  );
}

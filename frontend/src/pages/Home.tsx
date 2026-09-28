/** Entry page for the country's NDC workspace. */
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="border-b border-border pb-8">
          <p className="text-sm font-semibold text-muted-foreground">{country?.name ?? "National"} NDC workspace</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">Climate evidence and planning</h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
            Examine emissions, national targets, district evidence, and delivery options. Each data view shows its source and limits.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link to={canExplore ? "/district-translator" : "/my-work"}>{canExplore ? "Explore a district" : "Open Database"}</Link></Button>
            {canExplore && <Button asChild variant="outline"><Link to="/dashboard">Open Dashboard</Link></Button>}
          </div>
        </header>

        <section aria-labelledby="workspace-tools-heading" className="py-8">
          <h2 id="workspace-tools-heading" className="text-2xl font-semibold">Tools</h2>
          <p className="mt-2 max-w-prose text-muted-foreground">Choose a task below. Available tools depend on the selected role.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((item) => <Link key={item.url} to={item.url} className="block rounded-sm border border-border bg-card p-4 text-foreground focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring">
              <span className="block text-base font-semibold text-primary underline underline-offset-2">{item.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{item.description}</span>
            </Link>)}
          </div>
        </section>

        {isPrimaryNavVisible(activeRole, "/docs") && <section className="border-t border-border py-6">
          <h2 className="text-lg font-semibold">Methods and data limits</h2>
          <p className="mt-2 max-w-prose text-muted-foreground">Read the guide before using figures in a report or decision.</p>
          <Link to="/docs" className="mt-3 inline-block font-semibold text-primary underline underline-offset-2">Read the guide</Link>
        </section>}
      </div>
    </div>
  );
}

/** Country choice is required before the workspace opens. */
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { COUNTRY_OPTIONS, type CountryCode } from "@/data/countries";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { LOGIN_AUTH_ENABLED } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lockOperatorSession } from "@/lib/operator-session";
import { toast } from "sonner";

export default function CountrySelect() {
  const navigate = useNavigate();
  const { country, selectCountry } = useCountry();
  const { setActiveRole, signOut, user } = useCurrentRole();
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COUNTRY_OPTIONS.filter((item) => item.name.toLowerCase().includes(q)) : COUNTRY_OPTIONS;
  }, [query]);

  if (country) return <Navigate to="/" replace />;

  const handleSelect = (code: CountryCode, available: boolean) => {
    if (!available) {
      toast.message("This country cockpit is not available yet.", {
        description: "Uganda is fully supported today. More countries will be added later.",
      });
      return;
    }
    selectCountry(code);
    setActiveRole("Admin");
    navigate("/", { replace: true });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    let importLockFailed = false;
    try { await lockOperatorSession(); } catch { importLockFailed = true; }
    try {
      await signOut();
      navigate("/auth", { replace: true });
      if (importLockFailed) toast.error("Signed out, but import access could not be locked on this device.");
    } catch {
      toast.error("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="text-lg font-bold">NDC Data Explorer</span>
          {LOGIN_AUTH_ENABLED && user?.email && <Button variant="outline" onClick={() => { void handleSignOut(); }} disabled={signingOut}>
            {signingOut ? "Signing out…" : `Sign out (${user.email})`}
          </Button>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">NDC Data Explorer / Select country</nav>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <section aria-labelledby="country-heading">
            <h1 id="country-heading" className="text-3xl font-bold leading-tight sm:text-4xl">Select a country</h1>
            <p className="mt-4 max-w-prose text-base text-muted-foreground">
              Choose the country whose NDC data you want to examine. Your selection applies for this browser session.
            </p>
            <div className="mt-8 border-l-4 border-primary pl-4">
              <h2 className="text-lg font-semibold">About this workspace</h2>
              <p className="mt-2 max-w-prose">The explorer connects national commitments with observed emissions, district evidence, and delivery tools. Coverage and data limits are shown with each view.</p>
            </div>
          </section>
          <section aria-label="Country options" className="rounded-sm border border-border bg-card p-5 sm:p-6">
            <Label htmlFor="country-search">Search countries</Label>
            <Input id="country-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a country name" />
            <ul className="mt-5 space-y-3">
              {filteredCountries.length === 0 && <li className="border border-border p-4 text-muted-foreground">No countries match “{query.trim()}”.</li>}
              {filteredCountries.map((item) => <li key={item.code}>
                <button type="button" disabled={!item.available} onClick={() => handleSelect(item.code, item.available)} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-sm border border-border bg-background px-4 py-3 text-left disabled:bg-muted">
                  <span className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="text-xl">{item.flag}</span>
                    <span><span className="block font-semibold">{item.name}</span><span className="block text-sm text-muted-foreground">{item.available ? "Full cockpit available" : "Coming soon"}</span></span>
                  </span>
                  <span aria-hidden="true" className="text-primary">{item.available ? "→" : ""}</span>
                </button>
              </li>)}
            </ul>
            <p className="mt-5 text-sm text-muted-foreground">Need another country? Contact your programme administrator to request onboarding.</p>
          </section>
        </div>
      </main>
      <footer className="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-6">Data: Climate TRACE (CC BY 4.0) · NDC alignment: Uganda Updated NDC (2022)</footer>
    </div>
  );
}

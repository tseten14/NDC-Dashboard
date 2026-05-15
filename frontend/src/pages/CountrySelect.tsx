import { Navigate, useNavigate } from "react-router-dom";
import { COUNTRY_OPTIONS, type CountryCode } from "@/data/countries";
import { useCountry } from "@/context/CountryContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Globe2, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Globe2 className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">NDC Data Explorer</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Choose a country to open its decision-support cockpit. Uganda is available now; other
              countries are coming soon.
            </p>
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select country</CardTitle>
            <CardDescription className="text-xs">
              Your selection applies for this browser session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {COUNTRY_OPTIONS.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    disabled={!c.available}
                    onClick={() => handleSelect(c.code, c.available)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                      c.available
                        ? "border-border hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : "border-border/60 bg-muted/30 opacity-75 cursor-not-allowed",
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {c.flag}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{c.name}</span>
                      {!c.available && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Lock className="h-3 w-3" />
                          Coming soon
                        </span>
                      )}
                    </span>
                    {c.available ? (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
                        Soon
                      </Badge>
                    )}
                    {c.available && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Need another country? Contact your programme administrator to request onboarding.
        </p>
      </div>
    </div>
  );
}

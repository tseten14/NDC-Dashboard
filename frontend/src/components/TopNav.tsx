import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { isPrimaryNavVisible } from "@/lib/role-capabilities";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";
import {
  Upload, Target, Sparkles, Coins, Workflow, Scale, Map, Home,
  BookOpen, Briefcase, Globe2, Leaf,
} from "lucide-react";

type NavItem = { title: string; url: string; icon: React.ElementType };

const primary: NavItem[] = [
  { title: "Home",               url: "/",               icon: Home },
  { title: "Dashboard",          url: "/dashboard",      icon: Target },
  { title: "Data Ingestion",     url: "/ingest",         icon: Upload },
  { title: "AI 2030 Prediction", url: "/ai-2030",        icon: Sparkles },
  { title: "Climate Finance",    url: "/climate-finance",icon: Coins },
  { title: "Policy Impact",      url: "/policy-impact",  icon: Workflow },
  { title: "Policy Documents",   url: "/documents",      icon: Scale },
  { title: "Emissions Map",      url: "/map",            icon: Map },
  { title: "My Work",            url: "/my-work",        icon: Briefcase },
  { title: "Documentation",      url: "/docs",           icon: BookOpen },
];

export function TopNav() {
  const { country, clearCountry } = useCountry();
  const navigate = useNavigate();
  const { activeRole } = useCurrentRole();
  const visiblePrimary = primary.filter((item) => isPrimaryNavVisible(activeRole, item.url));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top strip: brand + country + role */}
      <div className="flex h-12 items-center gap-4 px-6 border-b border-border/50">
        {/* Brand */}
        <NavLink to="/" end className="flex items-center gap-2.5 shrink-0 group" activeClassName="">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30 ring-1 ring-emerald-400/40 transition-shadow group-hover:shadow-emerald-500/50">
            <Leaf className="h-4 w-4 text-white drop-shadow-sm" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-extrabold tracking-tight text-foreground leading-none font-brand">NDC</p>
            <p className="text-[10px] font-medium text-muted-foreground tracking-wide leading-none mt-0.5">Data Explorer</p>
          </div>
        </NavLink>

        <div className="flex-1" />

        {/* Country + actions */}
        <div className="flex items-center gap-3">
          {country && (
            <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5">
              <span className="text-base leading-none">{country.flag}</span>
              {country.name}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => { clearCountry(); navigate("/select-country"); }}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{country ? "Change country" : "Select country"}</span>
          </Button>
          <div className="w-px h-4 bg-border" />
          <RoleSwitcher />
        </div>
      </div>

      {/* Nav links strip */}
      <div className="overflow-x-auto scrollbar-none">
        <nav className="flex items-center gap-0 px-4 min-w-max">
          {visiblePrimary.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="relative px-3.5 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-transparent hover:after:bg-border"
              activeClassName="text-foreground after:!bg-sidebar-primary"
            >
              {item.title}
            </NavLink>
          ))}

        </nav>
      </div>
    </header>
  );
}

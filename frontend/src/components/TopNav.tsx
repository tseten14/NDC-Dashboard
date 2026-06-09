import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  isAdvancedNavVisible,
  isPrimaryNavVisible,
  shouldShowAdvancedNav,
  getWorkQueueBadgeCount,
} from "@/lib/role-capabilities";
import { getWorkQueueCounts } from "@/lib/work-queue-counts";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Network, ShieldCheck, Wallet, Upload, ChevronDown,
  Target, TrendingUp, Building2, Eye, Trees, BarChart3, Users, LineChart,
  FileText, Download, Settings, Database, GitBranch, Workflow, Search,
  Library, Briefcase, ShieldAlert, Sparkles, Coins, BookOpen, Map, Home,
  Scale, Globe2, Leaf,
} from "lucide-react";

type NavItem = { title: string; url: string; icon: React.ElementType };

const primary: NavItem[] = [
  { title: "Home",              url: "/",               icon: Home },
  { title: "Dashboard",         url: "/dashboard",      icon: Target },
  { title: "Data Ingestion",    url: "/ingest",         icon: Upload },
  { title: "AI 2030 Prediction",url: "/ai-2030",        icon: Sparkles },
  { title: "Climate Finance",   url: "/climate-finance",icon: Coins },
  { title: "Policy Impact",     url: "/policy-impact",  icon: Workflow },
  { title: "Policy Documents",  url: "/documents",      icon: Scale },
  { title: "Emissions Map",     url: "/map",            icon: Map },
  { title: "Documentation",     url: "/docs",           icon: BookOpen },
];

const advanced: NavItem[] = [
  { title: "Strategy Library",        url: "/library",          icon: Library },
  { title: "My Work",                 url: "/my-work",          icon: Briefcase },
  { title: "Climate Risk",            url: "/risk",             icon: ShieldAlert },
  { title: "Executive Overview",      url: "/executive",        icon: LayoutDashboard },
  { title: "Delivery & Accountability",url: "/delivery",        icon: Network },
  { title: "Evidence & MRV",          url: "/evidence",        icon: ShieldCheck },
  { title: "Finance & Investment",    url: "/finance",          icon: Wallet },
  { title: "Indicators",              url: "/indicators",       icon: Database },
  { title: "Interlinkages",           url: "/interlinkages",    icon: GitBranch },
  { title: "Causal Chains",           url: "/causal-chains",    icon: Workflow },
  { title: "Project Check",           url: "/project-check",   icon: Search },
  { title: "Tenfold Growth",          url: "/tenfold",          icon: TrendingUp },
  { title: "NDP IV",                  url: "/ndp-iv",           icon: Building2 },
  { title: "Vision 2040",             url: "/vision-2040",      icon: Eye },
  { title: "AFOLU MRV",               url: "/afolu-mrv",        icon: Trees },
  { title: "KPIs & Proxies",          url: "/kpis",             icon: BarChart3 },
  { title: "Ownership & Focals",      url: "/ownership",        icon: Users },
  { title: "Projections",             url: "/projections",      icon: LineChart },
  { title: "Investment Templates",    url: "/investment",       icon: FileText },
  { title: "Exports & API",           url: "/exports",          icon: Download },
  { title: "Admin",                   url: "/admin",            icon: Settings },
];

export function TopNav() {
  const { country, clearCountry } = useCountry();
  const navigate = useNavigate();
  const { activeRole } = useCurrentRole();
  const [queueCounts, setQueueCounts] = useState({ approvals: 0, verifications: 0 });

  useEffect(() => {
    setQueueCounts(getWorkQueueCounts());
  }, [activeRole]);

  const myWorkBadge = useMemo(
    () => getWorkQueueBadgeCount(activeRole, queueCounts),
    [activeRole, queueCounts],
  );

  const visiblePrimary = primary.filter((item) => isPrimaryNavVisible(activeRole, item.url));
  const visibleAdvanced = advanced.filter((item) => isAdvancedNavVisible(activeRole, item.url));
  const showAdvanced = shouldShowAdvancedNav(activeRole) && visibleAdvanced.length > 0;

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

          {showAdvanced && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-3.5 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
                >
                  Advanced
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-[70vh] overflow-y-auto">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1.5">
                  Advanced tools
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleAdvanced.map((item) => (
                  <DropdownMenuItem key={item.url} asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2.5 w-full cursor-pointer px-2 py-1.5"
                      activeClassName="text-primary font-semibold"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm flex-1">{item.title}</span>
                      {item.url === "/my-work" && myWorkBadge > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px]">
                          {myWorkBadge}
                        </Badge>
                      )}
                    </NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}

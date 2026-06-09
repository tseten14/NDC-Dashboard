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
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Network, ShieldCheck, Wallet, Upload, ChevronDown,
  Target, TrendingUp, Building2, Eye, Trees, BarChart3, Users, LineChart,
  FileText, Download, Settings, Database, GitBranch, Workflow, Search,
  Library, Briefcase, ShieldAlert, Sparkles, Coins, BookOpen, Map, Home,
  Scale, Globe2,
} from "lucide-react";

type NavItem = { title: string; url: string; icon: React.ElementType };

const primary: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: Target },
  { title: "Data Ingestion", url: "/ingest", icon: Upload },
  { title: "AI 2030 Prediction", url: "/ai-2030", icon: Sparkles },
  { title: "Climate Finance", url: "/climate-finance", icon: Coins },
  { title: "Policy Impact", url: "/policy-impact", icon: Workflow },
  { title: "Policy documents", url: "/documents", icon: Scale },
  { title: "Emissions Map", url: "/map", icon: Map },
  { title: "Documentation", url: "/docs", icon: BookOpen },
];

const advanced: NavItem[] = [
  { title: "Strategy Library", url: "/library", icon: Library },
  { title: "My Work", url: "/my-work", icon: Briefcase },
  { title: "Climate Risk", url: "/risk", icon: ShieldAlert },
  { title: "Executive Overview", url: "/executive", icon: LayoutDashboard },
  { title: "Delivery & Accountability", url: "/delivery", icon: Network },
  { title: "Evidence & MRV", url: "/evidence", icon: ShieldCheck },
  { title: "Finance & Investment", url: "/finance", icon: Wallet },
  { title: "Indicators", url: "/indicators", icon: Database },
  { title: "Interlinkages", url: "/interlinkages", icon: GitBranch },
  { title: "Causal Chains", url: "/causal-chains", icon: Workflow },
  { title: "Project Check", url: "/project-check", icon: Search },
  { title: "Tenfold Growth", url: "/tenfold", icon: TrendingUp },
  { title: "NDP IV", url: "/ndp-iv", icon: Building2 },
  { title: "Vision 2040", url: "/vision-2040", icon: Eye },
  { title: "AFOLU MRV", url: "/afolu-mrv", icon: Trees },
  { title: "KPIs & Proxies", url: "/kpis", icon: BarChart3 },
  { title: "Ownership & Focals", url: "/ownership", icon: Users },
  { title: "Projections", url: "/projections", icon: LineChart },
  { title: "Investment Templates", url: "/investment", icon: FileText },
  { title: "Exports & API", url: "/exports", icon: Download },
  { title: "Admin", url: "/admin", icon: Settings },
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center gap-0 px-4">
        {/* Brand */}
        <NavLink
          to="/"
          end
          className="flex items-center gap-2.5 shrink-0 mr-4"
          activeClassName=""
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/15 ring-1 ring-sidebar-primary/30">
            <img src="/app-icon.svg" alt="" className="h-5 w-5" width={20} height={20} />
          </div>
          <div className="hidden sm:block font-brand leading-none">
            <p className="text-sm font-bold tracking-tight text-sidebar-primary">NDC</p>
            <p className="text-[10px] font-semibold text-foreground/70 tracking-wide">Data Explorer</p>
          </div>
        </NavLink>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-border mx-2 shrink-0" />

        {/* Primary nav — horizontally scrollable */}
        <nav className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <ul className="flex items-center gap-0.5 min-w-max">
            {visiblePrimary.map((item) => (
              <li key={item.url}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60 whitespace-nowrap"
                  activeClassName="text-foreground bg-accent"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {item.title}
                </NavLink>
              </li>
            ))}

            {/* Advanced dropdown */}
            {showAdvanced && (
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60 whitespace-nowrap"
                    >
                      Advanced
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 max-h-[70vh] overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Advanced tools
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {visibleAdvanced.map((item) => (
                      <DropdownMenuItem key={item.url} asChild>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-2 w-full cursor-pointer"
                          activeClassName="font-semibold text-primary"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-xs">{item.title}</span>
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
              </li>
            )}
          </ul>
        </nav>

        {/* Right side: country + role */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {country && (
            <span className="hidden lg:inline text-xs text-muted-foreground">
              {country.flag} {country.name}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 shrink-0"
            onClick={() => {
              clearCountry();
              navigate("/select-country");
            }}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className={cn("hidden", country ? "md:inline" : "sm:inline")}>
              {country ? "Change" : "Select country"}
            </span>
          </Button>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}

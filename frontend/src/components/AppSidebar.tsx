import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Network, ShieldCheck, Wallet, Upload, ChevronDown, ChevronRight,
  Target, TrendingUp, Building2, Eye, Trees, BarChart3, Users, LineChart, FileText, Download, Settings,
  Database, GitBranch, Workflow, Search, Library, Briefcase, ShieldAlert, Sparkles, Coins, BookOpen, Map, Home, Scale,
} from "lucide-react";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  isAdvancedNavVisible,
  isPrimaryNavVisible,
  shouldShowAdvancedNav,
  getWorkQueueBadgeCount,
} from "@/lib/role-capabilities";
import { getWorkQueueCounts } from "@/lib/work-queue-counts";
import { Badge } from "@/components/ui/badge";

const primary = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: Target },
  { title: "Data Ingestion", url: "/ingest", icon: Upload },
  { title: "AI 2030 Prediction", url: "/ai-2030", icon: Sparkles },
  { title: "Climate Finance", url: "/climate-finance", icon: Coins },
  { title: "Policy documents", url: "/documents", icon: Scale },
  { title: "Emissions Map", url: "/map", icon: Map },
  { title: "Documentation", url: "/docs", icon: BookOpen },
];

const advanced = [
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { activeRole } = useCurrentRole();
  const [queueCounts, setQueueCounts] = useState({ approvals: 0, verifications: 0 });
  const [advOpen, setAdvOpen] = useState(advanced.some(a => location.pathname.startsWith(a.url) && a.url !== "/"));

  useEffect(() => {
    setQueueCounts(getWorkQueueCounts());
  }, [location.pathname, activeRole]);

  const myWorkBadge = useMemo(
    () => getWorkQueueBadgeCount(activeRole, queueCounts),
    [activeRole, queueCounts],
  );

  const visiblePrimary = primary.filter((item) => isPrimaryNavVisible(activeRole, item.url));
  const visibleAdvanced = advanced.filter((item) => isAdvancedNavVisible(activeRole, item.url));
  const showAdvanced = shouldShowAdvancedNav(activeRole) && visibleAdvanced.length > 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`border-b border-sidebar-border ${collapsed ? "flex justify-center py-2.5" : "px-2.5 py-2.5 flex gap-2.5 items-center"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15 ring-1 ring-sidebar-primary/30">
            <img src="/app-icon.svg" alt="" className="h-6 w-6" width={24} height={24} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 font-brand">
              <p className="text-base font-bold tracking-tight text-sidebar-primary leading-none">NDC</p>
              <p className="text-xs font-semibold tracking-[0.03em] text-sidebar-foreground/90 leading-snug mt-0.5">
                Data Explorer
              </p>
            </div>
          )}
        </div>

        <SidebarGroup className="p-1.5">
          <SidebarGroupLabel className="h-7 px-1.5 text-[10px]">Basic</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visiblePrimary.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="sm">
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {!collapsed && <span className="text-[11px] leading-tight truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdvanced && (
          <SidebarGroup className="p-1.5">
            <SidebarGroupLabel
              className="h-7 px-1.5 text-[10px] cursor-pointer flex items-center gap-1 select-none"
              onClick={() => setAdvOpen(o => !o)}
            >
              {advOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Advanced
            </SidebarGroupLabel>
            {advOpen && (
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {visibleAdvanced.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild size="sm">
                        <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          {!collapsed && (
                            <span className="text-[11px] leading-tight truncate flex-1 flex items-center gap-1">
                              {item.title}
                              {item.url === "/my-work" && myWorkBadge > 0 && (
                                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] ml-auto">
                                  {myWorkBadge}
                                </Badge>
                              )}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

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
  Database, GitBranch, Workflow, Search, Library, Briefcase, ShieldAlert, Sparkles, Coins, Map, Home, Scale,
} from "lucide-react";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  isAdvancedNavVisible,
  getWorkQueueBadgeCount,
} from "@/lib/role-capabilities";
import { getWorkQueueCounts } from "@/lib/work-queue-counts";
import { Badge } from "@/components/ui/badge";
import { DataHonestyBadge } from "@/components/DataHonestyBadge";

type NavItem = { title: string; url: string; icon: React.ElementType };

const topItems: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Data Ingestion", url: "/ingest", icon: Upload },
  { title: "Policy documents", url: "/documents", icon: Scale },
  { title: "My Work", url: "/my-work", icon: Briefcase },
  { title: "Executive Overview", url: "/executive", icon: LayoutDashboard },
];

const questionGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Are we on track?",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Target },
      { title: "Indicators", url: "/indicators", icon: Database },
      { title: "Evidence & MRV", url: "/evidence", icon: ShieldCheck },
      { title: "Projections", url: "/projections", icon: LineChart },
      { title: "Emissions Map", url: "/map", icon: Map },
    ],
  },
  {
    label: "Which interventions work?",
    items: [
      { title: "Project Check", url: "/project-check", icon: Search },
      { title: "Delivery & Accountability", url: "/delivery", icon: Network },
      { title: "Causal Chains", url: "/causal-chains", icon: Workflow },
      { title: "Interlinkages", url: "/interlinkages", icon: GitBranch },
      { title: "KPIs & Proxies", url: "/kpis", icon: BarChart3 },
      { title: "Cost Effectiveness", url: "/cost-effectiveness", icon: BarChart3 },
    ],
  },
  {
    label: "Where are the bottlenecks?",
    items: [
      { title: "Delivery & Accountability", url: "/delivery", icon: Network },
      { title: "Finance & Investment", url: "/finance", icon: Wallet },
      { title: "Climate Finance", url: "/climate-finance", icon: Coins },
      { title: "Ownership & Focals", url: "/ownership", icon: Users },
      { title: "Financial Flows", url: "/financial-flow", icon: Coins },
    ],
  },
  {
    label: "Where do we invest next?",
    items: [
      { title: "AI 2030 Prediction", url: "/ai-2030", icon: Sparkles },
      { title: "Investment Templates", url: "/investment", icon: FileText },
      { title: "Tenfold Growth", url: "/tenfold", icon: TrendingUp },
      { title: "Policy Impact", url: "/policy-impact", icon: Workflow },
    ],
  },
  {
    label: "Are we aligned?",
    items: [
      { title: "Ownership & Focals", url: "/ownership", icon: Users },
      { title: "NDP IV", url: "/ndp-iv", icon: Building2 },
      { title: "Vision 2040", url: "/vision-2040", icon: Eye },
      { title: "Interlinkages", url: "/interlinkages", icon: GitBranch },
      { title: "Institutional Map", url: "/institutional-map", icon: Building2 },
    ],
  },
];

const adminItems: NavItem[] = [
  { title: "Admin", url: "/admin", icon: Settings },
  { title: "Exports & API", url: "/exports", icon: Download },
  { title: "AFOLU MRV", url: "/afolu-mrv", icon: Trees },
  { title: "Strategy Library", url: "/library", icon: Library },
  { title: "Climate Risk", url: "/risk", icon: ShieldAlert },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { activeRole } = useCurrentRole();
  const [queueCounts, setQueueCounts] = useState({ approvals: 0, verifications: 0 });

  // Track open state for each question group (all start open)
  const [groupOpen, setGroupOpen] = useState<boolean[]>(questionGroups.map(() => true));

  useEffect(() => {
    setQueueCounts(getWorkQueueCounts());
  }, [location.pathname, activeRole]);

  const myWorkBadge = useMemo(
    () => getWorkQueueBadgeCount(activeRole, queueCounts),
    [activeRole, queueCounts],
  );

  const toggleGroup = (idx: number) => {
    setGroupOpen(prev => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const renderItem = (item: NavItem) => {
    if (!isAdvancedNavVisible(activeRole, item.url)) return null;
    return (
      <SidebarMenuItem key={`${item.url}-${item.title}`}>
        <SidebarMenuButton asChild size="sm">
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="hover:bg-sidebar-accent/50"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
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
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand / logo */}
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

        {/* Always-visible top items */}
        <SidebarGroup className="p-1.5">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {topItems.map(item => {
                if (!isAdvancedNavVisible(activeRole, item.url)) return null;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild size="sm">
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
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
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Q1–Q5 collapsible question groups */}
        {questionGroups.map((group, idx) => {
          const visibleItems = group.items.filter(
            item => isAdvancedNavVisible(activeRole, item.url),
          );
          if (visibleItems.length === 0) return null;
          const isOpen = groupOpen[idx];
          return (
            <SidebarGroup key={group.label} className="p-1.5 pt-0">
              <SidebarGroupLabel
                className="h-7 px-1.5 cursor-pointer flex items-center gap-1 select-none text-[10px] font-bold text-sidebar-primary/80 uppercase tracking-wider"
                onClick={() => toggleGroup(idx)}
              >
                {isOpen
                  ? <ChevronDown className="h-3 w-3 shrink-0" />
                  : <ChevronRight className="h-3 w-3 shrink-0" />}
                {!collapsed && <span className="truncate">{group.label}</span>}
              </SidebarGroupLabel>
              {isOpen && (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {visibleItems.map(item => renderItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}

        {/* Admin section (role-gated) */}
        {adminItems.some(item => isAdvancedNavVisible(activeRole, item.url)) && (
          <SidebarGroup className="p-1.5 pt-0">
            {!collapsed && (
              <SidebarGroupLabel className="h-7 px-1.5 text-[10px] font-bold text-sidebar-primary/80 uppercase tracking-wider">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {adminItems.map(item => {
                  if (!isAdvancedNavVisible(activeRole, item.url)) return null;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild size="sm">
                        <NavLink
                          to={item.url}
                          className="hover:bg-sidebar-accent/50"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          {!collapsed && (
                            <span className="text-[11px] leading-tight truncate">{item.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* DataHonestyBadge at the bottom */}
        {!collapsed && (
          <div className="mt-auto p-2.5 border-t border-sidebar-border">
            <DataHonestyBadge kind="illustrative" />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

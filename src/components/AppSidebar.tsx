import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useState } from "react";
import {
  LayoutDashboard, Network, ShieldCheck, Wallet, Upload, ChevronDown, ChevronRight,
  Target, TrendingUp, Building2, Eye, Trees, BarChart3, Users, LineChart, FileText, Download, Settings,
  Database, GitBranch, Workflow, Search, Library,
} from "lucide-react";

const primary = [
  { title: "NDC Layer (Home)", url: "/", icon: Target },
  { title: "Strategy Library", url: "/library", icon: Library },
];

const advanced = [
  { title: "Executive Overview", url: "/executive", icon: LayoutDashboard },
  { title: "Delivery & Accountability", url: "/delivery", icon: Network },
  { title: "Evidence & MRV", url: "/evidence", icon: ShieldCheck },
  { title: "Finance & Investment", url: "/finance", icon: Wallet },
  { title: "Data Ingestion", url: "/ingest", icon: Upload },
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
  const [advOpen, setAdvOpen] = useState(advanced.some(a => location.pathname.startsWith(a.url) && a.url !== "/"));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {!collapsed && (
          <div className="p-3 border-b border-sidebar-border">
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">Uganda NDC Data Explorer</p>
            <p className="text-[9px] text-sidebar-foreground/40 mt-0.5">Decision-support cockpit</p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Cockpit</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="text-xs">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel
            className="cursor-pointer flex items-center gap-1 select-none"
            onClick={() => setAdvOpen(o => !o)}
          >
            {advOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Advanced
          </SidebarGroupLabel>
          {advOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {advanced.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span className="text-xs">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

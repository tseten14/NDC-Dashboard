import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Target, TrendingUp, Building2, Eye, Trees,
  BarChart3, Users, LineChart, FileText, Download, Settings,
  Database, GitBranch, Workflow, Search,
} from "lucide-react";

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "NDC Layer", url: "/ndc", icon: Target },
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {!collapsed && (
          <div className="p-3 border-b border-sidebar-border">
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-semibold">Uganda Strategy Explorer</p>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
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
      </SidebarContent>
    </Sidebar>
  );
}

import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentRole, ALL_ROLES, type AppRole } from "@/hooks/use-current-role";
import { getDefaultRoute } from "@/lib/role-capabilities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ShieldOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function RoleSwitcher() {
  const { user, activeRole, availableRoles, setActiveRole, grantRole, signOut, isReadOnly } = useCurrentRole();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const switchRole = (role: AppRole) => {
    grantRole(role);
    const meta = ALL_ROLES.find((r) => r.id === role);
    toast.success(`Switched to ${meta?.label ?? role}`, {
      description: meta?.description,
    });

    const defaultRoute = getDefaultRoute(role);
    const onDashboard = location.pathname === "/dashboard" || location.pathname === "/ndc";

    if (role === "ProjectDeveloper") {
      navigate("/my-work");
    } else if (role === "Admin" && !location.pathname.startsWith("/admin")) {
      navigate("/admin");
    } else if (role === "SeniorDecisionMaker" && !onDashboard) {
      navigate(defaultRoute);
    } else if (onDashboard && role === "MRVOfficer") {
      navigate("/dashboard?sector=afolu", { replace: true });
    } else if (onDashboard && (role === "FieldOfficer" || role === "SeniorDecisionMaker" || role === "MinistryDeliveryOfficer")) {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isReadOnly() && (
        <Badge variant="outline" className="h-5 text-[9px] gap-1 border-muted-foreground/40">
          <ShieldOff className="h-2.5 w-2.5" /> Read-only
        </Badge>
      )}
      <Select value={activeRole ?? ""} onValueChange={(v) => switchRole(v as AppRole)}>
        <SelectTrigger className="w-[180px] h-7 text-[11px]" aria-label="Switch active role">
          <SelectValue placeholder="Select role…" />
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((r) => {
            const meta = ALL_ROLES.find((x) => x.id === r);
            return (
              <SelectItem key={r} value={r}>
                <span className="text-xs">{meta?.label ?? r}</span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" aria-label="Open role management menu">
            <UserPlus className="h-3 w-3" /> Roles
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel className="text-[10px]">Switch demo role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_ROLES.map((r) => (
            <DropdownMenuItem key={r.id} onClick={() => switchRole(r.id)}>
              <div className="flex flex-col">
                <span className="text-[11px]">{r.label}</span>
                <span className="text-[9px] text-muted-foreground">{r.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-3 w-3 mr-1" /> <span className="text-[11px]">Reset role</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

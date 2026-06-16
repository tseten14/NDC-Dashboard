import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentRole, ALL_ROLES, type AppRole } from "@/hooks/use-current-role";
import { getDefaultRoute } from "@/lib/role-capabilities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";

export function RoleSwitcher() {
  const { user, activeRole, grantRole, isReadOnly } = useCurrentRole();
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
          {ALL_ROLES.map((meta) => (
            <SelectItem key={meta.id} value={meta.id}>
              <span className="text-xs">{meta.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

    </div>
  );
}

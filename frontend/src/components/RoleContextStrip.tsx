/**
 * Strip showing the active role.
 *
 * A constant reminder of which role is selected, since the role changes what is
 * visible and what may be changed.
 */
import { useCurrentRole, ALL_ROLES } from "@/hooks/use-current-role";
import { getRoleContextMessage } from "@/lib/role-capabilities";
import { UserCircle2 } from "lucide-react";

export function RoleContextStrip() {
  const { activeRole, loading } = useCurrentRole();
  if (loading || !activeRole) return null;

  const label = ALL_ROLES.find((r) => r.id === activeRole)?.label ?? activeRole;

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/40 px-3 py-1 flex items-center gap-2 min-h-[26px]">
      <UserCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
      <p className="text-[10px] text-muted-foreground leading-snug truncate">
        <span className="font-semibold text-foreground">{label}:</span>{" "}
        {getRoleContextMessage(activeRole)}
      </p>
    </div>
  );
}

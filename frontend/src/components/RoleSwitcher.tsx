import { useCurrentRole, ALL_ROLES, type AppRole } from "@/hooks/use-current-role";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ShieldOff, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function RoleSwitcher() {
  const { user, activeRole, availableRoles, setActiveRole, signOut, refreshRoles, isReadOnly } = useCurrentRole();
  const [granting, setGranting] = useState<AppRole | null>(null);

  if (!user) return null;

  const grantRole = async (role: AppRole) => {
    setGranting(role);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    setGranting(null);
    if (error && !error.message.includes("duplicate")) {
      toast.error(`Could not grant role: ${error.message}`);
      return;
    }
    await refreshRoles();
    setActiveRole(role);
    toast.success(`Switched to ${role}`);
  };

  return (
    <div className="flex items-center gap-2">
      {isReadOnly() && (
        <Badge variant="outline" className="h-5 text-[9px] gap-1 border-muted-foreground/40">
          <ShieldOff className="h-2.5 w-2.5" /> Read-only
        </Badge>
      )}
      <Select value={activeRole ?? ""} onValueChange={(v) => setActiveRole(v as AppRole)}>
        <SelectTrigger className="w-[180px] h-7 text-[11px]">
          <SelectValue placeholder="Select role…" />
        </SelectTrigger>
        <SelectContent>
          {availableRoles.length === 0 && (
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground">No roles assigned yet</div>
          )}
          {availableRoles.map(r => {
            const meta = ALL_ROLES.find(x => x.id === r);
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
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1">
            <UserPlus className="h-3 w-3" /> Demo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel className="text-[10px]">Grant yourself a role (demo)</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_ROLES.map(r => (
            <DropdownMenuItem key={r.id} onClick={() => grantRole(r.id)} disabled={granting !== null}>
              {granting === r.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              <div className="flex flex-col">
                <span className="text-[11px]">{r.label}</span>
                <span className="text-[9px] text-muted-foreground">{r.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-3 w-3 mr-1" /> <span className="text-[11px]">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

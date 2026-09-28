/**
 * Controls entry to protected application content; while site-wide login is disabled it passes visitors through without granting operator permissions.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentRole } from "@/hooks/use-current-role";
import { LOGIN_AUTH_ENABLED } from "@/lib/auth-config";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentRole();
  const location = useLocation();
  if (!LOGIN_AUTH_ENABLED) return <>{children}</>;
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">Checking your session…</div>;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
}

import { ReactNode } from "react";

/** App runs in local demo mode — no remote sign-in gate. */
export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

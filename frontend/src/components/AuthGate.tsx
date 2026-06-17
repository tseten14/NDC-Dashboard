import { ReactNode } from "react";

/** App runs without a remote sign-in gate. */
export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

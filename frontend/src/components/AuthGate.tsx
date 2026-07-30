/**
 * Sign-in gate.
 *
 * Wraps screens that require a signed-in user. Currently a pass-through
 * placeholder — real authentication is not yet wired up.
 */
import { ReactNode } from "react";

/** App runs without a remote sign-in gate. */
export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Keeps track of whether the import screens are currently unlocked.
 *
 * Several parts of the import area need the same answer — the unlock box, the
 * upload panels, the job list — and they must not disagree. Holding the answer
 * in one place, checked against the server rather than remembered locally,
 * means an expired session shows up everywhere at once instead of leaving one
 * panel apparently working until its next request fails.
 *
 * Note the direction of trust: this is a convenience for the interface, not a
 * security control. Nothing here decides whether an import is permitted — the
 * server does that on every request, and would refuse one from a browser that
 * had rewritten this state to say "unlocked".
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getOperatorSession,
  lockOperatorSession,
  unlockOperatorSession,
} from "@/lib/operator-session";

interface OperatorSessionContextValue {
  /** Undefined until the first check completes, so the UI can avoid flashing a login box. */
  authenticated: boolean | undefined;
  /** False when no passphrase is configured server-side — importing is unavailable, not locked. */
  configured: boolean;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => Promise<void>;
  refresh: () => Promise<void>;
}

const OperatorSessionContext = createContext<OperatorSessionContextValue | null>(null);

export function OperatorSessionProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | undefined>(undefined);
  const [configured, setConfigured] = useState(true);

  const refresh = useCallback(async () => {
    const state = await getOperatorSession();
    setAuthenticated(state.authenticated);
    setConfigured(state.configured);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlock = useCallback(
    async (passphrase: string) => {
      await unlockOperatorSession(passphrase);
      // Re-read from the server rather than assuming success set the cookie —
      // if a browser is blocking third-party cookies the unlock silently would
      // not stick, and showing "unlocked" then failing every import is worse
      // than showing that it did not work.
      await refresh();
    },
    [refresh],
  );

  const lock = useCallback(async () => {
    await lockOperatorSession();
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ authenticated, configured, unlock, lock, refresh }),
    [authenticated, configured, unlock, lock, refresh],
  );

  return <OperatorSessionContext.Provider value={value}>{children}</OperatorSessionContext.Provider>;
}

export function useOperatorSession(): OperatorSessionContextValue {
  const ctx = useContext(OperatorSessionContext);
  if (!ctx) {
    throw new Error("useOperatorSession must be used inside an OperatorSessionProvider");
  }
  return ctx;
}

/**
 * Unlocking the import screens from the browser.
 *
 * The screens that write data are held behind a passphrase an operator types
 * once per session. This module is the browser half of that exchange: it sends
 * the passphrase, asks whether the session is still valid, and locks again.
 *
 * The passphrase is never kept. It is sent, checked, and forgotten — the proof
 * of having known it lives in a cookie the server sets and this code cannot
 * read, which is the whole point. Nothing here writes to localStorage, because
 * anything stored there is readable by any script that ends up on the page.
 */
import { resolveApiHost } from "./api";

const BASE = resolveApiHost();

export interface OperatorSessionState {
  /** Whether this browser currently holds a valid unlock. */
  authenticated: boolean;
  /** Whether the server has a passphrase configured at all. */
  configured: boolean;
}

/** Ask the server whether this browser is still unlocked. */
export async function getOperatorSession(): Promise<OperatorSessionState> {
  try {
    const res = await fetch(`${BASE}/api/v1/auth/session`, { credentials: "include" });
    if (!res.ok) return { authenticated: false, configured: false };
    return (await res.json()) as OperatorSessionState;
  } catch {
    return { authenticated: false, configured: false };
  }
}

export class OperatorUnlockError extends Error {}

/**
 * Exchange the passphrase for a session.
 *
 * On success the server sets the cookie and there is nothing to return but the
 * fact that it worked — deliberately, so no caller is tempted to hold on to the
 * passphrase "in case it is needed again".
 */
export async function unlockOperatorSession(passphrase: string): Promise<void> {
  const res = await fetch(`${BASE}/api/v1/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ passphrase }),
  });

  if (res.ok) return;

  if (res.status === 429) {
    throw new OperatorUnlockError("Too many attempts. Wait a few minutes and try again.");
  }
  if (res.status === 503) {
    throw new OperatorUnlockError(
      "Importing is not configured on this server. Ask an administrator to set the operator passphrase.",
    );
  }
  // Every wrong passphrase gets the same sentence. Saying anything more precise
  // would tell someone guessing how close they were.
  throw new OperatorUnlockError("That passphrase was not accepted.");
}

export async function lockOperatorSession(): Promise<void> {
  await fetch(`${BASE}/api/v1/auth/session`, {
    method: "DELETE",
    credentials: "include",
  }).catch(() => undefined);
}

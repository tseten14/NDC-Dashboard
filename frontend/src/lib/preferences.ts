/**
 * Reads and writes browser-local display and workspace preferences with stable defaults.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
export function readPreference(kind: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[kind].getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(kind: "localStorage" | "sessionStorage", key: string, value: string | null): void {
  try {
    if (value === null) window[kind].removeItem(key);
    else window[kind].setItem(key, value);
  } catch {
    return;
  }
}

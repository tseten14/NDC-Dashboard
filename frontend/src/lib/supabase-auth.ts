/**
 * Contains the optional Supabase browser client used when site-wide sign-in is re-enabled.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { createClient } from "@supabase/supabase-js";
import { LOGIN_AUTH_ENABLED } from "@/lib/auth-config";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// On Vercel, send Auth traffic through this app's domain. Some browsers or
// networks block requests to the Supabase hostname even when the page loads.
// Keep the configured Supabase URL so the SDK retains its existing session key.
const authFetch: typeof fetch = (input, init) => {
  if (url && typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    const supabaseUrl = new URL(url);
    if (requestUrl.origin === supabaseUrl.origin && requestUrl.pathname.startsWith("/auth/v1/")) {
      const proxyUrl = new URL(`/supabase-auth${requestUrl.pathname.slice("/auth/v1".length)}${requestUrl.search}`, window.location.origin);
      return fetch(input instanceof Request ? new Request(proxyUrl, input) : proxyUrl, init);
    }
  }
  return fetch(input, init);
};

// Only the publishable key belongs in the browser. Supabase Auth persists
// accounts in the project's auth.users table and stores no password here.
export const supabaseAuth = LOGIN_AUTH_ENABLED && url && key
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: authFetch },
    })
  : null;

export function requireSupabaseAuth() {
  if (!supabaseAuth) {
    throw new Error("Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabaseAuth;
}

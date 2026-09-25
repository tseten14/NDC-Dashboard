import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CurrentRoleProvider, useCurrentRole } from "@/hooks/use-current-role";

const getSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase-auth", () => ({ supabaseAuth: { auth: { getSession } } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("uses a stable local identity and roles without checking a login session", async () => {
  function Identity() {
    const { user, loading, activeRole } = useCurrentRole();
    return <p>{loading ? "Loading" : `${user?.id ?? "anonymous"}:${activeRole ?? "none"}`}</p>;
  }

  render(<CurrentRoleProvider><Identity /></CurrentRoleProvider>);
  await waitFor(() => expect(screen.getByText("local-user:Admin")).toBeInTheDocument());
  expect(getSession).not.toHaveBeenCalled();
});

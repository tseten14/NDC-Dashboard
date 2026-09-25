import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/components/AuthGate";
import Auth from "@/pages/Auth";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  loading: false,
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@/hooks/use-current-role", () => ({ useCurrentRole: () => ({ user: state.user, loading: state.loading }) }));
vi.mock("@/lib/supabase-auth", () => ({
  supabaseAuth: { auth: { signUp: state.signUp, signInWithPassword: state.signInWithPassword } },
  requireSupabaseAuth: () => ({ auth: { signUp: state.signUp, signInWithPassword: state.signInWithPassword } }),
}));

afterEach(() => {
  cleanup();
  state.user = null;
  state.loading = false;
  vi.clearAllMocks();
});

describe("account entry", () => {
  it("redirects a signed-out visitor to the login page and remembers their destination", () => {
    render(<MemoryRouter initialEntries={["/my-work"]}><Routes>
      <Route path="/my-work" element={<AuthGate><p>Private workspace</p></AuthGate>} />
      <Route path="/auth" element={<p>Sign in here</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText("Sign in here")).toBeInTheDocument();
    expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
  });

  it("sends email and display name to Supabase when anyone creates an account", async () => {
    state.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<MemoryRouter initialEntries={["/auth"]}><Auth /></MemoryRouter>);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Create account" }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.org" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(state.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "ada@example.org",
      password: "password123",
      options: expect.objectContaining({ data: { display_name: "Ada" } }),
    })));
    expect(await screen.findByText(/Check your email for a confirmation link/)).toBeInTheDocument();
  });
});

import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/hooks/use-current-role";
import { requireSupabaseAuth, supabaseAuth } from "@/lib/supabase-auth";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useCurrentRole();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const destination = from?.pathname && from.pathname !== "/auth"
    ? `${from.pathname}${from.search ?? ""}`
    : "/";

  useEffect(() => {
    if (!loading && user) navigate(destination, { replace: true });
  }, [destination, loading, navigate, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const auth = requireSupabaseAuth();
      if (mode === "signup") {
        const { data, error: signupError } = await auth.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() || email.trim().split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setNotice("Check your email for a confirmation link, then sign in.");
          setMode("signin");
        } else {
          navigate(destination, { replace: true });
        }
      } else {
        const { error: signinError } = await auth.auth.signInWithPassword({ email: email.trim(), password });
        if (signinError) throw signinError;
        navigate(destination, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-left">
          <CardTitle>NDC Data Explorer</CardTitle>
          <CardDescription>Sign in to your climate data workspace, or create an account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          {!supabaseAuth && <p role="alert" className="mb-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">Sign-in is not configured. Set the Supabase URL and publishable key for this deployment.</p>}
          {error && <p role="alert" className="mb-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-md border border-primary/40 p-3 text-sm">{notice}</p>}
          <Tabs value={mode} onValueChange={(value) => { setMode(value); setError(""); setNotice(""); }}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Create account</TabsTrigger></TabsList>
            <TabsContent value={mode}>
              <form onSubmit={submit} className="space-y-4 pt-4">
                {mode === "signup" && <div className="space-y-1.5"><Label htmlFor="auth-name">Display name</Label><Input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></div>}
                <div className="space-y-1.5"><Label htmlFor="auth-email">Email</Label><Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="auth-password">Password</Label><Input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy || !supabaseAuth}>
                  {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

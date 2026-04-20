import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) nav("/", { replace: true });
    });
  }, [nav]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created. You can sign in now.");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Uganda NDC Data Explorer</CardTitle>
          <CardDescription className="text-xs">
            Sign in to access role-based delivery tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full h-8">
              <TabsTrigger value="signin" className="text-xs">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Password</Label>
                  <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-8 text-xs" />
                </div>
                <Button type="submit" disabled={busy} className="w-full h-8 text-xs">
                  {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Display name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Password</Label>
                  <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="h-8 text-xs" />
                </div>
                <Button type="submit" disabled={busy} className="w-full h-8 text-xs">
                  {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Create account
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Demo: every new account is granted Admin so you can switch roles in the top bar.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

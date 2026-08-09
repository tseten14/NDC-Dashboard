/**
 * The unlock box in front of the import screens.
 *
 * Importing can overwrite the figures the whole dashboard reports, so it asks
 * for an operator passphrase before showing the upload tools. Getting it right
 * once covers the working day; the server decides when that expires, not this
 * screen.
 *
 * What this is not: a security barrier. Hiding the buttons stops an accident,
 * not an attacker — anyone can edit what a browser displays. The real check
 * happens on the server for every single import request, and would refuse one
 * that arrived without a valid session no matter what this component showed.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Lock, LockOpen, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useOperatorSession } from "@/hooks/use-operator-session";

/** Shows children once unlocked; otherwise shows the passphrase prompt. */
export function OperatorUnlockGate({ children }: { children: ReactNode }) {
  const { authenticated, configured } = useOperatorSession();

  if (authenticated === undefined) {
    return <p className="text-xs text-muted-foreground p-4">Checking import permissions…</p>;
  }

  if (!configured) {
    return (
      <Card>
        <CardContent className="p-4 flex gap-3 items-start">
          <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Importing is switched off on this server</p>
            <p className="text-xs text-muted-foreground">
              No operator passphrase has been configured, so no one can write data here. An
              administrator needs to set one before importing will work.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!authenticated) return <OperatorUnlockForm />;

  return <>{children}</>;
}

function OperatorUnlockForm() {
  const { unlock } = useOperatorSession();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await unlock(passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That passphrase was not accepted.");
    } finally {
      // Clear it either way. Keeping the value in component state after the
      // attempt leaves it sitting in memory for no reason.
      setPassphrase("");
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Unlock importing</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Importing changes the numbers this dashboard reports, so it needs the operator
          passphrase. You will stay unlocked for the rest of the working day on this device.
        </p>
        <form onSubmit={onSubmit} className="space-y-2">
          <Input
            type="password"
            // Tells password managers this is a shared operator credential and
            // stops the browser offering the user's personal saved logins.
            autoComplete="current-password"
            name="operator-passphrase"
            placeholder="Operator passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={busy}
            aria-label="Operator passphrase"
          />
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" className="w-full" disabled={busy || !passphrase}>
            <LockOpen className="h-3.5 w-3.5 mr-1.5" />
            {busy ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Small "locked/unlocked" control for the import page header. */
export function OperatorSessionBadge() {
  const { authenticated, lock } = useOperatorSession();
  if (!authenticated) return null;
  return (
    <button
      type="button"
      onClick={() => void lock()}
      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      title="Lock importing on this device"
    >
      <LockOpen className="h-3 w-3" /> Unlocked · lock now
    </button>
  );
}

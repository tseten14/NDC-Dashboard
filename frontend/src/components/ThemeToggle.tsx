/**
 * Light and dark mode switch.
 */
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dark/light toggle. Uses the View Transitions API when available so the
 * whole page cross-fades as one composited snapshot (cheap and smooth);
 * falls back to an instant switch elsewhere.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggle = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (doc.startViewTransition && !reduced) {
      doc.startViewTransition(() => {
        flushSync(() => setTheme(next));
      });
    } else {
      setTheme(next);
    }
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground relative"
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={`h-3.5 w-3.5 absolute transition-all duration-300 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`h-3.5 w-3.5 absolute transition-all duration-300 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </Button>
  );
}

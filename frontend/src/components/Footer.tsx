/**
 * The page footer.
 *
 * Carries the Climate TRACE attribution required by its licence.
 */
import { Leaf, Satellite } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 shrink-0 border-t border-border bg-slate-900 text-slate-300 dark:bg-background dark:text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 ring-1 ring-emerald-400/30 shrink-0">
            <Leaf className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-xs text-slate-400 dark:text-muted-foreground">
            © {new Date().getFullYear()} <span className="text-slate-200 dark:text-foreground font-semibold font-brand">NDC Data Explorer</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Satellite className="h-3.5 w-3.5 shrink-0" />
            <span>Powered by <span className="text-slate-300 dark:text-foreground font-medium">Climate TRACE</span></span>
          </div>
          <span>·</span>
          <a href="https://climatetrace.org" target="_blank" rel="noreferrer" className="hover:text-slate-300 dark:hover:text-foreground transition-colors underline underline-offset-2">climatetrace.org</a>
        </div>
      </div>
    </footer>
  );
}

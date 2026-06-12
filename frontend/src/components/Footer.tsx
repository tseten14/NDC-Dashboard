import { Leaf, Satellite } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 shrink-0 border-t border-border bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 ring-1 ring-emerald-400/30 shrink-0">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} <span className="text-slate-200 font-semibold font-brand">NDC Data Explorer</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Satellite className="h-3.5 w-3.5 shrink-0" />
            <span>Powered by <span className="text-slate-300 font-medium">Climate TRACE</span></span>
          </div>
          <span>·</span>
          <a href="https://climatetrace.org" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors underline underline-offset-2">climatetrace.org</a>
        </div>
      </div>
    </footer>
  );
}

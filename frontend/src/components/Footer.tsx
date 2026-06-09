import { Link } from "react-router-dom";
import { Leaf, Satellite } from "lucide-react";

export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand + tagline */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm ring-1 ring-emerald-400/30 shrink-0">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight font-brand">NDC Data Explorer</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Uganda · Decision-support cockpit</p>
            </div>
          </div>

          {/* Center links */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
            <Link to="/docs" className="text-slate-400 hover:text-white transition-colors">Documentation</Link>
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            <Link to="/map" className="text-slate-400 hover:text-white transition-colors">Emissions Map</Link>
            <Link to="/documents" className="text-slate-400 hover:text-white transition-colors">Policy Documents</Link>
          </div>

          {/* Right: data attribution */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Satellite className="h-3.5 w-3.5 shrink-0" />
            <span>Powered by <span className="text-slate-200 font-medium">Climate TRACE</span></span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} NDC Data Explorer · Built for Uganda's climate delivery
          </p>
          <p className="text-[11px] text-slate-500">
            Emissions data: <a href="https://climatetrace.org" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors underline underline-offset-2">climatetrace.org</a>
            {" · "}
            NDC targets: Uganda Updated NDC, September 2022
          </p>
        </div>
      </div>
    </footer>
  );
}

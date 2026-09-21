import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 shrink-0 border-t border-border bg-card text-muted-foreground">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[11px] sm:px-6 lg:px-8">
        <span className="hidden items-center gap-2 sm:flex"><Leaf className="h-3.5 w-3.5" aria-hidden="true" />© {new Date().getFullYear()} NDC Data Explorer</span>
        <span className="flex flex-wrap items-center gap-x-2">Emissions data by <a href="https://climatetrace.org" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-primary">Climate TRACE</a><span aria-hidden="true">·</span><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline decoration-border underline-offset-4 hover:decoration-primary">CC BY 4.0</a></span>
      </div>
    </footer>
  );
}

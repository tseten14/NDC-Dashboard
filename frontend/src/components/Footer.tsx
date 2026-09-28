export function Footer() {
  return (
    <footer className="relative z-10 shrink-0 border-t border-border bg-card text-muted-foreground">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-6 lg:px-8">
        <span>© {new Date().getFullYear()} NDC Data Explorer</span>
        <span>Emissions data: <a href="https://climatetrace.org" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">Climate TRACE</a></span>
      </div>
    </footer>
  );
}

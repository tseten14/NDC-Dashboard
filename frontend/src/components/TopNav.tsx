import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { isPrimaryNavVisible } from "@/lib/role-capabilities";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowUpRight, Globe2, LayoutGrid, Leaf, Menu } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/navigation";


export function TopNav() {
  const { country, clearCountry } = useCountry();
  const { activeRole, loading } = useCurrentRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuPath = useRef(pathname);
  const visible = PRIMARY_NAV.filter((item) => isPrimaryNavVisible(activeRole, item.url));
  const current = PRIMARY_NAV.find((item) => item.url === "/" ? pathname === "/" : pathname === item.url || pathname.startsWith(`${item.url}/`));
  const shortcuts = visible.filter(
    (item) => item.group === "Explore" || item.url === "/mwp-marketplace" || item.url === "/my-work",
  );

  useEffect(() => { setOpen(false); }, [pathname, activeRole]);
  useEffect(() => {
    document.title = `${current?.title ?? "Workspace"} · NDC Data Explorer${country ? ` — ${country.name}` : ""}`;
  }, [current?.title, country]);

  const changeCountry = () => {
    setOpen(false);
    clearCountry();
    navigate("/select-country");
  };

  return (
    <header data-top-nav className="relative z-40 shrink-0 border-b border-border bg-card">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">
        Skip to main content
      </a>
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <NavLink to="/" end activeClassName="" aria-label="NDC Data Explorer home" className="flex min-w-0 items-center gap-3 rounded-lg">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Leaf className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">NDC <span className="font-normal text-muted-foreground">Data Explorer</span></span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground md:hidden">{current?.title ?? "Climate workspace"}</span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground md:block">Evidence into action</span>
          </span>
        </NavLink>
        <div className="hidden items-center gap-4 md:flex">
          <Button variant="ghost" size="sm" onClick={changeCountry} className="h-10 gap-2 text-muted-foreground" aria-label="Change country">
            <span aria-hidden="true">{country?.flag ?? <Globe2 className="h-4 w-4" />}</span>
            {country?.name ?? "Select country"}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          {!loading && <RoleSwitcher />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={(nextOpen) => { if (nextOpen) menuPath.current = pathname; setOpen(nextOpen); }}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 md:ml-2" aria-label="Open all tools">
                <Menu className="h-4 w-4 md:hidden" aria-hidden="true" /><LayoutGrid className="hidden h-4 w-4 md:block" aria-hidden="true" />
                <span className="hidden md:inline">All tools</span>
              </Button>
            </SheetTrigger>
            <SheetContent onCloseAutoFocus={(event) => {
              if (menuPath.current !== pathname) {
                event.preventDefault();
                document.getElementById("main-content")?.focus({ preventScroll: true });
              }
            }} className="flex w-[min(90vw,420px)] max-w-none flex-col gap-0 overflow-y-auto p-0 sm:max-w-[420px]">
              <div className="border-b p-6 pr-12">
                <SheetTitle>Your workspace</SheetTitle>
                <SheetDescription className="mt-1">Find the right tool for your next decision.</SheetDescription>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 md:hidden">
                <Button variant="outline" size="sm" className="h-10" onClick={changeCountry} aria-label="Change country">{country?.flag} {country?.name ?? "Select country"}</Button>
                {!loading && <RoleSwitcher />}
              </div>
              <nav aria-label="All workspace tools" className="space-y-5 p-4">
                {["Explore", "Plan & deliver", "Manage & learn"].map((group) => {
                  const items = visible.filter((item) => item.group === group);
                  return items.length > 0 && <div key={group}>
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                    {items.map((item) => <NavLink key={item.url} to={item.url} end={item.url === "/"} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" activeClassName="bg-primary/10 text-foreground ring-1 ring-inset ring-primary/20">
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span><span className="block text-sm font-medium">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></span>
                    </NavLink>)}
                  </div>;
                })}
              </nav>
              <p className="mt-auto border-t px-6 py-4 text-xs leading-relaxed text-muted-foreground">The role selector tailors your workspace. Protected actions still require operator authorization.</p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <nav aria-label="Primary navigation" className="hidden items-center gap-1 overflow-x-auto border-t border-border/60 px-6 md:flex lg:px-8">
        {shortcuts.map((item) => <NavLink key={item.url} to={item.url} end={item.url === "/"} className="relative flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" activeClassName="border-primary bg-primary/5 text-foreground">
          <item.icon className="h-4 w-4" aria-hidden="true" />{item.title}
        </NavLink>)}
        {current && !shortcuts.includes(current) && <span className="ml-3 border-l pl-4 text-sm font-medium text-foreground">{current.title}</span>}
      </nav>
    </header>
  );
}

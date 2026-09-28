import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { LOGIN_AUTH_ENABLED } from "@/lib/auth-config";
import { lockOperatorSession } from "@/lib/operator-session";
import { isPrimaryNavVisible } from "@/lib/role-capabilities";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Globe2, LogOut, Menu, UserRound } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/navigation";
import { toast } from "sonner";


export function TopNav() {
  const { country, clearCountry } = useCountry();
  const { activeRole, loading, user, signOut } = useCurrentRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuPath = useRef(pathname);
  const menuNavigation = useRef(false);
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

  const leave = async () => {
    let importLockFailed = false;
    try { await lockOperatorSession(); } catch { importLockFailed = true; }
    try {
      await signOut();
      navigate("/auth", { replace: true });
      if (importLockFailed) toast.error("Signed out, but import access could not be locked on this device.");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  return (
    <header data-top-nav className="relative z-40 shrink-0 border-b border-border bg-card">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-16 max-w-[90rem] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <NavLink to="/" end activeClassName="" aria-label="NDC Data Explorer home" className="flex min-w-0 items-center rounded-sm text-foreground underline-offset-4">
          <span className="text-base font-bold sm:text-lg">NDC Data Explorer</span>
        </NavLink>
        <div className="hidden items-center gap-4 md:flex">
          <Button variant="outline" size="sm" onClick={changeCountry} className="gap-2" aria-label="Change country">
            <span aria-hidden="true">{country?.flag ?? <Globe2 className="h-4 w-4" />}</span>
            {country?.name ?? "Select country"}
          </Button>
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          {!loading && <RoleSwitcher />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {LOGIN_AUTH_ENABLED && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Account menu"><UserRound className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[min(90vw,280px)]">
              <DropdownMenuLabel className="truncate text-xs font-normal">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void leave(); }}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
          <Sheet open={open} onOpenChange={(nextOpen) => { if (nextOpen) menuPath.current = pathname; setOpen(nextOpen); }}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 md:ml-2" aria-label="Open all tools">
                <Menu className="h-4 w-4" aria-hidden="true" />
                <span>All tools</span>
              </Button>
            </SheetTrigger>
            <SheetContent onCloseAutoFocus={(event) => {
              if (menuNavigation.current || menuPath.current !== pathname) {
                event.preventDefault();
                document.getElementById("main-content")?.focus({ preventScroll: true });
                menuNavigation.current = false;
              }
            }} className="flex w-[min(90vw,420px)] max-w-none flex-col gap-0 overflow-y-auto p-0 sm:max-w-[420px]">
              <div className="border-b p-6 pr-12">
                <SheetTitle>All tools</SheetTitle>
                <SheetDescription className="mt-1">Navigate the NDC Data Explorer.</SheetDescription>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 md:hidden">
                <Button variant="outline" size="sm" className="h-10" onClick={changeCountry} aria-label="Change country">{country?.flag} {country?.name ?? "Select country"}</Button>
                {!loading && <RoleSwitcher />}
              </div>
              <nav aria-label="All workspace tools" className="space-y-5 p-4">
                {["Explore", "Plan & deliver", "Manage & learn"].map((group) => {
                  const items = visible.filter((item) => item.group === group);
                  return items.length > 0 && <div key={group}>
                    <p className="mb-2 px-3 text-sm font-bold text-foreground">{group}</p>
                    {items.map((item) => <NavLink key={item.url} to={item.url} end={item.url === "/"} onClick={() => { menuNavigation.current = true; setOpen(false); }} className="block border-l-4 border-transparent px-3 py-2 text-foreground" activeClassName="border-primary bg-muted font-bold">
                      <span className="block text-base">{item.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{item.description}</span>
                    </NavLink>)}
                  </div>;
                })}
              </nav>
              <p className="mt-auto border-t px-6 py-4 text-xs leading-relaxed text-muted-foreground">The role selector tailors your workspace. Protected actions still require operator authorization.</p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <nav aria-label="Primary navigation" className="mx-auto hidden max-w-[90rem] items-center gap-1 overflow-x-auto border-t border-border px-4 md:flex sm:px-6 lg:px-8">
        {shortcuts.map((item) => <NavLink key={item.url} to={item.url} end={item.url === "/"} className="flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-[3px] border-transparent px-3 text-sm font-medium text-foreground" activeClassName="border-primary font-bold text-primary">
          {item.title}
        </NavLink>)}
        {current && !shortcuts.includes(current) && <span className="ml-3 border-l pl-4 text-sm font-medium text-foreground">{current.title}</span>}
      </nav>
      {pathname !== "/" && <nav aria-label="Breadcrumb" className="mx-auto max-w-[90rem] border-t border-border px-4 py-2 text-sm sm:px-6 lg:px-8">
        <NavLink to="/" end activeClassName="" className="text-primary underline underline-offset-2">Home</NavLink>
        <span className="mx-2 text-muted-foreground" aria-hidden="true">/</span>
        <span aria-current="page" className="font-medium text-foreground">{current?.title ?? pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "Page"}</span>
      </nav>}
    </header>
  );
}

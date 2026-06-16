import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useCountry } from "@/context/CountryContext";
import { useCurrentRole } from "@/hooks/use-current-role";
import { isPrimaryNavVisible } from "@/lib/role-capabilities";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Upload, Target, Sparkles, Coins, Workflow, Scale, Map as MapIcon, Home,
  BookOpen, Briefcase, Globe2, Leaf,
} from "lucide-react";

type NavItem = { title: string; url: string; icon: React.ElementType };

const primary: NavItem[] = [
  { title: "Home",               url: "/",               icon: Home },
  { title: "Dashboard",          url: "/dashboard",      icon: Target },
  { title: "Data Ingestion",     url: "/ingest",         icon: Upload },
  { title: "AI 2030 Prediction", url: "/ai-2030",        icon: Sparkles },
  { title: "Policy Impact",      url: "/policy-impact",  icon: Workflow },
  { title: "Climate Finance",    url: "/climate-finance",icon: Coins },
  { title: "Policy Documents",   url: "/documents",      icon: Scale },
  { title: "Emissions Map",      url: "/map",            icon: MapIcon },
  { title: "Settings",           url: "/my-work",        icon: Briefcase },
  { title: "Documentation",      url: "/docs",           icon: BookOpen },
];

export function TopNav() {
  const { country, clearCountry } = useCountry();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activeRole } = useCurrentRole();
  const visiblePrimary = primary.filter((item) => isPrimaryNavVisible(activeRole, item.url));

  // Condense the header once page content (in any nested scroll container) scrolls down.
  // The scroll handler is rAF-batched so we read scrollTop at most once per frame
  // and only flip state when the threshold is actually crossed.
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    let frame = 0;
    let lastTarget: HTMLElement | null = null;
    const measure = () => {
      frame = 0;
      if (!lastTarget) return;
      const y = lastTarget.scrollTop;
      // Hysteresis: condense past 64px, only expand again below 16px. A single
      // threshold made the header flicker/jump when scrolling near it.
      setCondensed((prev) => (prev ? y > 16 : y > 64));
    };
    const onScroll = (e: Event) => {
      const el =
        e.target instanceof Document
          ? (e.target.scrollingElement as HTMLElement | null)
          : e.target instanceof HTMLElement
            ? e.target
            : null;
      if (!el) return;
      lastTarget = el;
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Sliding indicator: follows hover, settles on the active link.
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const navRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const activeUrl =
    visiblePrimary.find((p) => (p.url === "/" ? pathname === "/" : pathname.startsWith(p.url)))?.url ?? null;

  useLayoutEffect(() => {
    const measure = () => {
      const targetUrl = hovered ?? activeUrl;
      const el = targetUrl != null ? linkRefs.current.get(targetUrl) : undefined;
      const nav = navRef.current;
      if (!el || !nav) {
        setIndicator((s) => ({ ...s, visible: false }));
        return;
      }
      const navBox = nav.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      setIndicator({ left: box.left - navBox.left + 8, width: box.width - 16, visible: true });
    };
    measure();
    // The condense transition slides the brand mark + links over 300ms, so the
    // first measurement reads a mid-transition position. Re-measure once it
    // settles; the indicator's own CSS transition keeps the move smooth.
    const t = window.setTimeout(measure, 320);
    return () => window.clearTimeout(t);
  }, [hovered, activeUrl, pathname, visiblePrimary.length, condensed]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/70",
        // backdrop-blur-md (not -xl): a sticky element's backdrop-filter is
        // recomputed every scroll frame, so a smaller blur radius is cheaper.
        "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65",
        "shadow-[0_1px_12px_-6px_hsl(168_45%_28%/0.15)]",
      )}
    >
      {/* Top strip: brand + breadcrumb + country + role. Collapses on scroll. */}
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 px-4 sm:px-6 border-b border-border/40 overflow-hidden",
          "transition-[height,opacity] duration-300 ease-out",
          condensed ? "h-0 opacity-0 border-b-0" : "h-12 opacity-100",
        )}
      >
        <NavLink to="/" end className="flex items-center gap-2.5 shrink-0 group" activeClassName="">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/30 ring-1 ring-emerald-400/40 transition-all duration-300 group-hover:shadow-emerald-500/50 group-hover:scale-105">
            <Leaf className="h-4 w-4 text-white drop-shadow-sm" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-extrabold tracking-tight text-foreground leading-none font-display">NDC</p>
            <p className="text-[10px] font-medium text-muted-foreground tracking-wide leading-none mt-0.5">Data Explorer</p>
          </div>
        </NavLink>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {country && (
            <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5">
              <span className="text-base leading-none">{country.flag}</span>
              {country.name}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => { clearCountry(); navigate("/select-country"); }}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{country ? "Change country" : "Select country"}</span>
          </Button>
        </div>
      </div>

      {/* Nav links strip — links scroll, controls (theme + role) stay pinned
          right so the role switcher is always visible, even when scrolled. */}
      <div className="flex items-stretch">
        <div className="overflow-x-auto scrollbar-none flex-1 min-w-0">
        <nav
          ref={navRef}
          className="relative flex items-center gap-0 px-4 min-w-max"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Sliding underline */}
          <span
            aria-hidden
            className={cn(
              "absolute bottom-0 h-[2.5px] rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500",
              "transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              indicator.visible ? "opacity-100" : "opacity-0",
            )}
            style={{ left: indicator.left, width: indicator.width }}
          />
          {/* Condensed brand mark appears when the top strip is collapsed */}
          <NavLink
            to="/"
            end
            activeClassName=""
            className={cn(
              "flex items-center shrink-0 overflow-hidden transition-[width,margin,opacity] duration-300",
              condensed ? "w-7 mr-2 opacity-100" : "w-0 mr-0 opacity-0",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
              <Leaf className="h-3.5 w-3.5 text-white" />
            </span>
          </NavLink>
          {visiblePrimary.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              ref={(el: HTMLAnchorElement | null) => {
                if (el) linkRefs.current.set(item.url, el);
                else linkRefs.current.delete(item.url);
              }}
              onMouseEnter={() => setHovered(item.url)}
              className={cn(
                "relative px-3.5 text-[13px] font-medium text-muted-foreground transition-all duration-300 hover:text-foreground whitespace-nowrap",
                condensed ? "py-2" : "py-3",
              )}
              activeClassName="text-foreground"
            >
              {item.title}
            </NavLink>
          ))}
        </nav>
        </div>
        <div className="flex items-center gap-2 px-3 shrink-0 border-l border-border/40 bg-background/40">
          <ThemeToggle />
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}

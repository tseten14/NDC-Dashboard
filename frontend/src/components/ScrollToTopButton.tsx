/**
 * Back-to-top button.
 *
 * Appears once the page has been scrolled down, for the long screens.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating "back to top" button. Pages scroll inside nested containers
 * (Radix ScrollArea viewports), so we listen in the capture phase and track
 * whichever container the user last scrolled.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const scrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // rAF-batched: read scrollTop at most once per frame to avoid a forced
    // layout read on every scroll event. setVisible is a no-op when the
    // boolean is unchanged, so React only re-renders at the threshold.
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = scrollerRef.current;
      if (el) setVisible(el.scrollTop > 320);
    };
    const onScroll = (e: Event) => {
      const el =
        e.target instanceof Document
          ? (e.target.scrollingElement as HTMLElement | null)
          : e.target instanceof HTMLElement
            ? e.target
            : null;
      if (!el) return;
      scrollerRef.current = el;
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollerRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    setVisible(false);
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "scroll-top-btn fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
        "hover:scale-110 hover:shadow-xl hover:shadow-primary/35 active:scale-95 transition-transform",
        visible && "scroll-top-visible",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}

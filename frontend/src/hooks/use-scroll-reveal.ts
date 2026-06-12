import { useCallback, useRef } from "react";

/**
 * IntersectionObserver-based scroll reveal. Attach the returned ref to an
 * element with the `reveal` class; `reveal-visible` is added the first time
 * it enters the viewport. No-ops under prefers-reduced-motion (CSS shows
 * `.reveal` content immediately in that case).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; delayMs?: number },
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { threshold = 0.15, delayMs = 0 } = options ?? {};

  return useCallback(
    (el: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!el) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.classList.add("reveal-visible");
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const target = entry.target as HTMLElement;
            if (delayMs > 0) {
              target.style.transitionDelay = `${delayMs}ms`;
            }
            target.classList.add("reveal-visible");
            observerRef.current?.unobserve(target);
          }
        },
        { threshold },
      );
      observerRef.current.observe(el);
    },
    [threshold, delayMs],
  );
}

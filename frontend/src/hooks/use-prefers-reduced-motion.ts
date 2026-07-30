/**
 * Reports whether the visitor has asked for less animation.
 *
 * Some people find movement on screen distracting or nauseating and set a system
 * preference to reduce it. Animations in the app check this and stay still when
 * it is set.
 */
import { useEffect, useState } from "react";

/** Subscribes to `prefers-reduced-motion` (SSR-safe default: false). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

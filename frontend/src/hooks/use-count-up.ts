/**
 * Animates a number counting up to its value.
 *
 * Purely decorative: makes headline figures tick up when they first appear.
 * Respects the visitor's "reduce motion" setting, in which case the final number
 * is shown immediately.
 */
import { useEffect, useRef, useState } from "react";

/**
 * Animate a number toward `target` with an ease-out curve (requestAnimationFrame).
 * First render counts up from 0; later changes animate from the previous value.
 * Respects prefers-reduced-motion (jumps straight to the target).
 */
export function useCountUp(
  target: number,
  durationMs = 900,
  options?: { enabled?: boolean },
): number {
  const enabled = options?.enabled ?? true;
  const [value, setValue] = useState(target);
  const fromRef = useRef(0);
  const firstRef = useRef(true);
  const wasEnabledRef = useRef(enabled);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    if (!wasEnabledRef.current) {
      firstRef.current = true;
    }
    wasEnabledRef.current = true;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = firstRef.current ? 0 : fromRef.current;
    firstRef.current = false;
    fromRef.current = target;

    if (reduced || from === target || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, enabled]);

  return value;
}

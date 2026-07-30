/**
 * A number that counts up when it appears.
 *
 * Presentation only; shows the final value immediately when reduced motion is
 * requested.
 */
import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";

interface CountUpNumberProps {
  value: number;
  /** Formats the animated value for display. Defaults to rounded integer. */
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
  /** Wait until the element is in view before counting (saves work below the fold). */
  startWhenVisible?: boolean;
}

/** Animated number that counts up when enabled and on change. */
export function CountUpNumber({
  value,
  format,
  durationMs = 900,
  className,
  startWhenVisible = false,
}: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(!startWhenVisible);

  useEffect(() => {
    if (!startWhenVisible) return;
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setActive(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startWhenVisible]);

  const animated = useCountUp(value, durationMs, { enabled: active });
  return (
    <span ref={ref} className={className}>
      {format ? format(animated) : String(Math.round(animated))}
    </span>
  );
}

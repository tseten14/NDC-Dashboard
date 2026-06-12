import { useCountUp } from "@/hooks/use-count-up";

interface CountUpNumberProps {
  value: number;
  /** Formats the animated value for display. Defaults to rounded integer. */
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

/** Animated number that counts up to `value` on mount and on change. */
export function CountUpNumber({ value, format, durationMs = 900, className }: CountUpNumberProps) {
  const animated = useCountUp(value, durationMs);
  return <span className={className}>{format ? format(animated) : String(Math.round(animated))}</span>;
}

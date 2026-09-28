/** Displays the final figure immediately. Legacy timing props remain for callers. */
interface CountUpNumberProps {
  value: number;
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
  startWhenVisible?: boolean;
}

export function CountUpNumber({ value, format, className }: CountUpNumberProps) {
  return <span className={className}>{format ? format(value) : String(Math.round(value))}</span>;
}

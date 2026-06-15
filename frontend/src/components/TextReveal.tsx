import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface TextRevealProps {
  text: string;
  /** Delay before the first word starts (seconds). */
  startDelay?: number;
  /** Stagger between words (seconds). */
  stagger?: number;
  className?: string;
}

/** Word-by-word reveal for headlines (fade + rise per word). */
export function TextReveal({ text, startDelay = 0, stagger = 0.03, className }: TextRevealProps) {
  const reducedMotion = usePrefersReducedMotion();
  const words = text.split(" ");

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span
            className={cn("hero-word", className)}
            style={{ animationDelay: `${startDelay + i * stagger}s` }}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

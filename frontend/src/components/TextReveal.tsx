import { Fragment } from "react";

interface TextRevealProps {
  text: string;
  /** Delay before the first word starts (seconds). */
  startDelay?: number;
  /** Stagger between words (seconds). */
  stagger?: number;
  className?: string;
}

/** Word-by-word reveal for hero headlines (fade + rise + unblur per word). */
export function TextReveal({ text, startDelay = 0, stagger = 0.055, className }: TextRevealProps) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="hero-word" style={{ animationDelay: `${startDelay + i * stagger}s` }}>
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

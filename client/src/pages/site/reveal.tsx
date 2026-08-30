import type { CSSProperties, ReactNode } from "react";
import { useReveal } from "./use-reveal";

/**
 * Drop-in wrapper for the house scroll-reveal pattern. Use for content
 * blocks — paragraphs, cards, list items — that don't already own a
 * section-level ref. For a whole <section>, prefer `useReveal` directly so
 * the ref lands on the semantic element itself, matching e.g. pricing-section.tsx.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.1,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}) {
  const { ref, isVisible } = useReveal<HTMLDivElement>(threshold);
  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    <div
      ref={ref}
      style={style}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

/**
 * Mirrors the IntersectionObserver-driven scroll reveal used throughout the
 * landing sections (see pricing-section.tsx, features-section.tsx, etc.):
 * once the element crosses the viewport threshold, `isVisible` flips true
 * and never resets — pair with `transition-all duration-700` and
 * `opacity-0 translate-y-8` -> `opacity-100 translate-y-0` classes.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, isVisible } as const;
}

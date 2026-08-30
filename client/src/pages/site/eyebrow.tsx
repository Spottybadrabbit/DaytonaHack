import type { ReactNode } from "react";

/** The recurring "— rule + mono label" marker used above every section headline. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
      <span className="w-12 h-px bg-foreground/30" />
      {children}
    </span>
  );
}

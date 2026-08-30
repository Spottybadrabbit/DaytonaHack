import type { ReactNode } from "react";
import { Reveal } from "./reveal";

/** Numbered row layout shared by the legal/policy pages (privacy, terms, security). */
export function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Reveal className="py-10 border-t border-foreground/10 grid md:grid-cols-12 gap-6 md:gap-12">
      <div className="md:col-span-3">
        <span className="font-mono text-xs text-muted-foreground">{number}</span>
        <h2 className="text-2xl font-display mt-2">{title}</h2>
      </div>
      <div className="md:col-span-9 space-y-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">
        {children}
      </div>
    </Reveal>
  );
}

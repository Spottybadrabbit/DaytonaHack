import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";
import { FooterSection } from "@/components/landing/footer-section";

/** Shared shell for standalone site pages: nav + page content + the marketing footer. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SiteNav />
      {children}
      <FooterSection />
    </main>
  );
}

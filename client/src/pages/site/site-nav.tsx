import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

/**
 * Minimal top nav for the standalone site pages (about, blog, careers, legal, …).
 * The full ComputeNav is landing-specific — its links point at landing-page
 * anchors (#features, #how-it-works) that don't exist on these routes. This
 * keeps the same logo treatment and typography but swaps the marketing nav
 * for a simple way back home. Sits in normal flow (sticky, not fixed) since
 * these pages have no full-bleed hero video to float above.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-foreground/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl tracking-tight text-foreground">AGENTS</span>
          <span className="font-mono text-[10px] mt-0.5 text-muted-foreground">in the wild</span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Back to home
        </Link>
      </div>
    </header>
  );
}

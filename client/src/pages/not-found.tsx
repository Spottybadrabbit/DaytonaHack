import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
        <span className="w-12 h-px bg-foreground/30" />
        404
        <span className="w-12 h-px bg-foreground/30" />
      </span>
      <h1 className="text-6xl lg:text-8xl font-display mb-6">
        Lost in <span className="text-stroke">the wilds.</span>
      </h1>
      <p className="text-lg text-muted-foreground max-w-md mb-10">
        This trail leads nowhere — the page has wandered off or never existed.
        Follow the white rabbit back to somewhere familiar.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors group"
      >
        Back to safety
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

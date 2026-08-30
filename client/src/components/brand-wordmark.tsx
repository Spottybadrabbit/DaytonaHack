import { Link } from "wouter";

/**
 * The canonical brand wordmark — serif AGENTS + mono "in the wild" — as used
 * on the landing ComputeNav and the site pages. Use this everywhere a logo is
 * needed; never the old Bot icon + bold sans treatment.
 */
export function BrandWordmark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Link href="/" className="flex items-center gap-2 group cursor-pointer">
      <span
        className={`font-display tracking-tight text-foreground ${
          size === "sm" ? "text-xl" : "text-2xl"
        }`}
      >
        AGENTS
      </span>
      <span
        className={`font-mono tracking-tight text-muted-foreground ${
          size === "sm" ? "text-[10px] mt-0.5" : "text-xs mt-1"
        }`}
      >
        in the wild
      </span>
    </Link>
  );
}

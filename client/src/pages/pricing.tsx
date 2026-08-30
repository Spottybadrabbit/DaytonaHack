import { useState } from "react";
import { PricingTable } from "@clerk/react";
import { Check } from "lucide-react";

/**
 * Checkout page backed by Clerk Billing. <PricingTable /> renders the live
 * plans from the Clerk dashboard (Free / Standard $60/mo, $50/mo annual) and
 * handles the full checkout, upgrade, and cancellation flow — prices shown
 * here always match what the customer is actually charged.
 */
export default function Pricing() {
  const [audience, setAudience] = useState<"personal" | "teams">("personal");

  return (
    <div className="min-h-screen">
      <section className="relative py-20 lg:py-28">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          {/* Header */}
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
            <span className="w-12 h-px bg-foreground/30" />
            PRICING
          </span>
          <h1 className="text-4xl lg:text-6xl font-display mb-6">
            Start free. Scale when your agents do.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            Explorer is free forever — 3 concurrent agents and 1,000 tasks a
            month. Standard unlocks the full workforce for{" "}
            <span className="text-foreground">$60/month</span> ($50/month
            billed annually). Cancel anytime; billing is handled securely by
            Clerk and prorated automatically.
          </p>

          {/* Personal / Teams toggle */}
          <div className="inline-flex border border-foreground/20 mb-12">
            <button
              onClick={() => setAudience("personal")}
              className={`px-6 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                audience === "personal"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              For individuals
            </button>
            <button
              onClick={() => setAudience("teams")}
              className={`px-6 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
                audience === "teams"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              For teams
            </button>
          </div>

          {/* Live Clerk pricing + checkout */}
          {audience === "personal" ? (
            <PricingTable />
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
                Team seats are billed per member at $60/seat/month ($50 billed
                annually) with shared workspaces, pooled quotas, and
                centralized billing. Sign in and create (or switch to) an
                organization to subscribe for your team.
              </p>
              <PricingTable for="organization" />
            </div>
          )}

          {/* Reassurance strip */}
          <div className="mt-16 pt-10 border-t border-foreground/10 flex flex-wrap gap-6 text-sm text-muted-foreground">
            {[
              "Cancel anytime — no lock-in",
              "Prorated upgrades & downgrades",
              "Every tier is rate-limited, so bills never run away",
              "Need more? sales@agentsinthewild.com",
            ].map((note) => (
              <span key={note} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#eca8d6]" />
                {note}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

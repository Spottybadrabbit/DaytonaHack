import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, Zap } from "lucide-react";
import { TIERS, TIER_ORDER, type Tier } from "@shared/tiers";

// Cards are derived from the single shared tier config (@shared/tiers.ts) so
// prices, limits, and features never drift from what the server API enforces.
const plans = TIER_ORDER.map((key) => TIERS[key]);

/** Where a tier's CTA points, respecting the annual toggle for checkout. */
function ctaHref(tier: Tier, isAnnual: boolean): string {
  switch (tier.cta.kind) {
    case "signup":
      return "/sign-up";
    case "checkout":
      return tier.planId
        ? `/checkout?plan=${tier.planId}&period=${isAnnual ? "annual" : "month"}`
        : "/contact";
    case "contact":
    default:
      return "/contact";
  }
}

export function PricingSection() {
  const [isAnnual] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="pricing" ref={sectionRef} className="relative py-32 lg:py-40">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
              <span className="w-12 h-px bg-foreground/30" />
              Pricing
            </span>
            <h2
              className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Pay for
              <br />
              <span className="text-stroke">results.</span>
            </h2>
          </div>

          <div className="lg:col-span-5 relative p-0 h-96 lg:h-auto">
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-1000 delay-100 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <img src="/images/whale.png" alt="Organic whale" className="w-full h-full object-contain object-center" />
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, index) => (
              <div
                key={plan.key}
                className={`relative bg-background border -mt-px sm:-mt-px lg:mt-0 lg:-ml-px first:ml-0 transition-all duration-700 ${
                  plan.highlight ? "border-foreground lg:z-10" : "border-foreground/10"
                } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-6 right-6 flex justify-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-foreground text-background text-[10px] font-mono uppercase tracking-widest">
                      <Zap className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6 lg:p-7 flex flex-col h-full">
                  <div className="mb-6 pb-6 border-b border-foreground/10">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-2xl font-display mt-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2 min-h-[2.5rem]">{plan.blurb}</p>
                  </div>

                  <div className="mb-6">
                    {plan.price.monthly !== null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl lg:text-5xl font-display">
                          ${isAnnual ? plan.price.annual : plan.price.monthly}
                        </span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                    ) : (
                      <span className="text-3xl font-display">Custom</span>
                    )}
                    {plan.price.monthly !== null && plan.price.monthly > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {isAnnual ? "billed annually" : "billed monthly"}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#eca8d6] mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={ctaHref(plan, isAnnual)}>
                    <button
                      className={`w-full py-3.5 flex items-center justify-center gap-2 text-sm font-medium transition-all group ${
                        plan.highlight
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                      }`}
                    >
                      {plan.cta.label}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div
          className={`mt-20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pt-12 border-t border-foreground/10 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#eca8d6]" />
              Encrypted execution
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#eca8d6]" />
              Full audit logs
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#eca8d6]" />
              Multi-model routing
            </span>
          </div>
          <Link href="/marketplace" className="text-sm underline underline-offset-4 hover:text-foreground transition-colors">
            Compare all features
          </Link>
        </div>
      </div>
    </section>
  );
}

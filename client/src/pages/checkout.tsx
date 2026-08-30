import * as React from "react";
import { useLocation } from "wouter";
import { Show, RedirectToSignIn } from "@clerk/react";
import {
  CheckoutProvider,
  useCheckout,
  PaymentElementProvider,
  PaymentElement,
  usePaymentElement,
} from "@clerk/react/experimental";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { PLAN_IDS } from "@/lib/plans";

/**
 * Branded custom checkout (Clerk Billing → Stripe), the COMPUTE-styled
 * alternative to Clerk's default <PricingTable /> drawer. Follows Clerk's
 * "custom checkout with a new payment method" flow, adapted from
 * @clerk/nextjs/experimental to @clerk/react/experimental + wouter.
 *
 * Reads the plan from the query string so CTAs can deep-link:
 *   /checkout?plan=<cplan_…>&period=<month|annual>&for=<user|organization>
 * Defaults to the Standard user plan, monthly.
 */
export default function Checkout() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get("plan") || PLAN_IDS.STANDARD_USER;
  const planPeriod = (params.get("period") === "annual" ? "annual" : "month") as
    | "annual"
    | "month";
  const forTarget = (params.get("for") === "organization"
    ? "organization"
    : "user") as "organization" | "user";

  return (
    <CheckoutProvider for={forTarget} planId={planId} planPeriod={planPeriod}>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
            <span className="w-12 h-px bg-foreground/30" />
            CHECKOUT
          </span>
          <h1 className="text-4xl lg:text-6xl font-display mb-12">
            Seal the <span className="text-stroke">pact.</span>
          </h1>
          <CustomCheckout />
        </div>
      </Show>
    </CheckoutProvider>
  );
}

function CustomCheckout() {
  const { checkout } = useCheckout();

  if (checkout.status === "needs_initialization") {
    return <CheckoutInitialization />;
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
      <CheckoutSummary />
      <div className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
        <PaymentElementProvider checkout={checkout}>
          <PaymentSection />
        </PaymentElementProvider>
      </div>
    </div>
  );
}

function CheckoutInitialization() {
  const { checkout, fetchStatus } = useCheckout();
  if (checkout.status !== "needs_initialization") return null;

  return (
    <div className="border border-foreground/10 bg-foreground/[0.02] p-8 lg:p-10 max-w-lg">
      <p className="text-muted-foreground mb-6">
        Ready when you are. Begin the pact to review your plan and enter payment.
      </p>
      <button
        onClick={() => checkout.start()}
        disabled={fetchStatus === "fetching"}
        className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3.5 text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-60"
      >
        {fetchStatus === "fetching" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            Begin checkout
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

function PaymentSection() {
  const { checkout, errors, fetchStatus } = useCheckout();
  const { isFormReady, submit } = usePaymentElement();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormReady || isProcessing || fetchStatus === "fetching") return;
    setIsProcessing(true);

    try {
      // Collect the payment method from the Stripe-backed element.
      const { data, error } = await submit();
      if (error) {
        // Usually a benign client-side validation error — Clerk surfaces it.
        console.error(JSON.stringify(error, null, 2));
        return;
      }
      // Confirm the checkout with the collected payment method.
      const { error: confirmError } = await checkout.confirm(data);
      if (confirmError) {
        console.error(JSON.stringify(confirmError, null, 2));
        return;
      }
      // Finalize and route into the app (wouter, not next/navigation).
      await checkout.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/dashboard");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            setLocation(url);
          }
        },
      });
    } catch (err) {
      console.error("Payment failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isSubmitting = isProcessing || fetchStatus === "fetching";

  return (
    <form onSubmit={handleSubmit}>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        Payment details
      </div>
      <PaymentElement
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading secure payment form…
          </div>
        }
      />

      {errors?.global && (
        <ul className="mt-4 border border-red-400/30 bg-red-400/5 p-3 space-y-1">
          {errors.global.map((error, index) => (
            <li key={index} className="text-sm text-red-400">
              {error.longMessage || error.message}
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={!isFormReady || isSubmitting}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-foreground text-background py-4 text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          "Complete purchase"
        )}
      </button>
      <p className="mt-4 text-[11px] font-mono text-muted-foreground/60 text-center">
        Secured by Stripe · cancel anytime · billed in USD
      </p>
    </form>
  );
}

function CheckoutSummary() {
  const { checkout } = useCheckout();
  if (!checkout.plan) return null;

  const due = checkout.totals?.totalDueNow;

  return (
    <div className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
        Order summary
      </div>
      <div className="flex items-baseline justify-between pb-6 border-b border-foreground/10">
        <span className="font-display text-2xl">{checkout.plan.name}</span>
        {due && (
          <span className="font-display text-2xl">
            {due.currencySymbol}
            {due.amountFormatted}
          </span>
        )}
      </div>
      <ul className="mt-6 space-y-3">
        {[
          "25 concurrent agents",
          "50,000 tasks / month",
          "Private integrations & audit trails",
          "Team workspaces & custom roles",
          "Priority support",
        ].map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-[#eca8d6] mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

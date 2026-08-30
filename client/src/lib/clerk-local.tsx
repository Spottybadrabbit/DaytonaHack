import type { ReactNode } from "react";

const localUser = {
  id: "local-demo-user",
  username: "local-demo",
  primaryEmailAddress: {
    emailAddress: "local-demo@agentsinthewild.test",
  },
};

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: localUser.id,
    getToken: async () => null,
    has: () => false,
  };
}

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: localUser,
  };
}

export function Show({
  when,
  children,
}: {
  when: "signed-in" | "signed-out";
  children: ReactNode;
}) {
  return when === "signed-in" ? <>{children}</> : null;
}

export function RedirectToSignIn() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Local demo mode
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Clerk is not configured, so this build uses a local demo session.
        </p>
      </div>
    </div>
  );
}

export function SignIn() {
  return <RedirectToSignIn />;
}

export function SignUp() {
  return <RedirectToSignIn />;
}

export function PricingTable() {
  return (
    <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
      {[
        ["Explorer", "Free", "3 concurrent agents", "1,000 tasks / month"],
        ["Builder", "$60/mo", "25 concurrent agents", "50,000 tasks / month"],
      ].map(([name, price, agents, tasks]) => (
        <div key={name} className="border border-foreground/10 bg-foreground/[0.02] p-6">
          <h2 className="font-display text-2xl">{name}</h2>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{price}</p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>{agents}</li>
            <li>{tasks}</li>
          </ul>
          <p className="mt-6 text-xs font-mono text-muted-foreground/70">
            Local demo mode. Add Clerk keys to enable live billing.
          </p>
        </div>
      ))}
    </div>
  );
}

export function UserButton() {
  return (
    <div
      aria-label="Local demo user"
      className="h-8 w-8 rounded-full bg-foreground text-background grid place-items-center text-xs font-mono"
    >
      LD
    </div>
  );
}

export function useSubscription() {
  return {
    data: null,
    isLoaded: true,
  };
}

const checkout = {
  status: "ready",
  plan: {
    name: "Builder",
  },
  totals: {
    totalDueNow: {
      currencySymbol: "$",
      amountFormatted: "60.00",
    },
  },
  start: async () => undefined,
  confirm: async () => ({ error: null }),
  finalize: async ({ navigate }: { navigate?: (args: { decorateUrl: (url: string) => string }) => void }) => {
    navigate?.({ decorateUrl: (url: string) => url });
  },
};

export function CheckoutProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useCheckout() {
  return {
    checkout,
    errors: null,
    fetchStatus: "idle",
  };
}

export function PaymentElementProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PaymentElement({ fallback }: { fallback?: ReactNode }) {
  return (
    <div className="border border-foreground/10 bg-background/40 p-4 text-sm text-muted-foreground">
      {fallback ? null : null}
      Payment collection is disabled in local demo mode.
    </div>
  );
}

export function usePaymentElement() {
  return {
    isFormReady: false,
    submit: async () => ({
      data: null,
      error: { message: "Payment is disabled in local demo mode." },
    }),
  };
}

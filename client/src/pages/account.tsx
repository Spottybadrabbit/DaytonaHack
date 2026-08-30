import { Link } from "wouter";
import { Show, RedirectToSignIn, useAuth, useUser } from "@clerk/react";
import { useSubscription } from "@clerk/react/experimental";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentTier } from "@/lib/plans";
import { TIERS, isUnlimited } from "@shared/tiers";
import { Check, ArrowRight, ArrowUpRight, Zap } from "lucide-react";

export default function Account() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <AccountBody />
      </Show>
    </>
  );
}

function AccountBody() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { tier } = useCurrentTier();
  const { data: subscription } = useSubscription();
  const snapshotQuery = useQuery<{
    authed: boolean;
    agentsOwned: number;
    creditsUsed: number;
    enforcedTier: keyof typeof TIERS;
  }>({
    queryKey: ["account-snapshot"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/account", undefined, await getToken());
      return response.json();
    },
  });
  const snapshot = snapshotQuery.data;

  // Trial / status from Clerk's real subscription (defensively read).
  const paidItem = subscription?.subscriptionItems?.find(
    (i) => i.plan?.slug !== TIERS.explorer.slugUser && i.plan?.slug !== TIERS.explorer.slugOrg,
  );
  const isTrial = !!paidItem?.isFreeTrial;
  const status = isTrial ? "Free trial" : tier.key === "explorer" ? "Free plan" : "Active";

  // Bridge health: Clerk says signed-in; does the Supabase API agree?
  const backendSeesYou = snapshot?.authed === true;
  const snapshotLoading = snapshotQuery.isLoading;
  const enforcedKey = snapshot?.authed ? snapshot.enforcedTier : undefined;
  const driftsFromEnforced = !!enforcedKey && enforcedKey !== tier.key;

  const agentsOwned = snapshot?.authed ? snapshot.agentsOwned : 0;
  const creditsUsed = snapshot?.authed ? snapshot.creditsUsed : 0;

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
        <span className="w-12 h-px bg-foreground/30" />
        ACCOUNT
      </span>
      <h1 className="text-4xl lg:text-6xl font-display mb-3">
        Your standing in <span className="text-stroke">the wilds.</span>
      </h1>
      <p className="text-muted-foreground mb-12">
        {user?.primaryEmailAddress?.emailAddress ||
          user?.username ||
          "Signed in"}
      </p>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        {/* Plan card */}
        <div className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Current plan
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono ${
                tier.key === "explorer" ? "text-muted-foreground" : "text-[#eca8d6]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  tier.key === "explorer" ? "bg-muted-foreground" : "bg-[#eca8d6] animate-pulse"
                }`}
              />
              {status}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-4xl">{tier.name}</h2>
            {tier.price.monthly !== null && tier.price.monthly > 0 && (
              <span className="font-mono text-sm text-muted-foreground">
                ${tier.price.monthly}/mo
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 mb-6">{tier.blurb}</p>

          <ul className="space-y-2.5 mb-8">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-[#eca8d6] mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {tier.key === "explorer" ? (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Upgrade your pack
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-foreground/20 px-5 py-3 text-sm font-medium hover:border-foreground hover:bg-foreground/5 transition-colors"
            >
              Manage plan
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Usage + bridge health */}
        <div className="space-y-6">
          <div className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              This month's usage
            </span>
            <div className="mt-6 space-y-6">
              <UsageMeter
                label="Agents in pack"
                used={agentsOwned}
                cap={tier.limits.concurrentAgents}
              />
              <UsageMeter
                label="Task credits"
                used={creditsUsed}
                cap={tier.limits.creditsPerMonth}
              />
            </div>
          </div>

          {/* Backend/bridge status — the honest signal */}
          <div className="border border-foreground/10 bg-foreground/[0.02] p-6">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Connection
            </span>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Backend session</span>
              {snapshotLoading ? (
                <span className="font-mono text-xs text-muted-foreground">checking…</span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-xs ${
                    backendSeesYou ? "text-[#eca8d6]" : "text-red-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      backendSeesYou ? "bg-[#eca8d6]" : "bg-red-400"
                    }`}
                  />
                  {backendSeesYou ? "connected" : "not verified"}
                </span>
              )}
            </div>
            {!snapshotLoading && !backendSeesYou && (
              <p className="mt-3 text-xs text-muted-foreground/70 leading-relaxed">
                You're signed in with Clerk, but the Supabase API hasn't
                validated your session. Agent actions won't work until the
                backend connection is restored.
              </p>
            )}
            {driftsFromEnforced && (
              <p className="mt-3 text-xs text-muted-foreground/70 leading-relaxed">
                Your subscription ({tier.name}) hasn't propagated to enforcement
                yet — the backend is applying {TIERS[enforcedKey!].name} limits.
                Refresh your Clerk subscription session to sync plans.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageMeter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const unlimited = isUnlimited(cap);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(cap, 1)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-sm">
          {used.toLocaleString()}
          <span className="text-muted-foreground">
            {" / "}
            {unlimited ? "∞" : cap.toLocaleString()}
          </span>
        </span>
      </div>
      <div className="h-1.5 bg-foreground/10 overflow-hidden">
        <div
          className="h-full bg-[#eca8d6] transition-all duration-700"
          style={{ width: unlimited ? "8%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

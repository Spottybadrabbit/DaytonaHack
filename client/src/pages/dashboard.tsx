import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import AgentCard from "@/components/agent-card";
import type { WildAgent } from "@/lib/agents";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, ArrowUpRight } from "lucide-react";
import { Eyebrow } from "@/pages/site/eyebrow";
import { Reveal } from "@/pages/site/reveal";
import { useCurrentTier } from "@/lib/plans";
import { isUnlimited } from "@shared/tiers";

/** Compact plan + credits strip — answers "what am I / how much is left" inline. */
interface AccountSnapshot {
  authed: boolean;
  agentsOwned: number;
  creditsUsed: number;
  enforcedTier: "explorer" | "builder" | "ranger" | "scale";
}

function PlanStrip({ snapshot }: { snapshot?: AccountSnapshot }) {
  const { tier } = useCurrentTier();
  const owned = snapshot?.authed ? snapshot.agentsOwned : 0;
  const credits = snapshot?.authed ? snapshot.creditsUsed : 0;
  const fmt = (n: number, cap: number) =>
    `${n.toLocaleString()} / ${isUnlimited(cap) ? "∞" : cap.toLocaleString()}`;

  return (
    <Link
      href="/account"
      className="group flex flex-wrap items-center gap-x-8 gap-y-3 border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/30 transition-colors px-6 py-4 mb-12"
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            tier.key === "explorer" ? "bg-muted-foreground" : "bg-[#eca8d6] animate-pulse"
          }`}
        />
        <span className="font-mono text-xs uppercase tracking-widest">{tier.name} plan</span>
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        Agents <span className="text-foreground">{fmt(owned, tier.limits.concurrentAgents)}</span>
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        Credits <span className="text-foreground">{fmt(credits, tier.limits.creditsPerMonth)}</span>
      </span>
      <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        {tier.key === "explorer" ? "Upgrade" : "Manage"}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const enabled = Boolean(isLoaded && isSignedIn);
  const agentsQuery = useQuery<WildAgent[]>({
    queryKey: ["agents-mine"],
    enabled,
    refetchInterval: 10_000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agents?mine=1", undefined, await getToken());
      return response.json();
    },
  });
  const accountQuery = useQuery<AccountSnapshot>({
    queryKey: ["account-snapshot"],
    enabled,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/account", undefined, await getToken());
      return response.json();
    },
  });
  const agents = agentsQuery.data;
  const isLoading = !enabled || agentsQuery.isLoading;
  const error = agentsQuery.error as Error | null;

  const activeAgents = agents?.filter(a => a.status === 'running' || a.status === 'building' || a.status.startsWith('task:')) || [];
  const avgPerformance = agents?.length
    ? (agents.reduce((sum, a) => sum + Number(a.performance), 0) / agents.length).toFixed(1)
    : 0;

  useEffect(() => {
    const building = agents?.filter((agent) => agent.platform === "daytona" && agent.status === "building") ?? [];
    if (!building.length) return;
    let cancelled = false;
    void (async () => {
      const token = await getToken();
      if (!token) return;
      const statuses = await Promise.allSettled(
        building.map(async (agent) => {
          const response = await apiRequest(
            "GET",
            `/api/builder/status?agentId=${encodeURIComponent(agent._id)}`,
            undefined,
            token,
          );
          return response.json() as Promise<{ status: string }>;
        }),
      );
      if (!cancelled && statuses.some((result) => result.status === "fulfilled" && result.value.status !== "building")) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["agents-mine"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
        ]);
      }
    })();
    return () => { cancelled = true; };
  }, [agents, getToken]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#eca8d6] animate-pulse" />
          Loading your workforce
        </span>
        <div className="w-full max-w-xs h-px bg-foreground/10 overflow-hidden">
          <div className="h-full w-1/3 bg-[#eca8d6] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32">
        <div className="border border-foreground/10 p-10 text-center max-w-lg mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-3">
            Connection error
          </span>
          <p className="text-lg font-display mb-2">Couldn't load your agents.</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-20">
      {/* Header */}
      <Reveal className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
        <div>
          <Eyebrow>Operations</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-display tracking-tight leading-[0.95]">
            Your wild <span className="text-stroke">workforce.</span>
          </h1>
        </div>
        <Link
          href="/create-agent"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create agent
        </Link>
      </Reveal>

      <PlanStrip snapshot={accountQuery.data} />

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-16">
        <div className="lg:col-span-9 space-y-16">
          {/* Stat tiles */}
          <Reveal className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-foreground/10 p-6">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-3">
                Total agents
              </span>
              <span className="font-display text-5xl">{agents?.length ?? 0}</span>
            </div>

            <div className="border border-foreground/10 p-6">
              <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                <span className="relative flex h-1.5 w-1.5">
                  {activeAgents.length > 0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#eca8d6] opacity-60" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#eca8d6]" />
                </span>
                Active
              </span>
              <span className="font-display text-5xl">{activeAgents.length}</span>
            </div>

            <div className="border border-foreground/10 p-6">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-3">
                Avg performance
              </span>
              <span className="font-display text-5xl">{avgPerformance}%</span>
            </div>
          </Reveal>

          {/* Agent list */}
          <div>
            <Reveal className="mb-8">
              <Eyebrow>My agents</Eyebrow>
              <h2 className="text-3xl font-display tracking-tight">Deployed roster</h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents?.map((agent, index) => (
                <Reveal key={agent._id} delay={Math.min(index, 6) * 60}>
                  <AgentCard agent={agent} index={index} showControls />
                </Reveal>
              ))}
              {agents?.length === 0 && (
                <div className="md:col-span-2 border border-foreground/10 py-20 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-3">
                    Empty roster
                  </span>
                  <h3 className="text-2xl font-display mb-3">No agents yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Purchase agents from the marketplace or create your own to get started!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-3">
          <Reveal delay={150}>
            <Eyebrow>Quick actions</Eyebrow>
            <div className="border-t border-foreground/10">
              <Link
                href="/create-agent"
                className="flex items-center justify-between py-4 border-b border-foreground/10 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                Create new agent
                <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex items-center justify-between py-4 border-b border-foreground/10 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                View performance reports
                <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

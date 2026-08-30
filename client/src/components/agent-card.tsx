import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import type { WildAgent } from "@/lib/agents";
import AgentStatus from "./agent-status";
import { ArrowRight, ArrowUpRight, Play, Square, Power } from "lucide-react";
import { getPokemonSpriteUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AgentCardProps {
  agent: WildAgent;
  showControls?: boolean;
  /** Position in the list — renders as a mono "01" style index marker. Purely decorative. */
  index?: number;
}

export default function AgentCard({ agent, showControls, index }: AgentCardProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await apiRequest("PATCH", `/api/agents/${agent._id}`, {
        status: agent.isActive ? "idle" : "running",
        isActive: !agent.isActive,
      }, await getToken());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents-mine"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", agent._id] }),
      ]);
      toast({
        title: agent.isActive ? "Agent deactivated" : "Agent activated",
        description: `${agent.name} is now ${agent.isActive ? "idle" : "running"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to toggle agent status",
        variant: "destructive",
      });
    }
  };

  const handleRunTask = async () => {
    try {
      console.log(`[Agent Action] Running task for agent ${agent._id}`);
      const response = await apiRequest(
        "POST",
        `/api/agents/${agent._id}/instagram-task/run`,
        undefined,
        await getToken(),
      );
      console.log('[Agent Action] Task started:', response);
    } catch (error) {
      console.error("[Agent Action] Error running task:", error);
      toast({
        title: "Error",
        description: "Failed to run task",
        variant: "destructive",
      });
    }
  };

  const handleAbortTask = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      console.log(`[Agent Action] Aborting task for agent ${agent._id}`);
      const response = await apiRequest(
        "POST",
        `/api/agents/${agent._id}/instagram-task/abort`,
        undefined,
        await getToken(),
      );
      console.log('[Agent Action] Task aborted:', response);

      toast({
        title: "Success",
        description: "Agent task aborted successfully",
      });
    } catch (error: any) {
      console.error("[Agent Action] Error aborting task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to abort task",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="group relative h-full flex flex-col border border-foreground/10 hover:border-foreground/30 transition-colors duration-300 p-6 lg:p-8">
      {/* Header: creature sprite (focal), name, type, index marker */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 lg:w-[4.5rem] lg:h-[4.5rem] shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04] group-hover:border-foreground/25 transition-colors duration-300">
            <img
              src={getPokemonSpriteUrl(agent.spriteUrl)}
              alt={`${agent.name} creature`}
              className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight truncate">{agent.name}</h3>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
              {agent.type}
            </p>
          </div>
        </div>
        {typeof index === "number" && (
          <span className="font-mono text-xs text-muted-foreground/50 shrink-0 pt-1">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6 flex-1">
        {agent.description}
      </p>

      {/* Metadata row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-5 border-t border-foreground/10 mb-6">
        <div>
          <span className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            Performance
          </span>
          <span className="font-display text-2xl">{agent.performance}%</span>
        </div>
        <div>
          <span className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            Price
          </span>
          <span className="font-display text-2xl">${agent.price}</span>
        </div>
        <div className="col-span-2">
          <span className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
            Status
          </span>
          <AgentStatus status={agent.status} />
        </div>
      </div>

      {/* Controls */}
      {showControls && agent.platform !== "daytona" && (
        <div className="flex flex-col gap-2 mb-3">
          <button
            type="button"
            onClick={handleToggleActive}
            className={`w-full py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              agent.isActive
                ? "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            <Power className="h-4 w-4" />
            {agent.isActive ? "Deactivate" : "Activate"} agent
          </button>

          {agent.status.startsWith("task:") && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAbortTask}
                className="py-2.5 text-sm font-medium flex items-center justify-center gap-2 border border-red-400/30 text-red-400 hover:border-red-400/60 hover:bg-red-400/5 transition-colors"
              >
                <Square className="h-4 w-4" />
                Abort
              </button>
              <button
                type="button"
                onClick={handleRunTask}
                className="py-2.5 text-sm font-medium flex items-center justify-center gap-2 border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 transition-colors"
              >
                <Play className="h-4 w-4" />
                Run
              </button>
            </div>
          )}
        </div>
      )}

      {agent.apiEndpoint && (
        <a
          href={agent.apiEndpoint}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 inline-flex w-full items-center justify-center gap-2 border border-[#eca8d6]/40 bg-[#eca8d6]/5 py-2.5 text-sm font-medium transition-colors hover:border-[#eca8d6]"
        >
          Open live app
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}

      {/* View / manage link */}
      <Link
        href={`/agents/${agent._id}`}
        className={`group/link inline-flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium transition-all mt-auto ${
          showControls
            ? "border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5"
            : "bg-foreground text-background hover:bg-foreground/90"
        }`}
      >
        {showControls ? (
          "Manage agent"
        ) : (
          <>
            View details
            <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </>
        )}
      </Link>
    </div>
  );
}

import { cn } from "@/lib/utils";

// `status` is a free-form string (agents report it from the DB — including
// dynamic values like "task:abc123"), so the dot/label mapping below is
// deliberately open-ended: anything unrecognised just falls back to a
// neutral, non-pulsing dot instead of erroring.
interface AgentStatusProps {
  status: string;
  className?: string;
}

const DOT_CLASS: Record<string, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-[#eca8d6]",
  building: "bg-[#eca8d6]",
  published: "bg-emerald-400",
  error: "bg-red-400",
  suspended: "bg-amber-400",
};

function isActive(status: string) {
  return status === "running" || status === "building" || status.startsWith("task:");
}

function dotClass(status: string) {
  if (isActive(status)) return "bg-[#eca8d6]";
  return DOT_CLASS[status] ?? "bg-muted-foreground/40";
}

export default function AgentStatus({ status, className }: AgentStatusProps) {
  const pulsing = isActive(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulsing && (
          <span
            className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dotClass(status))}
            aria-hidden="true"
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClass(status))} aria-hidden="true" />
      </span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

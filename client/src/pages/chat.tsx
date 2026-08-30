import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { ArrowUp, Loader2 } from "lucide-react";
import RunCard from "@/components/chat/run-card";
import { fetchRuns, sendChat, type ChatTurn, type RunView } from "@/lib/chat";
import { Eyebrow } from "@/pages/site/eyebrow";

const OPENERS = [
  "Find all VCs in the UK that invest in Physical AI.",
  "Write me a market research report on the UK robotics sector.",
  "Get a verified work email for the Head of Growth at Daytona.",
  "Enrich Stripe with founding year, headcount, and total funding.",
];

interface Bubble extends ChatTurn {
  id: string;
  runIds: string[];
}

export default function Chat() {
  const { getToken, isSignedIn } = useAuth();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [runs, setRuns] = useState<Record<string, RunView>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Surface runs started in earlier sessions so the roster is not lost on reload.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchRuns(await getToken());
        if (cancelled) return;
        const active = res.runs.filter((run) => run.status === "queued" || run.status === "running");
        if (active.length === 0) return;
        setRuns((prev) => ({ ...prev, ...Object.fromEntries(active.map((r) => [r.id, r])) }));
        setBubbles((prev) =>
          prev.length > 0
            ? prev
            : [
                {
                  id: "resumed",
                  role: "assistant",
                  content: `You have ${active.length} agent${active.length === 1 ? "" : "s"} still out hunting from an earlier session.`,
                  runIds: active.map((run) => run.id),
                },
              ],
        );
      } catch {
        // A failed resume is not worth surfacing; the chat still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [bubbles.length, sending]);

  async function submit(text: string) {
    const content = text.trim();
    if (!content || sending) return;

    const history: ChatTurn[] = [
      ...bubbles.map((bubble) => ({ role: bubble.role, content: bubble.content })),
      { role: "user" as const, content },
    ];

    setBubbles((prev) => [
      ...prev,
      { id: `u-${prev.length}-${content.slice(0, 8)}`, role: "user", content, runIds: [] },
    ]);
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const reply = await sendChat(history, await getToken());
      setRuns((prev) => ({ ...prev, ...Object.fromEntries(reply.runs.map((run) => [run.id, run])) }));
      setBubbles((prev) => [
        ...prev,
        {
          id: `a-${prev.length}`,
          role: "assistant",
          content: reply.reply,
          runIds: reply.runs.map((run) => run.id),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+:\s*/, "") : "The field lab did not answer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
      <Eyebrow>Field lab · live</Eyebrow>
      <h1 className="mt-6 font-display text-4xl sm:text-6xl leading-[1.05]">
        Talk to the <span className="text-stroke">wild</span>.
      </h1>
      <p className="mt-5 max-w-xl text-muted-foreground leading-relaxed">
        Describe the work. The field lab picks the right specialist — deep research, a FindAll roster,
        an enrichment, or a GTM contact hunt — releases it, and reports back as each one returns.
      </p>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[28rem] flex-col border border-foreground/10 bg-foreground/[0.02]">
          <div ref={scroller} className="flex-1 space-y-6 overflow-y-auto px-6 py-6 max-h-[34rem]">
            {bubbles.length === 0 ? (
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Try one of these
                </p>
                {OPENERS.map((opener) => (
                  <button
                    key={opener}
                    type="button"
                    onClick={() => void submit(opener)}
                    className="block w-full border border-foreground/10 px-4 py-3 text-left text-sm transition-colors hover:border-foreground/30 hover:bg-foreground/5"
                  >
                    {opener}
                  </button>
                ))}
              </div>
            ) : (
              bubbles.map((bubble) => (
                <div key={bubble.id} className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {bubble.role === "user" ? "You" : "Field lab"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{bubble.content}</p>
                  {bubble.runIds.length > 0 ? (
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#eca8d6]">
                      {bubble.runIds.length} agent{bubble.runIds.length === 1 ? "" : "s"} released →
                    </p>
                  ) : null}
                </div>
              ))
            )}

            {sending ? (
              <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> choosing a specialist
              </p>
            ) : null}
            {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(draft);
            }}
            className="flex items-end gap-3 border-t border-foreground/10 px-6 py-4"
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit(draft);
                }
              }}
              rows={2}
              maxLength={8000}
              placeholder="Describe the work…"
              className="min-h-[3rem] flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              aria-label="Send"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Released agents
          </p>
          {Object.keys(runs).length === 0 ? (
            <p className="border border-foreground/10 bg-foreground/[0.02] p-5 text-sm text-muted-foreground">
              The wilds are quiet. Nothing released yet.
            </p>
          ) : (
            Object.values(runs)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((run) => <RunCard key={run.id} run={run} />)
          )}
        </aside>
      </div>
    </div>
  );
}

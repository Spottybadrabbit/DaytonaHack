import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { RUN_LABELS, RUN_STATUS_LABELS, fetchRun, type RunView } from "@/lib/chat";
import {
  EXPORT_BUTTON_CLASS,
  downloadText,
  slugify,
  toCsv,
  toMarkdownTable,
  type ExportColumn,
} from "@/lib/export";

const POLL_MS = 4000;

function exportFilename(run: RunView, extension: string): string {
  return `fieldlab-${slugify(run.title)}-${run.id.slice(0, 8)}.${extension}`;
}

function scalarCandidateColumns(candidates: Array<Record<string, unknown>>): ExportColumn[] {
  const keys = new Set<string>();
  for (const candidate of candidates) {
    for (const [key, value] of Object.entries(candidate)) {
      if (value == null || typeof value === "object") continue;
      keys.add(key);
    }
  }
  const preferred = ["name", "matchStatus", "description", "url"];
  const ordered = [
    ...preferred.filter((key) => keys.has(key)),
    ...Array.from(keys).filter((key) => !preferred.includes(key)),
  ];
  return ordered.map((key) => ({ key, label: key }));
}

function ExportControls({
  run,
  columns,
  rows,
  markdownOnly = false,
  markdownText,
}: {
  run: RunView;
  columns: ExportColumn[];
  rows: Array<Record<string, unknown>>;
  markdownOnly?: boolean;
  markdownText?: string;
}) {
  const csv = toCsv(columns, rows);
  const markdown = markdownText ?? toMarkdownTable(columns, rows);
  return (
    <div className="mt-4 flex justify-end gap-2">
      {!markdownOnly ? (
        <button
          type="button"
          className={EXPORT_BUTTON_CLASS}
          onClick={() => downloadText(exportFilename(run, "csv"), "text/csv;charset=utf-8", csv)}
        >
          CSV
        </button>
      ) : null}
      <button
        type="button"
        className={EXPORT_BUTTON_CLASS}
        onClick={() => downloadText(exportFilename(run, "md"), "text/markdown;charset=utf-8", markdown)}
      >
        MD
      </button>
    </div>
  );
}

/** Renders a FindAll candidate roster, an enrichment record, or a markdown report. */
function RunResult({ run }: { run: RunView }) {
  const result = run.result as Record<string, unknown> | string | null;
  if (!result) return null;

  // FindAll — a roster of candidates.
  if (typeof result === "object" && Array.isArray((result as { candidates?: unknown }).candidates)) {
    const candidates = (result as { candidates: Array<Record<string, unknown>> }).candidates;
    const columns = scalarCandidateColumns(candidates);
    return (
      <>
        <ExportControls run={run} columns={columns} rows={candidates} />
        <ul className="mt-4 divide-y divide-foreground/10 border-t border-foreground/10">
          {candidates.map((candidate, index) => (
            <li key={`${index}-${String(candidate.name)}`} className="py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm">{String(candidate.name ?? "Unnamed")}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {String(candidate.matchStatus ?? "")}
                </span>
              </div>
              {candidate.description ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {String(candidate.description)}
                </p>
              ) : null}
              {candidate.url ? (
                <a
                  href={String(candidate.url)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  source <ArrowUpRight className="h-3 w-3" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </>
    );
  }

  // Task API — text report or a JSON record. Both arrive under `content`.
  const content = typeof result === "object" ? (result as { content?: unknown }).content : result;

  if (typeof content === "string") {
    const markdown = [
      `# ${run.title}`,
      "",
      "*`FIELD LAB · " + run.kind + " · " + run.objective + "`*",
      "",
      content,
    ].join("\n");
    return (
      <>
        <ExportControls
          run={run}
          columns={[]}
          rows={[]}
          markdownOnly
          markdownText={markdown}
        />
        <p className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap border-t border-foreground/10 pt-4 text-sm leading-relaxed text-muted-foreground">
          {content}
        </p>
      </>
    );
  }

  if (content && typeof content === "object") {
    const rows = Object.entries(content as Record<string, unknown>).map(([field, value]) => ({ field, value }));
    const columns = [
      { key: "field", label: "Field" },
      { key: "value", label: "Value" },
    ];
    return (
      <>
        <ExportControls run={run} columns={columns} rows={rows} />
        <dl className="mt-4 space-y-2 border-t border-foreground/10 pt-4">
          {Object.entries(content as Record<string, unknown>).map(([key, value]) => (
            <div key={key} className="grid gap-1 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {key.replace(/_/g, " ")}
              </dt>
              <dd className="text-sm text-foreground/90">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </>
    );
  }

  return null;
}

/**
 * One dispatched run. Polls the owner-only status endpoint until the run reaches
 * a terminal state, so a run keeps resolving even if the chat scrolls away.
 */
export function RunCard({ run: initial }: { run: RunView }) {
  const { getToken } = useAuth();
  const [run, setRun] = useState(initial);
  const stopped = useRef(false);

  useEffect(() => {
    if (run.status === "succeeded" || run.status === "failed") return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await fetchRun(initial.id, await getToken());
        if (stopped.current) return;
        setRun(next.run);
        if (next.run.status === "succeeded" || next.run.status === "failed") return;
      } catch {
        // Transient failure; keep polling rather than stranding the card.
      }
      if (!stopped.current) timer = setTimeout(tick, POLL_MS);
    };

    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id, run.status]);

  const label = RUN_LABELS[run.kind];
  const active = run.status === "queued" || run.status === "running";

  return (
    <article className="border border-foreground/10 bg-foreground/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {label.name} · {label.species}
          </p>
          <h3 className="mt-1 font-display text-xl leading-tight">{run.title}</h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          {active ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#eca8d6]" />
          ) : (
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                run.status === "succeeded" ? "bg-[#eca8d6]" : "bg-muted-foreground"
              }`}
            />
          )}
          {RUN_STATUS_LABELS[run.status]}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{run.objective}</p>

      {run.status === "failed" && run.errorMessage ? (
        <p className="mt-4 border-t border-foreground/10 pt-4 text-sm text-muted-foreground">
          {run.errorMessage}
        </p>
      ) : null}

      {run.status === "succeeded" ? <RunResult run={run} /> : null}
    </article>
  );
}

export default RunCard;

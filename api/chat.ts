import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUser } from "./_lib/clerk.js";
import {
  TOOL_DEFINITIONS,
  deepResearchInput,
  enrichInput,
  findAllInput,
  gtmInput,
} from "./_lib/chat-tools.js";
import { hasDeepline, launchGtmRun } from "./_lib/deepline.js";
import {
  hasParallel,
  startDeepResearch,
  startEnrichment,
  startFindAll,
} from "./_lib/parallel.js";
import { insertRun, patchRun, toRunView, type RunView } from "./_lib/runs.js";
import { syncClerkUser } from "./_lib/supabase.js";

export const config = { maxDuration: 120 };

const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 4;
/** Per-request cap on how many background runs one chat turn may start. */
const MAX_RUNS_PER_TURN = 3;

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8_000),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM_PROMPT = [
  "You are the field-lab operator for Agents in the Wild — a marketplace where autonomous agents are",
  "raised, released, and tracked. You help a signed-in researcher get real work done by dispatching",
  "specialist agents and reading back what they find.",
  "",
  "You have four specialists. Each one runs in the background for minutes, so you dispatch it and the",
  "person watches the run card fill in — you never wait for a result inside one reply.",
  "- deep_research: a written report on a topic.",
  "- find_all: a roster of entities matching conditions. This is the VC agent.",
  "- enrich_records: named attributes about one named subject.",
  "- gtm_find_contact: contactable go-to-market data, via Deepline in its own sandbox.",
  "",
  "Choosing between them: a roster is find_all, a narrative is deep_research, attributes of one thing are",
  "enrich_records, a person's email or the right role-holder is gtm_find_contact. When the request is a",
  "roster, split every requirement into its own match condition — one checkable claim each.",
  "",
  "Dispatch when you have enough to act. Ask a clarifying question only when two readings would produce",
  "materially different runs; otherwise pick the sensible reading, dispatch, and say what you assumed.",
  "Do not dispatch the same specialist twice for one request, and do not re-run something already running.",
  "",
  "Keep replies short and concrete: what you dispatched, what it will come back with, and anything you",
  "assumed. No preamble, no restating the question, no bulleted summaries of your own process.",
  "In the wild-field-guide voice of the site, an agent that is working is 'out hunting' — but never let the",
  "theme cost clarity.",
].join("\n");

interface ToolOutcome {
  content: string;
  run?: RunView;
}

/** Executes one tool call. Validation happens here, not in the model. */
async function runTool(
  name: string,
  rawInput: unknown,
  ownerId: string,
): Promise<ToolOutcome> {
  switch (name) {
    case "deep_research": {
      if (!hasParallel()) return { content: "Parallel is not configured on this deployment." };
      const input = deepResearchInput.parse(rawInput);
      const run = await insertRun({
        ownerId,
        kind: "deep_research",
        provider: "parallel",
        title: input.title,
        objective: input.objective,
      });
      const providerRunId = await startDeepResearch(input.objective);
      await patchRun(run.id, { provider_run_id: providerRunId, status: "running" });
      return {
        content: `Deep research dispatched. Run ${run.id} is out hunting.`,
        run: toRunView({ ...run, status: "running" }),
      };
    }

    case "find_all": {
      if (!hasParallel()) return { content: "Parallel is not configured on this deployment." };
      const input = findAllInput.parse(rawInput);
      const run = await insertRun({
        ownerId,
        kind: "find_all",
        provider: "parallel",
        title: input.title,
        objective: input.objective,
      });
      const providerRunId = await startFindAll({
        objective: input.objective,
        entityType: input.entity_type,
        matchConditions: input.match_conditions,
        matchLimit: input.match_limit ?? 10,
      });
      await patchRun(run.id, { provider_run_id: providerRunId, status: "running" });
      return {
        content: `FindAll dispatched with ${input.match_conditions.length} match conditions. Run ${run.id} is out hunting.`,
        run: toRunView({ ...run, status: "running" }),
      };
    }

    case "enrich_records": {
      if (!hasParallel()) return { content: "Parallel is not configured on this deployment." };
      const input = enrichInput.parse(rawInput);
      const run = await insertRun({
        ownerId,
        kind: "enrich",
        provider: "parallel",
        title: input.title,
        objective: input.subject,
      });
      const providerRunId = await startEnrichment(input.subject, input.fields);
      await patchRun(run.id, { provider_run_id: providerRunId, status: "running" });
      return {
        content: `Enrichment dispatched for ${input.fields.length} fields. Run ${run.id} is out hunting.`,
        run: toRunView({ ...run, status: "running" }),
      };
    }

    case "gtm_find_contact": {
      if (!hasDeepline()) return { content: "Daytona is not configured, so the GTM agent cannot run." };
      const input = gtmInput.parse(rawInput);
      const payload = {
        company_name: input.company_name,
        domain: input.domain,
        roles: input.roles,
        email: input.email,
      };
      const objective = [input.tool, input.company_name, input.domain, input.email]
        .filter(Boolean)
        .join(" · ");
      const run = await insertRun({
        ownerId,
        kind: "gtm_contact",
        provider: "deepline",
        title: input.title,
        objective,
      });
      const launch = await launchGtmRun(run.id, input.tool, payload);
      await patchRun(run.id, {
        status: "running",
        sandbox_id: launch.sandboxId,
        session_id: launch.sessionId,
        command_id: launch.commandId,
      });
      return {
        content: `GTM agent dispatched in its own sandbox. Run ${run.id} is out hunting.`,
        run: toRunView({ ...run, status: "running" }),
      };
    }

    default:
      return { content: `Unknown tool: ${name}` };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(503).json({ error: "Chat is missing ANTHROPIC_API_KEY." });

  try {
    await syncClerkUser(user.userId);
    const client = new Anthropic({ apiKey: anthropicKey });

    const messages: Anthropic.MessageParam[] = parsed.data.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const dispatched: RunView[] = [];
    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 8_000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // Manual tool loop: each tool dispatches a background run and returns
    // immediately, so the whole turn stays inside the function's time budget.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      if (response.stop_reason !== "tool_use") break;

      const calls = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );
      if (calls.length === 0) break;

      messages.push({ role: "assistant", content: response.content });

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const call of calls) {
        if (dispatched.length >= MAX_RUNS_PER_TURN) {
          results.push({
            type: "tool_result",
            tool_use_id: call.id,
            content: "Run limit for this turn reached. Tell the person to send the rest as a follow-up.",
            is_error: true,
          });
          continue;
        }
        try {
          const outcome = await runTool(call.name, call.input, user.userId);
          if (outcome.run) dispatched.push(outcome.run);
          results.push({ type: "tool_result", tool_use_id: call.id, content: outcome.content });
        } catch (error) {
          const message = error instanceof Error ? error.message : "The specialist could not be dispatched.";
          console.error(`[chat] tool ${call.name} failed: ${message}`);
          results.push({
            type: "tool_result",
            tool_use_id: call.id,
            // Provider messages can carry internals; give the model a flat summary.
            content: `${call.name} could not be dispatched.`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: results });
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 8_000,
        system: SYSTEM_PROMPT,
        thinking: { type: "adaptive" },
        tools: TOOL_DEFINITIONS,
        messages,
      });
    }

    if (response.stop_reason === "refusal") {
      return res.status(200).json({
        reply: "I can't help with that one. Try rephrasing, or ask about something else.",
        runs: dispatched,
      });
    }

    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return res.status(200).json({
      reply: reply || "Dispatched. Watch the run cards for results.",
      runs: dispatched,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    console.error(`[chat] ${message}`);
    return res.status(502).json({ error: "The field lab could not reach its agents. Try again." });
  }
}

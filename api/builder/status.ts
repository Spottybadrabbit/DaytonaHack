import { Daytona } from "@daytona/sdk";
import { z } from "zod";
import { requireUser } from "../_lib/clerk.js";
import {
  agentSelect,
  supabaseJson,
  supabaseResponse,
  type AgentRow,
} from "../_lib/supabase.js";

export const config = { maxDuration: 60 };

const querySchema = z.object({ agentId: z.string().uuid() });
const builderSchema = z.object({
  sandboxId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(200),
  commandId: z.string().min(1).max(200),
  projectId: z.string().uuid(),
  readyMarker: z.string().regex(/^AIW_READY_[0-9a-f-]{36}$/),
});

function builderFrom(agent: AgentRow) {
  const config = agent.platform_config;
  return builderSchema.safeParse(
    config && typeof config === "object" && "builder" in config
      ? (config as { builder: unknown }).builder
      : null,
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const parsed = querySchema.safeParse({
    agentId: Array.isArray(req.query?.agentId) ? req.query.agentId[0] : req.query?.agentId,
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid agent ID." });

  const agent = (await supabaseJson<AgentRow[]>(
    `agents?${agentSelect()}&id=eq.${parsed.data.agentId}&limit=1`,
  ))[0];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  if (agent.creator_id !== user.userId || agent.is_wild) {
    return res.status(403).json({ error: "You can only inspect builds you own." });
  }
  if (agent.status === "published" && agent.preview_url) {
    return res.status(200).json({ status: "published", logs: "Build complete.", previewUrl: agent.preview_url });
  }
  if (agent.status === "error") {
    return res.status(200).json({ status: "error", logs: "Build stopped.", error: "The build failed. Start a new Development agent to retry." });
  }

  const metadata = builderFrom(agent);
  if (!metadata.success) return res.status(409).json({ error: "This agent has no active Builder Bros job." });
  const daytonaKey = process.env.DAYTONA_API_KEY;
  if (!daytonaKey) return res.status(503).json({ error: "Builder is missing DAYTONA_API_KEY." });

  try {
    const daytona = new Daytona({ apiKey: daytonaKey, requestTimeoutMs: 30_000 });
    const sandbox = await daytona.get(metadata.data.sandboxId);
    const [command, output] = await Promise.all([
      sandbox.process.getSessionCommand(metadata.data.sessionId, metadata.data.commandId),
      sandbox.process.getSessionCommandLogs(metadata.data.sessionId, metadata.data.commandId),
    ]);
    const logs = (output.output || [output.stdout, output.stderr].filter(Boolean).join("\n") || "Claude is starting…").slice(-20_000);

    if (logs.includes(metadata.data.readyMarker)) {
      const preview = await sandbox.getPreviewLink(3000);
      const previewUrl = new URL(preview.url).toString();
      await Promise.all([
        supabaseResponse(`agents?id=eq.${agent.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "published",
            is_active: true,
            is_published: true,
            preview_url: previewUrl,
            api_endpoint: previewUrl,
          }),
        }),
        supabaseResponse(`projects?id=eq.${metadata.data.projectId}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "ready", preview_url: previewUrl }),
        }),
        supabaseResponse(`sandboxes?daytona_id=eq.${encodeURIComponent(metadata.data.sandboxId)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "running", preview_url: previewUrl }),
        }),
      ]);
      return res.status(200).json({ status: "published", logs, previewUrl });
    }

    if (typeof command.exitCode === "number") {
      const error = `Claude build exited with code ${command.exitCode}.`;
      await Promise.all([
        supabaseResponse(`agents?id=eq.${agent.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "error", is_active: false }),
        }),
        supabaseResponse(`projects?id=eq.${metadata.data.projectId}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "error" }),
        }),
        supabaseResponse(`sandboxes?daytona_id=eq.${encodeURIComponent(metadata.data.sandboxId)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "failed" }),
        }),
      ]);
      return res.status(200).json({ status: "error", logs, error });
    }

    return res.status(200).json({ status: "building", logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Daytona error";
    console.error(`[builder/status] ${message}`);
    return res.status(502).json({ error: "Builder status is temporarily unavailable. Try again." });
  }
}

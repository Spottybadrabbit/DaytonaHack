import { randomUUID } from "node:crypto";
import { Daytona } from "@daytona/sdk";
import { z } from "zod";
import { requireUser } from "../_lib/clerk.js";
import {
  agentSelect,
  supabaseJson,
  supabaseResponse,
  syncClerkUser,
  type AgentRow,
} from "../_lib/supabase.js";

export const config = { maxDuration: 300 };

const requestSchema = z.object({
  agentId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(6_000),
});

const SECRET_NAME = "agents_wild_anthropic";
const BUILD_DIR = "/tmp/agents-wild-builder";

export function runnerSource(readyMarker: string) {
  return String.raw`import { query } from "@anthropic-ai/claude-agent-sdk";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { mkdir, readFile, stat } from "node:fs/promises";

const root = resolve("site");
const payload = JSON.parse(await readFile("prompt.json", "utf8"));
await mkdir(root, { recursive: true });

const brief = [
  "Build a polished, demo-ready static website for this public agent.",
  "Project name: " + payload.name,
  "User brief: " + payload.prompt,
  "Work only inside the current site directory.",
  "Create index.html and any local CSS, JavaScript, or SVG assets it needs.",
  "Make it responsive, accessible, visually distinctive, and immediately usable.",
  "Do not use external packages, CDNs, network requests, or server-side code.",
  "Finish the files before replying.",
].join("\n");

for await (const message of query({
  prompt: brief,
  options: {
    cwd: root,
    tools: ["Read", "Write", "Edit", "Glob", "Grep"],
    allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
    permissionMode: "dontAsk",
    settingSources: [],
    skills: [],
    maxTurns: 20,
    maxBudgetUsd: 3,
    persistSession: false,
    env: { ...process.env, CLAUDE_AGENT_SDK_CLIENT_APP: "agents-in-the-wild/1.0" },
  },
})) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") console.log(block.text);
      if (block.type === "tool_use") console.log("Editing site: " + block.name);
    }
  }
  if (message.type === "result" && (message.subtype !== "success" || message.is_error)) {
    throw new Error("Claude stopped before completing the site: " + message.subtype);
  }
}

await stat(resolve(root, "index.html"));

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    let file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    response.writeHead(200, { "Content-Type": mime[extname(file).toLowerCase()] || "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(3000, "0.0.0.0", () => console.log(${JSON.stringify(readyMarker)}));
`;
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

  const daytonaKey = process.env.DAYTONA_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!daytonaKey || !anthropicKey) {
    return res.status(503).json({
      error: `Builder is missing ${[!daytonaKey && "DAYTONA_API_KEY", !anthropicKey && "ANTHROPIC_API_KEY"].filter(Boolean).join(" and ")}.`,
    });
  }

  const { agentId, prompt } = parsed.data;
  const agent = (await supabaseJson<AgentRow[]>(
    `agents?${agentSelect()}&id=eq.${agentId}&limit=1`,
  ))[0];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  if (agent.creator_id !== user.userId || agent.is_wild) {
    return res.status(403).json({ error: "You can only build agents you own." });
  }
  if (agent.status === "building") return res.status(409).json({ error: "This agent is already building." });
  if (agent.status === "published") return res.status(409).json({ error: "This agent is already published." });

  let projectId: string | undefined;
  let sandboxId: string | undefined;
  try {
    await syncClerkUser(user.userId);
    const projects = await supabaseJson<Array<{ id: string }>>("projects?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: user.userId,
        name: agent.name,
        description: agent.description,
        prompt,
        status: "generating",
        framework: "static",
        language: "html",
        tags: ["agents-in-the-wild"],
        metadata: { source: "agents-in-the-wild", agentId },
      }),
    });
    projectId = projects[0]?.id;
    if (!projectId) throw new Error("Supabase did not create the Builder Bros project.");

    const daytona = new Daytona({ apiKey: daytonaKey, requestTimeoutMs: 90_000 });
    const secrets = await daytona.secret.list({ name: SECRET_NAME, limit: 10 });
    const existingSecret = secrets.items.find((secret) => secret.name === SECRET_NAME);
    if (existingSecret) {
      await daytona.secret.update(existingSecret.id, {
        value: anthropicKey,
        hosts: ["api.anthropic.com"],
      });
    } else {
      await daytona.secret.create({
        name: SECRET_NAME,
        value: anthropicKey,
        description: "Claude key for Agents in the Wild builds",
        hosts: ["api.anthropic.com"],
      });
    }

    const sandboxName = `agents-wild-${agentId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
    const sandbox = await daytona.create({
      name: sandboxName,
      language: "typescript",
      public: true,
      labels: { app: "agents-in-the-wild", agent: agentId },
      secrets: { ANTHROPIC_API_KEY: SECRET_NAME },
      domainAllowList: "registry.npmjs.org,*.npmjs.org,api.anthropic.com,*.anthropic.com",
      autoStopInterval: 180,
      autoArchiveInterval: 1_440,
      autoDeleteInterval: 4_320,
      ttlMinutes: 4_320,
    }, { timeout: 90 });
    sandboxId = sandbox.id;

    await supabaseResponse("sandboxes", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: user.userId,
        project_id: projectId,
        daytona_id: sandboxId,
        name: sandboxName,
        status: "running",
        project_path: BUILD_DIR,
        metadata: { source: "agents-in-the-wild", agentId },
      }),
    });

    const readyMarker = `AIW_READY_${randomUUID()}`;
    const sessionId = `build-${randomUUID()}`;
    await sandbox.process.executeCommand(`mkdir -p ${BUILD_DIR}`);
    await sandbox.fs.uploadFile(
      Buffer.from(JSON.stringify({ name: agent.name, prompt }), "utf8"),
      `${BUILD_DIR}/prompt.json`,
    );
    await sandbox.fs.uploadFile(Buffer.from(runnerSource(readyMarker), "utf8"), `${BUILD_DIR}/runner.mjs`);
    await sandbox.process.createSession(sessionId);
    const command = await sandbox.process.executeSessionCommand(sessionId, {
      command: `cd ${BUILD_DIR} && npm install --no-audit --no-fund --no-save @anthropic-ai/claude-agent-sdk@0.3.246 && node runner.mjs`,
      runAsync: true,
      suppressInputEcho: true,
    });
    if (!command.cmdId) throw new Error("Daytona did not return a build command ID.");

    const builder = { sandboxId, sessionId, commandId: command.cmdId, projectId, readyMarker };
    await Promise.all([
      supabaseResponse(`projects?id=eq.${projectId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ sandbox_id: sandboxId, metadata: { source: "agents-in-the-wild", agentId, builder } }),
      }),
      supabaseResponse(`agents?id=eq.${agentId}&creator_id=eq.${encodeURIComponent(user.userId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          project_id: projectId,
          status: "building",
          is_active: true,
          platform: "daytona",
          platform_config: { provider: "daytona", builder },
        }),
      }),
    ]);

    return res.status(202).json({ status: "building", logs: "Daytona sandbox started. Claude is building…" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown builder error";
    console.error(`[builder/build] ${message}`);
    await Promise.allSettled([
      projectId
        ? supabaseResponse(`projects?id=eq.${projectId}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: "error", metadata: { source: "agents-in-the-wild", agentId, error: message } }),
          })
        : Promise.resolve(),
      sandboxId
        ? supabaseResponse(`sandboxes?daytona_id=eq.${sandboxId}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: "failed", metadata: { source: "agents-in-the-wild", agentId, error: message } }),
          })
        : Promise.resolve(),
      supabaseResponse(`agents?id=eq.${agentId}&creator_id=eq.${encodeURIComponent(user.userId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "error", is_active: false }),
      }),
    ]);
    return res.status(502).json({ error: "The Builder Bros job could not be started. Try again." });
  }
}

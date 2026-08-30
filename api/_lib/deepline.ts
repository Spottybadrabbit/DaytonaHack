import { randomUUID } from "node:crypto";
import { Daytona } from "@daytona/sdk";
import { PARALLEL_HOSTS } from "./parallel.js";

// Deepline (GTM contact enrichment) exposes no documented server-side API-key
// flow — the supported paths are a browser OAuth handshake and the `deepline`
// CLI. So the GTM agent runs the CLI inside its own Daytona sandbox instead of
// in the Vercel function, and the sandbox surfaces the authorization URL back to
// the chat when a one-time browser approval is still needed.
//
// This sandbox is a DIFFERENT trust tier from the site builder: the GTM runner
// needs a shell to drive the CLI. It is therefore never given Claude, never
// serves a public port, and only ever executes the fixed runner below.

export const GTM_DIR = "/tmp/agents-wild-gtm";
export const GTM_RUNNER = "gtm-runner.mjs";
export const GTM_PAYLOAD = "payload.json";

/** Deepline tools the GTM agent may call. Anything else is rejected server-side. */
export const GTM_TOOLS = [
  "company_to_contact_by_role_waterfall",
  "company_enrich",
  "email_verify",
] as const;

export type GtmTool = (typeof GTM_TOOLS)[number];

export function isGtmTool(value: string): value is GtmTool {
  return (GTM_TOOLS as readonly string[]).includes(value);
}

/** Fixed argv. Contains no request data. */
export const GTM_COMMAND =
  `cd ${GTM_DIR}` +
  " && npm install -g --no-audit --no-fund --silent deepline@latest" +
  ` && node ${GTM_RUNNER}`;

/**
 * The GTM runner uploaded into the sandbox.
 *
 * A fixed constant: the tool name and payload are uploaded separately as
 * `payload.json` and read back with `JSON.parse`. The CLI is invoked with
 * `execFile` and an argv array — never a shell string — so no field of the
 * payload can become a shell argument or an extra command.
 */
export function gtmRunnerSource(readyMarker: string) {
  return String.raw`import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";

const job = JSON.parse(await readFile("payload.json", "utf8"));

function run(argv) {
  return new Promise((resolve) => {
    // argv array, no shell: payload values can never be reinterpreted as commands.
    execFile("deepline", argv, { timeout: 240000, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ code: error && typeof error.code === "number" ? error.code : error ? 1 : 0, stdout, stderr });
    });
  });
}

const setup = await run(["setup", "--json"]);
const combined = setup.stdout + "\n" + setup.stderr;
const authUrl = (combined.match(/https:\/\/[^\s"']*(?:auth|login|approve|verify)[^\s"']*/i) || [])[0];

const status = await run(["auth", "status"]);
const authorized = status.code === 0 && !/not\s+(logged|authori)/i.test(status.stdout + status.stderr);

if (!authorized) {
  // One-time browser approval is still outstanding. Hand the URL to the chat
  // rather than blocking the sandbox on an interactive prompt.
  console.log("::deepline-auth:" + (authUrl || "https://deepline.com/login"));
  console.log(${JSON.stringify(readyMarker)});
  process.exit(0);
}

const result = await run(["tools", "execute", job.tool, "--payload", JSON.stringify(job.payload)]);
if (result.code !== 0) {
  console.log("::deepline-error:" + (result.stderr || result.stdout || "deepline exited with " + result.code).slice(0, 2000));
  console.log(${JSON.stringify(readyMarker)});
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch {
  parsed = { raw: result.stdout.slice(0, 8000) };
}
console.log("::deepline-result:" + JSON.stringify(parsed));
console.log(${JSON.stringify(readyMarker)});
`;
}

export interface GtmLaunch {
  sandboxId: string;
  sessionId: string;
  commandId: string;
  readyMarker: string;
}

export interface GtmProgress {
  status: "queued" | "running" | "succeeded" | "failed";
  result: unknown;
  errorMessage: string | null;
  /** Set when Deepline still needs a one-time browser approval from the owner. */
  authorizationUrl: string | null;
}

function daytona(): Daytona {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) throw new Error("Daytona is not configured.");
  return new Daytona({ apiKey, requestTimeoutMs: 90_000 });
}

export function hasDeepline(): boolean {
  return Boolean(process.env.DAYTONA_API_KEY);
}

/**
 * Creates the GTM sandbox, uploads the runner and the payload, and starts the
 * CLI as a background session command. Returns as soon as the command is
 * registered — Deepline keeps running after this resolves.
 */
export async function launchGtmRun(
  runId: string,
  tool: GtmTool,
  payload: unknown,
): Promise<GtmLaunch> {
  const client = daytona();
  const token = process.env.DEEPLINE_API_TOKEN;

  const sandbox = await client.create(
    {
      name: `agents-wild-gtm-${runId.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
      language: "typescript",
      // No public port: this sandbox produces data, not a website.
      public: false,
      labels: { app: "agents-in-the-wild", role: "gtm", run: runId },
      envVars: token ? { DEEPLINE_API_TOKEN: token } : {},
      domainAllowList: `registry.npmjs.org,*.npmjs.org,deepline.com,*.deepline.com,code.deepline.com,${PARALLEL_HOSTS}`,
      autoStopInterval: 60,
      autoDeleteInterval: 720,
      ttlMinutes: 720,
    },
    { timeout: 90 },
  );

  const readyMarker = `AIW_GTM_${randomUUID()}`;
  const sessionId = `gtm-${randomUUID()}`;

  await sandbox.process.executeCommand(`mkdir -p ${GTM_DIR}`);
  // Both uploads are data. Neither is concatenated into the command.
  await sandbox.fs.uploadFile(
    Buffer.from(JSON.stringify({ tool, payload }), "utf8"),
    `${GTM_DIR}/${GTM_PAYLOAD}`,
  );
  await sandbox.fs.uploadFile(
    Buffer.from(gtmRunnerSource(readyMarker), "utf8"),
    `${GTM_DIR}/${GTM_RUNNER}`,
  );

  await sandbox.process.createSession(sessionId);
  const command = await sandbox.process.executeSessionCommand(sessionId, {
    command: GTM_COMMAND,
    runAsync: true,
    suppressInputEcho: true,
  });
  if (!command.cmdId) throw new Error("Daytona did not return a GTM command ID.");

  return { sandboxId: sandbox.id, sessionId, commandId: command.cmdId, readyMarker };
}

/** Reads the background command's log stream and derives run state from it. */
export async function pollGtmRun(input: {
  sandboxId: string;
  sessionId: string;
  commandId: string;
}): Promise<GtmProgress> {
  const client = daytona();
  const sandbox = await client.get(input.sandboxId);
  const logs = await sandbox.process.getSessionCommandLogs(input.sessionId, input.commandId);
  const raw = logs?.output ?? [logs?.stdout, logs?.stderr].filter(Boolean).join("\n") ?? "";
  return parseGtmOutput(raw);
}

/**
 * Daytona multiplexes async session logs and frames each chunk with control
 * bytes (`\x01\x01\x01...`), which `trim()` does not remove. Strip them before
 * matching, or every marker check silently fails.
 */
function cleanLogLine(line: string): string {
  // eslint-disable-next-line no-control-regex
  return line.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").trim();
}

export function parseGtmOutput(raw: string): GtmProgress {
  let authorizationUrl: string | null = null;

  for (const line of raw.split("\n")) {
    const text = cleanLogLine(line);
    if (text.startsWith("::deepline-result:")) {
      const body = text.slice("::deepline-result:".length);
      try {
        return { status: "succeeded", result: JSON.parse(body), errorMessage: null, authorizationUrl: null };
      } catch {
        return { status: "failed", result: null, errorMessage: "Deepline returned unreadable output.", authorizationUrl: null };
      }
    }
    if (text.startsWith("::deepline-error:")) {
      return {
        status: "failed",
        result: null,
        errorMessage: text.slice("::deepline-error:".length).slice(0, 500),
        authorizationUrl: null,
      };
    }
    if (text.startsWith("::deepline-auth:")) {
      authorizationUrl = text.slice("::deepline-auth:".length);
    }
  }

  if (authorizationUrl) {
    return {
      status: "failed",
      result: null,
      errorMessage: "Deepline needs a one-time browser authorization before it can run.",
      authorizationUrl,
    };
  }
  return { status: "running", result: null, errorMessage: null, authorizationUrl: null };
}

export async function destroyGtmSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await daytona().get(sandboxId);
    await sandbox.delete();
  } catch (error) {
    console.error(`[gtm] sandbox cleanup failed: ${error instanceof Error ? error.message : error}`);
  }
}

import assert from "node:assert/strict";
import { transform } from "esbuild";
import { runnerSource } from "../api/builder/build.js";
import { GTM_COMMAND, GTM_TOOLS, gtmRunnerSource } from "../api/_lib/deepline.js";

/* ------------------------------------------------------------------ *
 * Site builder runner — Claude Code with file tools only
 * ------------------------------------------------------------------ */

const marker = "AIW_READY_00000000-0000-4000-8000-000000000000";
const source = runnerSource(marker);

assert.match(source, /permissionMode: "dontAsk"/);
assert.match(source, /tools: \["Read", "Write", "Edit", "Glob", "Grep"\]/);
assert.doesNotMatch(source, /bypassPermissions|\"Bash\"|WebFetch|WebSearch/);
assert.match(source, new RegExp(marker));
await transform(source, { loader: "js", format: "esm" });

/* ------------------------------------------------------------------ *
 * GTM runner — drives the Deepline CLI in its own sandbox
 *
 * This runner is a separate, higher-privilege trust tier: it needs a shell to
 * invoke the CLI. The invariant that keeps that safe is that the tool name and
 * payload arrive as an uploaded JSON file and are passed as an argv array, so no
 * payload value can ever be reinterpreted as a command.
 * ------------------------------------------------------------------ */

const gtmMarker = "AIW_GTM_00000000-0000-4000-8000-000000000000";
const gtm = gtmRunnerSource(gtmMarker);

// The payload is data: parsed from an uploaded file, never evaluated.
assert.match(gtm, /JSON\.parse\(await readFile\("payload\.json", "utf8"\)\)/);

// The CLI is invoked with an argv array and no shell.
assert.match(gtm, /execFile\("deepline", argv/);
assert.doesNotMatch(gtm, /shell:\s*true/);
assert.doesNotMatch(gtm, /\bexecSync\b|\bspawnSync\b|require\("child_process"\)/);
// A template literal or concatenation around the command would reintroduce a shell.
assert.doesNotMatch(gtm, /execFile\(\s*`/);

// The command that starts the runner carries no request data.
assert.doesNotMatch(GTM_COMMAND, /payload|tool=|\$\{(?!GTM_)/);
assert.match(GTM_COMMAND, /node gtm-runner\.mjs$/);

// The GTM sandbox never gets Claude, and never serves a public port.
assert.doesNotMatch(gtm, /claude-agent-sdk|createServer|listen\(/);

assert.match(gtm, new RegExp(gtmMarker));
assert.ok(GTM_TOOLS.length > 0, "the GTM tool allowlist must not be empty");
await transform(gtm, { loader: "js", format: "esm" });

console.log(
  `Builder runner safety check passed (site builder + GTM runner, ${GTM_TOOLS.length} allowlisted GTM tools).`,
);

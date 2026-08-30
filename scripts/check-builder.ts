import assert from "node:assert/strict";
import { transform } from "esbuild";
import { runnerSource } from "../api/builder/build.js";

const marker = "AIW_READY_00000000-0000-4000-8000-000000000000";
const source = runnerSource(marker);

assert.match(source, /permissionMode: "dontAsk"/);
assert.match(source, /tools: \["Read", "Write", "Edit", "Glob", "Grep"\]/);
assert.doesNotMatch(source, /bypassPermissions|\"Bash\"|WebFetch|WebSearch/);
assert.match(source, new RegExp(marker));
await transform(source, { loader: "js", format: "esm" });

console.log("Builder runner safety check passed.");

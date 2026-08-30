import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  // loadEnv only reads .env files. On Vercel the dashboard vars arrive through
  // process.env, so both sources have to be consulted or a deployed build
  // silently swaps in the local Clerk stub (whose getToken() returns null).
  const clerkPublishableKey =
    env.VITE_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (process.env.VERCEL && !clerkPublishableKey) {
    throw new Error("VITE_CLERK_PUBLISHABLE_KEY is required for Vercel builds.");
  }
  const useLocalClerk = !clerkPublishableKey;
  const clerkShim = path.resolve(__dirname, "client", "src", "lib", "clerk-local.tsx");

  return {
    plugins: [react(), runtimeErrorOverlay()],
    resolve: {
      alias: [
        ...(useLocalClerk
          ? [
              { find: /^@clerk\/react$/, replacement: clerkShim },
              { find: /^@clerk\/react\/experimental$/, replacement: clerkShim },
            ]
          : []),
        { find: "@", replacement: path.resolve(__dirname, "client", "src") },
        { find: "@shared", replacement: path.resolve(__dirname, "shared") },
      ],
    },
    root: path.resolve(__dirname, "client"),
    // Vite resolves env files relative to `root` (client/) by default, but this
    // repo keeps .env at the repo root — without this, local `vite build` misses
    // VITE_* vars (Vercel is unaffected: dashboard vars arrive via process.env).
    envDir: __dirname,
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
  };
});

import { verifyToken } from "@clerk/backend";

// Server-side Clerk session verification for the api/ functions.
// Files under api/_lib are NOT deployed as routes (underscore prefix) —
// import from a function as: import { requireUser } from "../_lib/clerk.js";
// (the .js extension is mandatory: "type": "module" makes these run as ESM).

export interface AuthedUser {
  userId: string;
  /** Raw JWT claims — includes plan/feature entitlements (pla/fea) for billing checks. */
  claims: Record<string, unknown>;
}

export async function requireUser(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<AuthedUser | null> {
  const header = req.headers["authorization"];
  const value = Array.isArray(header) ? header[0] : header;
  const token = value?.startsWith("Bearer ") ? value.slice(7) : undefined;
  if (!token) return null;

  try {
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return { userId: claims.sub, claims: claims as Record<string, unknown> };
  } catch {
    return null;
  }
}

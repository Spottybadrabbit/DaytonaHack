/**
 * Clerk ⇄ Convex auth bridge.
 *
 * Pairs with the Clerk JWT template named "convex" (aud: "convex", plus a
 * `plan` claim mirrored from user.public_metadata.plan for paid limits).
 * The issuer domain comes from the deployment env var CLERK_FRONTEND_API_URL
 * (set per deployment — dev and prod can point at different Clerk instances),
 * falling back to the gorgeous-shrimp-61 dev instance.
 */
export default {
  providers: [
    {
      domain:
        process.env.CLERK_FRONTEND_API_URL ??
        "https://gorgeous-shrimp-61.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

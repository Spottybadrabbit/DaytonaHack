import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      {/* Hash routing keeps Clerk's multi-step flow (factor-one, verify, …) working
          without needing wildcard route matching in wouter. */}
      <SignIn routing="hash" signUpUrl="/sign-up" />
    </div>
  );
}

import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <SignUp routing="hash" signInUrl="/sign-in" />
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { Show, UserButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { BrandWordmark } from "./brand-wordmark";
import { Zap } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();

  // Pricing deliberately lives only on the landing page nav (scrolls to #pricing)
  // — signed-in users manage their plan from UserButton/billing, not the app nav.
  const navLinks = [
    { href: "/", label: "Homepage" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/chat", label: "Field Lab" },
    { href: "/marketplace", label: "Marketplace" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <BrandWordmark size="sm" />

          <div className="hidden md:flex gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`text-sm ${
                    location === link.href
                      ? "text-foreground"
                      : "text-muted-foreground"
                  } hover:text-foreground transition-colors cursor-pointer`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
          </Show>
          <Link href="/create-agent">
            <Button size="sm" className="gap-1.5 button-hover hidden sm:inline-flex">
              <Zap className="h-4 w-4" />
              Build a Wild Agent
            </Button>
          </Link>
          <Show when="signed-in">
            <Link href="/account">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Account
              </Button>
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}

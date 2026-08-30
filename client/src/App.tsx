import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { RedirectToSignIn, useAuth } from "@clerk/react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./hooks/use-theme";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home"; // COMPUTE-style landing page
import AgentDetails from "@/pages/agent-details";
import Dashboard from "@/pages/dashboard";
import CreateAgent from "@/pages/create-agent";
import Chat from "@/pages/chat";
import MarketplaceWorld from "@/pages/marketplace-world";
import Pricing from "@/pages/pricing";
import Checkout from "@/pages/checkout";
import Account from "@/pages/account";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import About from "@/pages/site/about";
import Blog from "@/pages/site/blog";
import Careers from "@/pages/site/careers";
import Contact from "@/pages/site/contact";
import Status from "@/pages/site/status";
import Privacy from "@/pages/site/privacy";
import Terms from "@/pages/site/terms";
import Security from "@/pages/site/security";
import Navbar from "@/components/navbar";

// Routes that ship their own immersive navigation + footer (the landing page
// and the marketing/site pages) — the shared app Navbar stays off these.
const CHROMELESS_ROUTES = new Set([
  "/",
  "/about",
  "/blog",
  "/careers",
  "/contact",
  "/status",
  "/privacy",
  "/terms",
  "/security",
  "/marketplace",
]);

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground animate-pulse">
          verifying your credentials…
        </span>
      </div>
    );
  }
  return isSignedIn ? children : <RedirectToSignIn />;
}

function Router() {
  const [location] = useLocation();
  const isChromeless = CHROMELESS_ROUTES.has(location);

  return (
    <>
      {!isChromeless && <Navbar />}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/agents/:id" component={AgentDetails} />
        <Route path="/dashboard">
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        </Route>
        <Route path="/create-agent">
          <RequireAuth>
            <CreateAgent />
          </RequireAuth>
        </Route>
        <Route path="/chat">
          <RequireAuth>
            <Chat />
          </RequireAuth>
        </Route>
        <Route path="/marketplace" component={MarketplaceWorld} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/account" component={Account} />
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/about" component={About} />
        <Route path="/blog" component={Blog} />
        <Route path="/careers" component={Careers} />
        <Route path="/contact" component={Contact} />
        <Route path="/status" component={Status} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/security" component={Security} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

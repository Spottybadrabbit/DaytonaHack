import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import type { WildAgent } from "@/lib/agents";
// The same Three.js scene also ships as a standalone prototype in this branch.
// @ts-expect-error Shared JavaScript scene has no declaration file yet.
import { createMeadow } from "../../../agent-marketplace-world/src/meadow.js";
import "./marketplace-world.css";

type Encounter = {
  title: string;
  detail: string;
  meta: { industry?: string; badges?: string[]; locked?: boolean };
};

const initialEncounter: Encounter = {
  title: "Explore the living marketplace",
  detail: "Move closer to a resident agent to overhear what it is working on.",
  meta: { locked: true },
};

export default function MarketplaceWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<{ setAuthenticated: (value: boolean) => void } | null>(null);
  const { isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const [encounter, setEncounter] = useState<Encounter>(initialEncounter);
  const [hasEncounter, setHasEncounter] = useState(false);
  const [agentCount, setAgentCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function mountWorld() {
      let listings: WildAgent[] = [];
      try {
        const response = await fetch("/api/agents");
        if (response.ok) listings = await response.json();
      } catch {
        // The scene has resident fallbacks so an API outage never makes /marketplace blank.
      }
      if (!mounted || !canvasRef.current) return;
      setAgentCount(listings.length);
      const world = createMeadow(canvasRef.current, (next: Encounter) => {
        if (!mounted) return;
        setEncounter(next);
        setHasEncounter(!next.title.startsWith("Explore"));
      }, listings);
      worldRef.current = world;
      world.setAuthenticated(Boolean(isSignedIn));
    }
    mountWorld();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    worldRef.current?.setAuthenticated(Boolean(isSignedIn));
  }, [isSignedIn]);

  const launch = () => navigate(isSignedIn ? "/create-agent" : "/sign-in");

  return (
    <main className="marketplace-world">
      <canvas ref={canvasRef} className="marketplace-world__canvas" aria-label="Interactive 3D agent marketplace" />

      <header className="marketplace-world__topbar">
        <a className="marketplace-world__brand" href="/">
          <i /> Wildlings <span>AGENT MARKETPLACE</span>
        </a>
        <div className="marketplace-world__actions">
          <button className="marketplace-world__guest" onClick={() => navigate(isSignedIn ? "/dashboard" : "/sign-in")}>
            {isSignedIn ? "Founder view" : "Guest"}
          </button>
          <button className="marketplace-world__launch" onClick={launch}>Launch an agent <b>↗</b></button>
        </div>
      </header>

      <section className="marketplace-world__hero">
        <p>THE LIVE MARKETPLACE FOR AUTONOMOUS AGENTS</p>
        <h1>Meet the agents<br /><em>already at work.</em></h1>
        <button onClick={launch}>Bring an agent to life <b>→</b></button>
      </section>

      {hasEncounter && (
        <section className="marketplace-world__dialogue" aria-live="polite">
          <span>{encounter.title}</span>
          <p>“{encounter.detail}”</p>
          <small>{isSignedIn ? "Founder view · full record unlocked" : "Guest preview · sign in for the full record"}</small>
        </section>
      )}

      {hasEncounter && isSignedIn && (
        <aside className="marketplace-world__passport">
          <span>AGENT RECORD</span>
          <strong>{encounter.meta.industry || "Marketplace agent"}</strong>
          <div>{(encounter.meta.badges || []).slice(0, 3).map((badge) => <b key={badge}>{badge}</b>)}</div>
        </aside>
      )}

      <div className="marketplace-world__status">
        <i /> {agentCount || 12} agents live in the world
      </div>
      <div className="marketplace-world__hint">WASD / ARROWS to explore · ENTER to inspect</div>
    </main>
  );
}

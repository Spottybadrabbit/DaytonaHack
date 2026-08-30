import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";
import { useReveal } from "./use-reveal";

const pillars = [
  {
    number: "01",
    title: "The marketplace",
    description:
      "A curated catalog of autonomous agents built by developers and teams worldwide, each one benchmarked on completed tasks — not marketing copy.",
  },
  {
    number: "02",
    title: "The runtime",
    description:
      "A sandboxed execution environment where agents run continuously, hold state across steps, and get billed by the outcome, not the token.",
  },
  {
    number: "03",
    title: "The trust layer",
    description:
      "Full audit trails, encrypted execution, and a permission model that keeps every agent strictly inside the boundary you set for it.",
  },
];

const values = [
  {
    number: "01",
    title: "Autonomy by default",
    description:
      "We build the company the way we build agents: give a capable system a clear objective and get out of the way.",
  },
  {
    number: "02",
    title: "Evidence over hype",
    description:
      "An agent's reputation is its completion rate, not its demo reel. We measure everything and publish what we find.",
  },
  {
    number: "03",
    title: "Boring reliability",
    description:
      "The most impressive thing an agent can do is run at 3 a.m. with no one watching. We optimize for that, not for applause.",
  },
  {
    number: "04",
    title: "Small team, wide reach",
    description:
      "We stay deliberately small and let our agents — and the agents our customers deploy — do the scaling instead.",
  },
];

function MissionSection() {
  const { ref, isVisible } = useReveal<HTMLElement>();

  return (
    <section ref={ref} className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div
            className={`lg:col-span-7 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Eyebrow>Our thesis</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-display tracking-tight leading-[1.05] mb-8">
              Agents as workforce
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed max-w-xl">
              <p>
                For fifty years, software has been a tool: something a person picks up, uses, and
                puts down. An agent is different. Point it at an objective — scrape a market,
                reconcile an invoice, triage a support queue — and it plans, acts, checks its own
                work, and reports back. No one sits with it. No one needs to.
              </p>
              <p>
                That shift changes what a team is capable of with the same headcount. It isn't
                automation in the old sense of replacing a single repetitive click. It's
                delegation: handing over a whole outcome to something that can reason about how to
                get there.
              </p>
              <p>
                We built Agents in the Wild because that shift needs infrastructure — a place to
                discover capable agents, run them safely, and pay for the results they produce
                instead of the hours they occupy.
              </p>
            </div>
          </div>

          <div
            className={`lg:col-span-5 transition-all duration-1000 delay-150 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src="/images/bridge.png"
              alt="Two trees connected by glowing arcs, standing in for the link between human intent and autonomous execution"
              className="w-full h-full max-h-[420px] object-contain object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarsSection() {
  const { ref, isVisible } = useReveal<HTMLElement>();

  return (
    <section ref={ref} className="relative py-16 lg:py-24 bg-[oklch(0.09_0.008_260)] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Eyebrow>What we're building</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-display tracking-tight leading-[1.05] max-w-2xl">
            Three parts, one bet on autonomous software.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.number}
              className={`p-8 lg:p-10 border border-foreground/10 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <span className="font-mono text-xs text-muted-foreground">{pillar.number}</span>
              <h3 className="text-2xl font-display mt-3 mb-3">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValuesSection() {
  const { ref, isVisible } = useReveal<HTMLElement>();

  return (
    <section ref={ref} className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Eyebrow>How we work</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-display tracking-tight leading-[1.05] max-w-2xl">
            Values, not a poster on the wall.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {values.map((value, index) => (
            <div
              key={value.number}
              className={`flex gap-6 py-8 border-t border-foreground/10 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <span className="font-display text-3xl text-muted-foreground/50 shrink-0 w-12">
                {value.number}
              </span>
              <div>
                <h3 className="text-xl font-display mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingSection() {
  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <Reveal className="border-t border-foreground/10 pt-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <h2 className="text-3xl md:text-4xl font-display tracking-tight max-w-lg">
            Curious what a fully-delegated week looks like?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-all group"
            >
              Browse the marketplace
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 transition-all"
            >
              See open roles
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function About() {
  return (
    <PageShell>
      <section className="relative pt-20 pb-8 lg:pt-28 lg:pb-12 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal>
            <Eyebrow>About Agents in the Wild</Eyebrow>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] max-w-4xl mb-8">
              We're building the <span className="text-stroke">workforce</span> for an autonomous
              internet.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Agents in the Wild is a marketplace and runtime for autonomous AI agents — software
              that doesn't wait for instructions between steps. We believe the next decade of
              software isn't chatbots that answer questions. It's workers that finish jobs.
            </p>
          </Reveal>
        </div>
      </section>

      <MissionSection />
      <PillarsSection />
      <ValuesSection />
      <ClosingSection />
    </PageShell>
  );
}

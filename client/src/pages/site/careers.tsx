import { Mail } from "lucide-react";
import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";
import { useReveal } from "./use-reveal";

const roles = [
  {
    title: "Senior Agent Runtime Engineer",
    location: "Remote",
    team: "Runtime",
    blurb:
      "Own the sandboxed execution environment every agent on the marketplace runs inside. You'll work on isolation, scheduling, and the permission model that keeps agents inside their lane.",
  },
  {
    title: "Founding Product Designer",
    location: "Remote",
    team: "Design",
    blurb:
      "Shape how a marketplace of autonomous software should look and feel, before most of the industry has settled on an answer. You'll design the dashboard, agent pages, and onboarding flow.",
  },
  {
    title: "Marketplace Trust & Safety Lead",
    location: "Remote",
    team: "Trust & Safety",
    blurb:
      "Build and run the review process that decides which agents earn a place in the marketplace. You'll define what 'production-ready' means for autonomous software.",
  },
  {
    title: "Developer Relations Engineer",
    location: "Remote",
    team: "Developer Experience",
    blurb:
      "Help developers ship their first agent in an afternoon. You'll write docs, build sample agents, and be the loudest advocate for the SDK inside the company.",
  },
  {
    title: "Full-Stack Engineer, Billing & Usage",
    location: "Remote",
    team: "Platform",
    blurb:
      "Design the metering system that bills by completed task, not by token or hour. You'll work across the runtime, the dashboard, and Clerk-based subscription billing.",
  },
];

const culture = [
  {
    number: "01",
    title: "Remote-first, async by default",
    description: "No headquarters, no mandatory hours. We hire the best person for the role, wherever they work.",
  },
  {
    number: "02",
    title: "Small team, high leverage",
    description: "We stay deliberately lean and let agents — ours and our customers' — absorb the scale.",
  },
  {
    number: "03",
    title: "Ship in public",
    description: "Our roadmap, our incident history, and most of our engineering decisions are visible by default.",
  },
  {
    number: "04",
    title: "Transparent compensation",
    description: "Published bands by level and location, and equity for every full-time hire from day one.",
  },
];

function RoleRow({ role, index }: { role: (typeof roles)[number]; index: number }) {
  const { ref, isVisible } = useReveal<HTMLDivElement>();
  const mailto = `mailto:careers@agentsinthewild.ai?subject=${encodeURIComponent(
    `Application: ${role.title}`
  )}`;

  return (
    <div
      ref={ref}
      className={`grid md:grid-cols-12 gap-4 md:gap-8 py-8 border-t border-foreground/10 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="md:col-span-5">
        <h3 className="text-xl font-display mb-2">{role.title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-widest">
          <span>{role.location}</span>
          <span className="w-1 h-1 rounded-full bg-foreground/30" />
          <span>{role.team}</span>
        </div>
      </div>
      <p className="md:col-span-5 text-sm text-muted-foreground leading-relaxed">{role.blurb}</p>
      <div className="md:col-span-2 flex md:justify-end items-start">
        <a
          href={mailto}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 transition-all whitespace-nowrap"
        >
          Apply
        </a>
      </div>
    </div>
  );
}

export default function Careers() {
  return (
    <PageShell>
      <section className="relative pt-20 pb-12 lg:pt-28 lg:pb-16 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal>
            <Eyebrow>Careers</Eyebrow>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] max-w-3xl mb-8">
              Build the team that builds the <span className="text-stroke">workers.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              We're a small, remote-first team working on the infrastructure for autonomous
              software. If you'd rather ship something that runs without you than build another
              feature that needs babysitting, we should talk.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative py-16 lg:py-20 bg-[oklch(0.09_0.008_260)] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal className="mb-16">
            <Eyebrow>How we work</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-display tracking-tight leading-[1.05] max-w-2xl">
              Culture, in practice.
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {culture.map((item, index) => (
              <Reveal key={item.number} delay={index * 80} className="flex gap-6 py-6 border-t border-foreground/10">
                <span className="font-display text-3xl text-muted-foreground/50 shrink-0 w-12">
                  {item.number}
                </span>
                <div>
                  <h3 className="text-lg font-display mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal className="mb-4">
            <Eyebrow>Open roles</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-display tracking-tight leading-[1.05] max-w-2xl">
              5 positions, all remote.
            </h2>
          </Reveal>

          <div>
            {roles.map((role, index) => (
              <RoleRow key={role.title} role={role} index={index} />
            ))}
            <div className="border-t border-foreground/10" />
          </div>
        </div>
      </section>

      <section className="relative pb-24 lg:pb-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal className="border border-foreground/10 p-8 lg:p-12 flex flex-col lg:flex-row lg:items-center gap-8 justify-between">
            <div>
              <h2 className="text-2xl lg:text-3xl font-display mb-3">Don't see your role?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                We're small enough that a great generalist can outrank a job description. Tell us
                what you'd want to build.
              </p>
            </div>
            <a
              href="mailto:careers@agentsinthewild.ai?subject=General%20inquiry"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-all shrink-0"
            >
              <Mail className="w-4 h-4" />
              careers@agentsinthewild.ai
            </a>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

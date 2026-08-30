import { Shield, Lock, Eye, FileCheck } from "lucide-react";
import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";
import { LegalSection } from "./legal-section";

const pillars = [
  {
    icon: Shield,
    title: "Isolated execution",
    description: "Every agent runs in its own disposable sandbox, torn down when the task ends.",
  },
  {
    icon: Lock,
    title: "Encrypted everywhere",
    description: "Data is encrypted in transit with TLS 1.3 and at rest with AES-256.",
  },
  {
    icon: Eye,
    title: "Full audit trails",
    description: "Every action an agent takes is logged, timestamped, and inspectable.",
  },
  {
    icon: FileCheck,
    title: "Least privilege",
    description: "Agents only ever hold the permissions you explicitly grant them.",
  },
];

const certifications = ["SOC 2 Type II", "ISO 27001", "HIPAA-aligned", "GDPR & UK GDPR"];

export default function Security() {
  return (
    <PageShell>
      <section className="relative pt-20 pb-8 lg:pt-28 lg:pb-12 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <Reveal className="lg:col-span-7">
              <Eyebrow>Security</Eyebrow>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] mb-8">
                Autonomy, <span className="text-stroke">contained.</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                An agent that can act on its own only earns that trust inside a boundary it cannot
                cross. Here's how we build, enforce, and audit that boundary — and how to reach us
                if you find a crack in it.
              </p>
            </Reveal>
            <Reveal delay={150} className="lg:col-span-5 hidden lg:block">
              <img
                src="/images/shield.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full max-h-[320px] object-contain object-center"
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative py-16 lg:py-20 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((pillar, index) => (
              <Reveal
                key={pillar.title}
                delay={index * 80}
                className="p-8 border border-foreground/10"
              >
                <pillar.icon className="w-6 h-6 text-[#eca8d6] mb-6" />
                <h3 className="font-display text-xl mb-2">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
              </Reveal>
            ))}
          </div>

          <Reveal
            delay={320}
            className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 p-6 border border-foreground/10 text-sm text-muted-foreground"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-foreground">
              Certifications
            </span>
            {certifications.map((cert) => (
              <span key={cert} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#eca8d6]" />
                {cert}
              </span>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="relative pb-24 lg:pb-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <LegalSection number="01" title="Encryption">
            <p>
              All traffic to and from the Service travels over TLS 1.3. Data at rest — including
              account data, agent configuration, and execution logs — is encrypted with AES-256.
              Encryption keys are managed separately from the data they protect and rotated on a
              fixed schedule.
            </p>
          </LegalSection>

          <LegalSection number="02" title="Agent sandbox isolation">
            <p>
              Each task run gets its own ephemeral, disposable sandbox with no persistent state
              between runs unless you explicitly configure storage for it. Sandboxes are network-
              isolated from each other and from our internal infrastructure, so one agent's run
              can't observe or interfere with another customer's.
            </p>
            <p>
              A runaway or misbehaving task is terminated automatically — our scheduler enforces
              hard time and resource ceilings per run, with a kill switch that ends execution in
              under 200ms once a limit is crossed.
            </p>
          </LegalSection>

          <LegalSection number="03" title="Permission model">
            <p>
              Agents operate under explicit, scoped grants rather than ambient access. When you
              deploy an agent, you decide what it can reach: which API keys it holds, whether it
              can make outbound network calls, and whether there's a spend cap on any billed
              actions it takes. An agent with no grant for a capability simply cannot use it —
              there's no implicit escalation path.
            </p>
          </LegalSection>

          <LegalSection number="04" title="Infrastructure & hosting">
            <p>
              The Service runs on Vercel's edge network with regional failover, so no single
              region outage takes the platform down. Execution infrastructure is provisioned
              per-run rather than long-lived, which limits the blast radius of any single
              compromised dependency.
            </p>
          </LegalSection>

          <LegalSection number="05" title="Compliance">
            <p>
              Agents in the Wild is SOC 2 Type II audited and ISO 27001 certified, and our controls
              are aligned with HIPAA and GDPR / UK GDPR requirements for customers running
              regulated workloads. Audit reports are available under NDA — request one at{" "}
              <a
                href="mailto:security@agentsinthewild.ai"
                className="underline underline-offset-4 hover:text-foreground"
              >
                security@agentsinthewild.ai
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection number="06" title="Responsible disclosure">
            <p>
              If you believe you've found a security vulnerability in the Service, tell us before
              telling anyone else. Email{" "}
              <a
                href="mailto:security@agentsinthewild.ai"
                className="underline underline-offset-4 hover:text-foreground"
              >
                security@agentsinthewild.ai
              </a>{" "}
              with enough detail to reproduce the issue. We acknowledge reports within 24 hours,
              aim to triage within 3 business days, and won't pursue legal action against
              good-faith research that stays within this scope and doesn't access or exfiltrate
              other customers' data.
            </p>
          </LegalSection>
        </div>
      </section>
    </PageShell>
  );
}

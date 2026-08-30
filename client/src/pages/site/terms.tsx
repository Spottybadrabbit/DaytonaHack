import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";
import { LegalSection } from "./legal-section";

export default function Terms() {
  return (
    <PageShell>
      <section className="relative pt-20 pb-8 lg:pt-28 lg:pb-12 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal>
            <Eyebrow>Legal</Eyebrow>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] max-w-3xl mb-6">
              Terms of Service
            </h1>
            <p className="text-sm font-mono text-muted-foreground mb-6">
              Last updated: January 12, 2026
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              These terms govern your use of Agents in the Wild — the marketplace, the runtime,
              and every agent you create, publish, buy, or deploy through it. By creating an
              account or running an agent, you agree to them.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative pb-24 lg:pb-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <LegalSection number="01" title="Agreement to terms">
            <p>
              These Terms of Service form a binding agreement between you (or the organization you
              represent) and Agents in the Wild. If you don't agree to them, don't create an
              account or use the Service.
            </p>
          </LegalSection>

          <LegalSection number="02" title="Accounts & eligibility">
            <p>
              You must be at least 18 years old and able to form a binding contract to create an
              account. You're responsible for the accuracy of your account information and for
              all activity — human or agent-initiated — that happens under it, including API keys
              and access tokens issued to your organization.
            </p>
            <p>
              Authentication and session management are handled by our provider, Clerk. Keep your
              credentials confidential and tell us immediately if you suspect unauthorized access.
            </p>
          </LegalSection>

          <LegalSection number="03" title="Acceptable use of agents">
            <p>
              An agent you deploy must operate within the law and within the terms of any
              third-party service it touches. Without limiting that, you may not use the Service
              to build or run an agent that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Circumvents rate limits, paywalls, or access controls of a third-party site
                in violation of that site's terms.</li>
              <li>Scrapes or processes personal data without a lawful basis to do so.</li>
              <li>Sends unsolicited bulk communications, or automates harassment or fraud.</li>
              <li>Attempts to compromise the isolation of the sandbox it runs in, or another
                customer's agent, data, or credentials.</li>
              <li>Generates malware, or payloads intended to damage systems it interacts with.</li>
            </ul>
            <p>
              We may suspend or terminate an agent that violates this section, with notice where
              practical and without notice where we reasonably believe delay would cause harm.
            </p>
          </LegalSection>

          <LegalSection number="04" title="Marketplace transactions">
            <p>
              Developers may publish agents to the marketplace for other users to run. When you
              publish a paid agent, you set its price and grant buyers a license to run it subject
              to any limits you configure; we take a platform fee on marketplace transactions,
              disclosed at the time of listing.
            </p>
            <p>
              When you buy or run a third-party agent, you're responsible for reviewing what it
              does and what data it accesses before you grant it permissions. We review listed
              agents for baseline safety, but a marketplace listing is not our endorsement of
              fitness for your specific use case. Refunds for marketplace purchases follow the
              policy stated on the individual listing, or our default 14-day window where none is
              stated.
            </p>
          </LegalSection>

          <LegalSection number="05" title="Subscription billing">
            <p>
              Paid plans are billed in advance on a monthly or annual cycle through our billing
              partner, Clerk, and its underlying payment processor. Subscriptions renew
              automatically at the then-current price unless cancelled before the renewal date.
              Usage-based charges (for example, task volume above your plan's included quota) are
              billed in arrears at the end of the billing period.
            </p>
            <p>
              You can cancel or change your plan at any time from your dashboard; cancellation
              takes effect at the end of the current billing period, and we don't provide partial
              refunds for unused time except where required by law.
            </p>
          </LegalSection>

          <LegalSection number="06" title="Intellectual property">
            <p>
              You retain ownership of the agents you build and the content you submit to the
              Service. You grant us a limited license to host, run, and display that content as
              needed to operate the Service — including running your agent in a sandbox and
              showing its listing to marketplace buyers, if you choose to publish it.
            </p>
            <p>
              The Agents in the Wild name, marks, and platform code are our property. Nothing here
              grants you rights to them beyond what's needed to use the Service as intended.
            </p>
          </LegalSection>

          <LegalSection number="07" title="Disclaimers & limitation of liability">
            <p>
              The Service, and any agent obtained through the marketplace, is provided "as is."
              Agents act autonomously within the permissions and instructions you give them, and
              we don't guarantee that any specific agent will produce a correct, complete, or
              lawful result for your use case — you're responsible for reviewing outputs before
              relying on them.
            </p>
            <p>
              To the maximum extent permitted by law, Agents in the Wild is not liable for indirect,
              incidental, or consequential damages, and our total liability for any claim arising
              from the Service is limited to the amount you paid us in the twelve months before
              the claim arose.
            </p>
          </LegalSection>

          <LegalSection number="08" title="Indemnification">
            <p>
              You agree to indemnify and hold us harmless from claims arising out of an agent you
              built, published, or configured — including claims that it violated a third party's
              rights or a third-party service's terms — except to the extent the claim arises from
              our own breach of these terms.
            </p>
          </LegalSection>

          <LegalSection number="09" title="Termination">
            <p>
              You may close your account at any time. We may suspend or terminate access for
              breach of these terms, non-payment, or conduct that creates risk or legal exposure
              for us or other users. On termination, running agents are stopped and execution data
              is retained or deleted per our{" "}
              <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection number="10" title="Governing law">
            <p>
              These terms are governed by the laws of the State of Delaware, without regard to
              conflict-of-law principles, without prejudice to any mandatory consumer-protection
              rights you have in your place of residence.
            </p>
          </LegalSection>

          <LegalSection number="11" title="Changes to these terms">
            <p>
              We may update these terms as the Service evolves. We'll post the updated version
              here with a new "Last updated" date and, for material changes, notify account owners
              by email in advance of the change taking effect.
            </p>
          </LegalSection>

          <LegalSection number="12" title="Contact">
            <p>
              Questions about these terms can be sent to{" "}
              <a
                href="mailto:legal@agentsinthewild.ai"
                className="underline underline-offset-4 hover:text-foreground"
              >
                legal@agentsinthewild.ai
              </a>
              .
            </p>
          </LegalSection>
        </div>
      </section>
    </PageShell>
  );
}

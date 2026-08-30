import { useState, type FormEvent } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";

const channels = [
  {
    number: "01",
    title: "Sales",
    email: "sales@agentsinthewild.ai",
    description:
      "Evaluating the platform for your team? Let's talk deployment shape, security review, or enterprise pricing.",
  },
  {
    number: "02",
    title: "Support",
    email: "support@agentsinthewild.ai",
    description:
      "Already running agents in production and something needs attention? Our team responds within one business day.",
  },
  {
    number: "03",
    title: "Press",
    email: "press@agentsinthewild.ai",
    description:
      "Writing about autonomous agents, the marketplace, or the industry? We're happy to go on record.",
  },
];

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${name || "the contact page"}`);
    const body = encodeURIComponent(
      `${message}\n\n—\n${name}\n${email}`
    );
    window.location.href = `mailto:support@agentsinthewild.ai?subject=${subject}&body=${body}`;
  };

  return (
    <PageShell>
      <section className="relative pt-20 pb-12 lg:pt-28 lg:pb-16 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal>
            <Eyebrow>Contact</Eyebrow>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] max-w-3xl mb-8">
              Talk to a human. Or deploy an <span className="text-stroke">agent</span> to do it for
              you.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              We're a distributed team — no headquarters, and our agents don't need one either.
              Reach the right desk below, or send a message and we'll route it ourselves.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative pb-16 lg:pb-20 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-4">
            {channels.map((channel, index) => (
              <Reveal
                key={channel.title}
                delay={index * 80}
                className="p-8 border border-foreground/10 hover:border-foreground/30 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground">{channel.number}</span>
                <h2 className="text-2xl font-display mt-3 mb-3">{channel.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {channel.description}
                </p>
                <a
                  href={`mailto:${channel.email}`}
                  className="inline-flex items-center gap-2 text-sm text-foreground hover:text-[#eca8d6] transition-colors group"
                >
                  <Mail className="w-4 h-4" />
                  {channel.email}
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative pb-24 lg:pb-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal className="border border-foreground/10 p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <Eyebrow>Send a message</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-display tracking-tight mb-6">
                  No ticket queue. Just email, opened in your own client.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  This form doesn't post anywhere — submitting it opens a pre-filled email to our
                  support desk from your own mail app, so nothing you write passes through a
                  server you can't see.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ada@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What are you trying to get an agent to do?"
                    rows={5}
                    required
                  />
                </div>
                <Button type="submit" className="rounded-none w-full sm:w-auto group">
                  Open email to send
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

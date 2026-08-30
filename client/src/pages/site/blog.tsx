import { ArrowUpRight } from "lucide-react";
import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";

const posts = [
  {
    category: "Product",
    title: "Why we stopped measuring agents in tokens",
    date: "Feb 4, 2026",
    readTime: "6 min read",
    excerpt:
      "Token counts tell you what a model costs to run. They tell you nothing about whether the job got done. Here's how we redesigned billing around completed tasks instead.",
  },
  {
    category: "Engineering",
    title: "Inside the sandbox: how agent isolation actually works",
    date: "Mar 11, 2026",
    readTime: "8 min read",
    excerpt:
      "Every agent on the marketplace runs in its own disposable environment. We open up the internals — namespaces, egress rules, and the kill switch that ends a runaway job in under 200ms.",
  },
  {
    category: "Marketplace",
    title: "The 3 a.m. test: what we look for before promoting an agent",
    date: "Apr 8, 2026",
    readTime: "5 min read",
    excerpt:
      "Anyone can build a demo that works once, in daylight, with someone watching. Our review process is built around the one that runs unattended, at 3 a.m., for the hundredth time.",
  },
  {
    category: "Engineering",
    title: "Multi-agent orchestration is a distributed systems problem",
    date: "May 6, 2026",
    readTime: "9 min read",
    excerpt:
      "Coordinating a team of specialized agents looks like a prompting challenge until you scale past three of them. Then it's consensus, backpressure, and idempotency wearing a new coat.",
  },
  {
    category: "Research",
    title: "What 50,000 agent-hours taught us about failure",
    date: "Jun 2, 2026",
    readTime: "7 min read",
    excerpt:
      "We pulled every failed task run from Q1 and looked for patterns. Most failures weren't the model's fault — they were missing permissions, ambiguous objectives, or a human changing the goal mid-run.",
  },
  {
    category: "Product",
    title: "Delegation is a design problem, not a prompting trick",
    date: "Jul 9, 2026",
    readTime: "6 min read",
    excerpt:
      "The best agent briefs read less like prompts and more like job descriptions: a clear mandate, explicit boundaries, and a definition of done. We rebuilt our onboarding flow around that idea.",
  },
];

export default function Blog() {
  return (
    <PageShell>
      <section className="relative pt-20 pb-12 lg:pt-28 lg:pb-16 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal>
            <Eyebrow>Journal</Eyebrow>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] max-w-3xl mb-8">
              Notes from the <span className="text-stroke">field.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Engineering deep-dives, marketplace research, and the occasional argument about what
              "autonomous" should actually mean — written by the people building it.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative pb-24 lg:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post, index) => (
              <Reveal key={post.title} delay={index * 60}>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group flex flex-col h-full p-8 border border-foreground/10 hover:border-foreground/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      {post.category}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{post.readTime}</span>
                  </div>

                  <h2 className="text-2xl font-display leading-tight mb-4 group-hover:text-[#eca8d6] transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-1">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-foreground/10">
                    <span className="text-xs font-mono text-muted-foreground">{post.date}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground" />
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

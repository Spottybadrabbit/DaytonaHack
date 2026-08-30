import { PageShell } from "./page-shell";
import { Eyebrow } from "./eyebrow";
import { Reveal } from "./reveal";
import { useReveal } from "./use-reveal";

type DayState = "operational" | "degraded";

/**
 * 90-day uptime ticks, hardcoded per service (no Math.random at render —
 * these are fixed literal arrays so the bars never flicker between renders).
 * Index 0 = 90 days ago, index 89 = today.
 */
function buildDays(incidentDays: number[]): DayState[] {
  return Array.from({ length: 90 }, (_, i) => (incidentDays.includes(i) ? "degraded" : "operational"));
}

const services = [
  {
    name: "API",
    description: "REST + streaming endpoints for agent control",
    days: buildDays([56]),
  },
  {
    name: "Marketplace",
    description: "Discovery, listings, and agent publishing",
    days: buildDays([]),
  },
  {
    name: "Agent Runtime",
    description: "Sandboxed execution for every running task",
    days: buildDays([19, 63]),
  },
  {
    name: "Webhooks",
    description: "Outbound event delivery for task completions",
    days: buildDays([71]),
  },
  {
    name: "Dashboard",
    description: "Account, billing, and monitoring surface",
    days: buildDays([]),
  },
] as const;

function uptimePercent(days: readonly DayState[]) {
  const operational = days.filter((d) => d === "operational").length;
  return ((operational / days.length) * 100).toFixed(2);
}

const incidents = [
  {
    date: "May 26, 2026",
    service: "API",
    title: "Elevated latency during a routine failover test",
    detail:
      "p95 latency rose by roughly 180ms for 11 minutes during a scheduled failover drill. No customer-facing errors were recorded.",
  },
  {
    date: "Apr 3, 2026",
    service: "Webhooks",
    title: "Delayed outbound delivery",
    detail:
      "Task-completion webhooks were delayed by up to 4 minutes while a downstream queue drained. Resolved by adding a redundant delivery path.",
  },
  {
    date: "Feb 18, 2026",
    service: "Agent Runtime",
    title: "Partial degradation in EU-West",
    detail:
      "Scheduler resource contention during a traffic spike caused slower task pickup for 22 minutes in one region. Capacity headroom was increased afterward.",
  },
];

function ServiceRow({ service, index }: { service: (typeof services)[number]; index: number }) {
  const { ref, isVisible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`py-8 border-t border-foreground/10 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#eca8d6]" aria-hidden="true" />
          <div>
            <h3 className="font-display text-xl">{service.name}</h3>
            <p className="text-xs text-muted-foreground">{service.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#eca8d6]">Operational</span>
          <span className="text-muted-foreground">{uptimePercent(service.days)}% / 90d</span>
        </div>
      </div>

      <div className="flex gap-[2px] h-8" role="img" aria-label={`${service.name} uptime for the last 90 days`}>
        {service.days.map((day, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`flex-1 rounded-[1px] ${day === "operational" ? "bg-[#eca8d6]/40" : "bg-amber-400/70"}`}
            title={day === "operational" ? "Operational" : "Degraded"}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] font-mono text-muted-foreground/60">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export default function Status() {
  const { ref: bannerRef, isVisible: bannerVisible } = useReveal<HTMLDivElement>();

  return (
    <PageShell>
      <section className="relative pt-20 pb-8 lg:pt-28 lg:pb-12 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal>
            <Eyebrow>Status</Eyebrow>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95] max-w-3xl">
              All systems <span className="text-stroke">operational.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="relative pb-12 lg:pb-16 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div
            ref={bannerRef}
            className={`border border-foreground/10 p-8 lg:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-700 ${
              bannerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#eca8d6] opacity-50" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#eca8d6]" />
              </span>
              <span className="text-lg font-medium">All agents operational</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Every service below is healthy — updated continuously
            </span>
          </div>
        </div>
      </section>

      <section className="relative pb-16 lg:pb-20 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal className="mb-4">
            <Eyebrow>Services</Eyebrow>
          </Reveal>
          <div>
            {services.map((service, index) => (
              <ServiceRow key={service.name} service={service} index={index} />
            ))}
            <div className="border-t border-foreground/10" />
          </div>
        </div>
      </section>

      <section className="relative pb-24 lg:pb-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <Reveal className="mb-12">
            <Eyebrow>Past incidents</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-display tracking-tight max-w-xl">
              Nothing hidden, nothing dressed up.
            </h2>
          </Reveal>

          <div className="space-y-4">
            {incidents.map((incident, index) => (
              <Reveal
                key={incident.title}
                delay={index * 80}
                className="grid md:grid-cols-12 gap-4 md:gap-8 p-6 lg:p-8 border border-foreground/10"
              >
                <div className="md:col-span-3">
                  <span className="text-xs font-mono text-muted-foreground block">{incident.date}</span>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#eca8d6]">
                    {incident.service}
                  </span>
                </div>
                <div className="md:col-span-9">
                  <h3 className="font-display text-lg mb-2">{incident.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{incident.detail}</p>
                  <span className="inline-block mt-3 text-xs font-mono text-muted-foreground">
                    Resolved
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

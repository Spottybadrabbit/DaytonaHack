import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

const STEPS = [
  {
    n: '01',
    title: 'Describe it',
    body: 'Name a Development agent and write the brief in plain English. No scaffolding, no boilerplate.',
  },
  {
    n: '02',
    title: 'Release it',
    body: 'Claude Code wakes inside a fresh Daytona sandbox with file tools only — no shell, no web, no subagents.',
  },
  {
    n: '03',
    title: 'Share it',
    body: 'The sandbox exposes one public preview port. The agent flips to published and the URL lands on its card.',
  },
]

const GUARANTEES = [
  ['Isolated by default', 'Every agent runs in its own disposable sandbox, torn down when the task ends.'],
  ['Least privilege', 'Agents only ever hold the permissions you explicitly grant them.'],
  ['Fully inspectable', 'Every action an agent takes is logged, timestamped, and inspectable.'],
]

export function Landing() {
  return (
    <div className="pb-10">
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-wild/20 blur-[100px] animate-drift"
        />
        <div className="container-wild relative py-24 sm:py-32">
          <p className="eyebrow animate-fade-up">Field Lab · Daytona habitat</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] animate-fade-up sm:text-7xl">
            Raise something <em className="not-italic text-wild">wild</em>.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground animate-fade-up">
            Describe an app in plain English. Claude Code builds it inside an isolated Daytona sandbox, and
            Agents in the Wild publishes a live, shareable preview while Builder Bros tracks it in Supabase.
          </p>
          <div className="mt-9 flex flex-wrap gap-3 animate-fade-up">
            <Link to="/field-lab">
              <Button>Release into the wild</Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline">Browse the wilds</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container-wild grid gap-px overflow-hidden border-b border-border/70 bg-border/70 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="bg-background p-8">
            <span className="font-mono text-[11px] tracking-[0.2em] text-wild">{step.n}</span>
            <h2 className="mt-4 font-display text-2xl">{step.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="container-wild py-20">
        <h2 className="font-display text-3xl">Inside the sandbox</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          How agent isolation actually works, and what the builder is never allowed to do.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {GUARANTEES.map(([title, body]) => (
            <div key={title} className="panel p-6">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

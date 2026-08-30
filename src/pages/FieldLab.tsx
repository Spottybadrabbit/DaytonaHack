import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Panel, Spinner, TextArea, TextInput } from '@/components/ui'
import { useSession } from '@/lib/auth'
import { startBuild } from '@/lib/api'
import { BRIEF_MAX_LENGTH, HABITATS, NAME_MAX_LENGTH, SPECIES } from '@/lib/types'

const PLACEHOLDER =
  'A single-page tide chart for Cornish surf spots. Dark theme, one card per beach, a sparkline of the next 12 hours, and a filter for swell direction.'

export function FieldLab() {
  const navigate = useNavigate()
  const { isSignedIn, isLoaded, signIn, getToken } = useSession()

  const [name, setName] = useState('')
  const [species, setSpecies] = useState<string>(SPECIES[0])
  const [habitat, setHabitat] = useState<string>(HABITATS[0])
  const [brief, setBrief] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const briefTooLong = brief.length > BRIEF_MAX_LENGTH
  const canRelease = name.trim().length > 1 && brief.trim().length > 19 && !briefTooLong && !submitting

  async function onRelease(event: React.FormEvent) {
    event.preventDefault()
    if (!canRelease) return
    setSubmitting(true)
    setError(null)
    try {
      const { agentId } = await startBuild(
        { name: name.trim(), species, habitat, brief: brief.trim() },
        getToken,
      )
      navigate(`/agents/${agentId}?watch=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start the Daytona build.')
      setSubmitting(false)
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="container-wild py-24">
        <Panel className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-3xl">One last look before release</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Only signed-in researchers can start or inspect a build. Sign in to open the field lab.
          </p>
          <Button className="mt-6" onClick={() => signIn()}>
            Sign in to continue
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="container-wild py-16">
      <p className="eyebrow">Field Lab</p>
      <h1 className="mt-4 font-display text-4xl sm:text-5xl">Raise something wild</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Every agent starts here. Give it a name, teach it where to hunt, and release it into the wild to work
        for you. Claude Code will turn your brief into a public app inside an isolated Daytona sandbox.
      </p>

      <form onSubmit={onRelease} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="space-y-6">
          <Field label="Agent name">
            <TextInput
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tidewatcher"
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Species">
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full rounded border border-border bg-background/70 px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none"
              >
                {SPECIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Habitat">
              <select
                value={habitat}
                onChange={(e) => setHabitat(e.target.value)}
                className="w-full rounded border border-border bg-background/70 px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none"
              >
                {HABITATS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Build brief"
            hint={`Describe the app Claude Code should build and publish. ${brief.length}/${BRIEF_MAX_LENGTH}`}
          >
            <TextArea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={PLACEHOLDER}
            />
          </Field>

          {briefTooLong ? (
            <p className="text-sm text-destructive">
              The brief is longer than {BRIEF_MAX_LENGTH} characters. Trim it before releasing.
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canRelease}>
              {submitting ? <Spinner /> : null}
              {submitting ? 'Releasing…' : 'Release into the wild'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Returns immediately — the build keeps running in the sandbox.
            </span>
          </div>
        </Panel>

        <aside className="space-y-4">
          <Panel className="space-y-3">
            <p className="eyebrow">What the agent may do</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Read and write files in its own sandbox</li>
              <li>Emit static HTML, CSS, and JavaScript</li>
              <li>Serve one public preview port</li>
            </ul>
          </Panel>
          <Panel className="space-y-3">
            <p className="eyebrow">What is denied</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Bash and every shell tool</li>
              <li>Web fetch and web search</li>
              <li>Subagents and notebooks</li>
            </ul>
          </Panel>
        </aside>
      </form>
    </div>
  )
}

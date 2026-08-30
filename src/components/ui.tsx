import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40'
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-5 text-sm' }
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
    outline: 'border border-border bg-transparent text-foreground hover:bg-muted/60',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground',
  }
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('panel p-6', className)}>{children}</div>
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="eyebrow block">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

const controlClass =
  'w-full rounded border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:outline-none'

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlClass, 'min-h-[140px] resize-y leading-relaxed', className)} {...props} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent',
        className,
      )}
    />
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

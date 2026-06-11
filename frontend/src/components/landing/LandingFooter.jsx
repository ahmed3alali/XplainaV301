import { ClaripathLogo } from '@/components/ClaripathLogo'

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--landing-border)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-8">
        <div>
          <ClaripathLogo height={30} />
          <p className="mt-2 text-sm text-[var(--landing-muted)]">
            Course recommendations for CE and SE students.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-[var(--landing-muted)]">
          <a href="#model" className="transition-colors hover:text-[var(--landing-fg)]">
            The model
          </a>
          <a href="#team" className="transition-colors hover:text-[var(--landing-fg)]">
            Team
          </a>
          <a href="#credit" className="transition-colors hover:text-[var(--landing-fg)]">
            Credit
          </a>
          <a
            href="https://github.com/ahmed3alali/XplainaV301"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[var(--landing-fg)]"
          >
            GitHub
          </a>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-5 text-center text-xs text-[var(--landing-muted)] sm:px-8 sm:text-left">
        © {new Date().getFullYear()} Claripath. Built by SE students, for SE students.
      </p>
    </footer>
  )
}

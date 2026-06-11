'use client'

import { useSession } from '@/providers/AuthProvider'
import { LandingThemeProvider, useLandingTheme } from './LandingThemeProvider'
import { LandingNav } from './LandingNav'

export function AuthPageShell({ children }) {
  return (
    <LandingThemeProvider>
      <AuthPageShellInner>{children}</AuthPageShellInner>
    </LandingThemeProvider>
  )
}

function AuthPageShellInner({ children }) {
  const { status } = useSession()
  const { theme, mounted } = useLandingTheme()

  return (
    <div
      className="landing-page min-h-dvh bg-[var(--landing-bg)] text-[var(--landing-fg)]"
      data-theme={mounted ? theme : 'light'}
    >
      <LandingNav status={status} variant="auth" />
      <main className="flex min-h-[calc(100dvh-5.25rem)] flex-col items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}

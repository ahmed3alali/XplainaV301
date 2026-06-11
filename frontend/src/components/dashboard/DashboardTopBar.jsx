'use client'

import { useRouter } from 'next/navigation'
import { signOut, useSession } from '@/providers/AuthProvider'
import { Menu, LogOut, Home, RotateCcw, MessagesSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/landing/ThemeToggle'

export function DashboardTopBar({ onMenuClick }) {
  const router = useRouter()
  const { data: session } = useSession()
  const name = session?.user?.name || session?.user?.username || 'Student'
  const isDatasetUser = session?.user?.userType === 'dataset_user'

  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="app-icon-btn lg:hidden"
            aria-label="Open course panel"
          >
            <Menu className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-muted)]">
              Dashboard
            </p>
            <h1 className="landing-display truncate text-lg font-bold tracking-tight sm:text-xl">
              Hello, {name.split(' ')[0]}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {!isDatasetUser && (
            <button
              type="button"
              onClick={() => router.push('/select-courses')}
              className="app-action-btn hidden sm:inline-flex"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              Retake survey
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/mentor')}
            className="app-action-btn hidden md:inline-flex"
          >
            <MessagesSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
            Mentor
          </button>
          <button
            type="button"
            onClick={() => router.push('/?home=1')}
            className="app-icon-btn hidden sm:inline-flex"
            aria-label="Home"
            title="Home"
          >
            <Home className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="app-action-btn"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

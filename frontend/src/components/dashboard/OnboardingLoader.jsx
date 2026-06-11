'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClaripathLogo } from '@/components/ClaripathLogo'
import { useTheme } from '@/providers/ThemeProvider'

export const ONBOARDING_MESSAGES = [
  'Our AI model is reading your profile…',
  'We are matching you with students like you…',
  'Mapping your skills to the course catalog…',
  'Scoring electives with the Xplaina hybrid model…',
  'Building your personalized recommendations…',
  'Almost ready…',
]

export function OnboardingLoader({ message }) {
  const [mounted, setMounted] = useState(false)
  const { theme, mounted: themeMounted } = useTheme()

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <div
      className="app-shell fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[var(--landing-bg)] px-6"
      data-theme={themeMounted ? theme : 'light'}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, var(--landing-accent-soft), transparent 55%)',
        }}
      />

      <div className="relative flex max-w-md flex-col items-center text-center">
        <ClaripathLogo height={36} priority />

        <div className="mt-10 h-14 w-full">
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-base font-medium leading-relaxed text-[var(--landing-fg)] sm:text-lg"
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--landing-accent)]"
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-muted)]">
          Setting up your dashboard
        </p>
      </div>
    </div>,
    document.body
  )
}

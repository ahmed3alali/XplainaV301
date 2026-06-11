'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'

export function ThemeToggle({ className = '' }) {
  const { theme, setTheme, mounted } = useTheme()
  const reduce = useReducedMotion()
  const isDark = theme === 'dark'

  if (!mounted) {
    return (
      <div
        className={`landing-nav-icon-btn pointer-events-none opacity-40 ${className}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`landing-nav-icon-btn group ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <motion.span
        key={theme}
        initial={reduce ? false : { opacity: 0, rotate: -24, scale: 0.82 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="text-[var(--landing-muted)] transition-colors group-hover:text-[var(--landing-fg)]"
      >
        {isDark ? <Sun className="h-[15px] w-[15px]" strokeWidth={1.75} /> : <Moon className="h-[15px] w-[15px]" strokeWidth={1.75} />}
      </motion.span>
    </button>
  )
}

'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useLandingTheme } from './LandingThemeProvider'

export function LandingAmbient() {
  const { theme } = useLandingTheme()
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 600], [0, 100])
  const y2 = useTransform(scrollY, [0, 600], [0, -60])

  if (theme !== 'dark') return null

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        style={reduce ? undefined : { y: y1 }}
        className="absolute -left-32 top-[8%] h-[28rem] w-[28rem] rounded-full bg-[var(--landing-accent-glow)] blur-[110px]"
        animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={reduce ? undefined : { y: y2 }}
        className="absolute -right-24 top-[42%] h-80 w-80 rounded-full bg-[rgba(200,241,53,0.08)] blur-[90px]"
        animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      />
      <div className="landing-dark-grid absolute inset-0 opacity-40" />
      <div className="landing-grain absolute inset-0 opacity-[0.22]" />
    </div>
  )
}

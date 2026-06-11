'use client'

import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { RevealWords, BlurReveal } from './AnimatedText'

export function LandingCta({ status }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const isAuth = status === 'authenticated'

  return (
    <section className="landing-section pb-24 sm:pb-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[1.75rem] bg-[var(--landing-cta-bg)] px-6 py-14 text-center text-[var(--landing-cta-fg)] sm:px-12 sm:py-16"
        >
          <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[var(--landing-accent-glow)] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[var(--landing-accent-soft)] blur-3xl" />

          <h2 className="landing-display relative text-3xl font-bold sm:text-4xl md:text-5xl">
            <RevealWords text="Pick your next course with confidence" once />
          </h2>
          <BlurReveal
            className="relative mx-auto mt-4 max-w-lg text-base text-[var(--landing-cta-muted)]"
            delay={0.12}
          >
            Answer a few questions, review what the model thinks you have taken, and get recommendations you can explain.
          </BlurReveal>
          <motion.button
            type="button"
            onClick={() => router.push(isAuth ? '/dashboard' : '/login')}
            whileHover={reduce ? undefined : { scale: 1.03, y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="landing-btn relative mt-8 border border-[var(--landing-border)] bg-[var(--landing-bg)] text-[var(--landing-fg)] hover:bg-[var(--landing-surface)] group"
          >
            {isAuth ? 'Go to dashboard' : 'Start for free'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

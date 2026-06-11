'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Building2, GraduationCap } from 'lucide-react'
import { academicCredit } from '@/content/academic-credit'
import { fadeUp, stagger } from './motion'
import { RevealWords, BlurReveal, RevealChars } from './AnimatedText'

export function LandingAcademicCredit() {
  const reduce = useReducedMotion()

  return (
    <section
      id="credit"
      className="landing-section border-t border-[var(--landing-border)]"
      aria-labelledby="academic-credit-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <p className="landing-label text-[var(--landing-muted)]">
            <RevealChars text="Academic credit" once />
          </p>
          <h2
            id="academic-credit-heading"
            className="landing-display mt-3 max-w-2xl text-3xl font-bold sm:text-4xl"
          >
            <RevealWords text="Developed with our university and faculty" once delay={0.04} />
          </h2>
          <BlurReveal className="mt-5 max-w-xl text-base leading-relaxed text-[var(--landing-muted)]" delay={0.08}>
            {academicCredit.blurb}
          </BlurReveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <motion.article
              variants={fadeUp}
              whileHover={reduce ? undefined : { y: -4 }}
              className="landing-card flex gap-5 p-6 sm:p-7"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--landing-border)] bg-[var(--landing-accent-soft)] text-[var(--landing-accent)]">
                <Building2 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-muted)]">
                  University
                </p>
                <h3 className="landing-display mt-2 text-xl font-bold leading-snug">
                  {academicCredit.university.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
                  {academicCredit.university.department}
                </p>
                <p className="mt-4 text-sm text-[var(--landing-fg)]">{academicCredit.project}</p>
              </div>
            </motion.article>

            <motion.article
              variants={fadeUp}
              whileHover={reduce ? undefined : { y: -4 }}
              className="landing-card flex gap-5 p-6 sm:p-7"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--landing-border)] bg-[var(--landing-accent-soft)] text-[var(--landing-accent)]">
                <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-muted)]">
                  Faculty supervision
                </p>
                <h3 className="landing-display mt-2 text-xl font-bold leading-snug">
                  {academicCredit.supervisor.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
                  {academicCredit.supervisor.title}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--landing-fg)]">
                  Thank you for the guidance, feedback, and academic oversight that shaped this project from research
                  design through implementation.
                </p>
              </div>
            </motion.article>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { fadeUp, stagger } from './motion'
import { RevealWords, BlurReveal } from './AnimatedText'

const included = [
  'Course recommendations powered by Xplaina',
  'Skill preference questionnaire',
  'Completed-course review and next-step suggestions',
  'Plain-language explanation for every pick',
]

const comingSoon = [
  'Advisor collaboration workspace',
  'Multi-program catalog support',
  'Semester-by-semester path export',
]

export function LandingPricing({ status }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const isAuth = status === 'authenticated'

  return (
    <section id="plans" className="landing-section landing-section-alt border-t border-[var(--landing-border)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16"
        >
          <div>
            <h2 className="landing-display text-3xl font-bold sm:text-4xl">
              <RevealWords text="Free while we ship the core experience" once />
            </h2>
            <BlurReveal className="mt-5 max-w-md text-base leading-relaxed text-[var(--landing-muted)]">
              The course recommender is free for students today. More plans with advanced features are on the way.
            </BlurReveal>
          </div>

          <motion.div variants={fadeUp} className="landing-card p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--landing-border)] pb-6">
              <div>
                <p className="font-display text-2xl font-bold">Student</p>
                <p className="mt-1 text-sm text-[var(--landing-muted)]">Everything you need to pick your next courses</p>
              </div>
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
                className="font-display text-4xl font-bold"
              >
                $0
                <span className="ml-1 text-base font-medium text-[var(--landing-muted)]">/ now</span>
              </motion.p>
            </div>

            <ul className="mt-6 space-y-3">
              {included.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className="flex items-start gap-2.5 text-sm text-[var(--landing-fg)]"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--landing-accent)]" strokeWidth={1.75} />
                  {item}
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl bg-[var(--landing-bg)] p-4">
              <p className="landing-label text-[var(--landing-muted)]">Coming soon</p>
              <ul className="mt-3 space-y-2">
                {comingSoon.map((item) => (
                  <li key={item} className="text-sm text-[var(--landing-muted)]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <motion.button
              type="button"
              onClick={() => router.push(isAuth ? '/dashboard' : '/login')}
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="landing-btn landing-btn-primary mt-8 w-full"
            >
              {isAuth ? 'Go to dashboard' : 'Create free account'}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

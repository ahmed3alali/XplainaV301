'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, stagger } from './motion'
import { RevealWords, BlurReveal, ShimmerText } from './AnimatedText'

const reasons = [
  {
    course: 'CS 4820 · Machine Learning',
    why: 'Builds on your completed linear algebra and Python coursework while matching your stated AI track goal.',
  },
  {
    course: 'CS 4410 · Operating Systems',
    why: 'Closes a prerequisite gap before your final year and aligns with systems roles you selected.',
  },
]

export function LandingDifference() {
  const reduce = useReducedMotion()

  return (
    <section id="difference" className="landing-section landing-section-alt border-t border-[var(--landing-border)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20"
        >
          <div>
            <h2 className="landing-display text-3xl font-bold sm:text-4xl">
              <RevealWords text="Every recommendation comes with a reason" once />
            </h2>
            <BlurReveal className="mt-5 max-w-lg text-base leading-relaxed text-[var(--landing-muted)]">
              Most planners stop at a ranked list. Claripath explains why each course was recommended so you can defend
              the choice to yourself, your advisor, or your team.
            </BlurReveal>
            <BlurReveal className="mt-4 max-w-lg text-base leading-relaxed text-[var(--landing-muted)]" delay={0.1}>
              That explainability layer is what makes the{' '}
              <ShimmerText className="font-medium">Xplaina model</ShimmerText> different from a black-box suggestion
              engine.
            </BlurReveal>
          </div>

          <div className="space-y-4">
            {reasons.map((item, i) => (
              <motion.article
                key={item.course}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -4 }}
                transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-6"
              >
                <p className="font-mono text-xs text-[var(--landing-accent)]">{item.course}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--landing-fg)]">{item.why}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--landing-accent-soft)]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: i === 0 ? '88%' : '76%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-[var(--landing-accent)]"
                  />
                </div>
                <p className="mt-2 text-[11px] text-[var(--landing-muted)]">Sample explanation preview</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ClipboardList, Sparkles, Filter, ListChecks } from 'lucide-react'
import { fadeUp, stagger } from './motion'
import { RevealWords, RevealChars, BlurReveal } from './AnimatedText'

const steps = [
  {
    icon: ClipboardList,
    title: 'We learn your academic situation',
    body: 'A short questionnaire captures your program, completed courses, and where you are in the degree.',
  },
  {
    icon: Sparkles,
    title: 'Xplaina predicts the skills you want',
    body: 'Our model maps your answers to skill preferences so recommendations reflect what you are trying to build toward.',
  },
  {
    icon: Filter,
    title: 'Recommendations get filtered for you',
    body: 'Courses are ranked against those skills, your prerequisites, and what still fits in your remaining semesters.',
  },
  {
    icon: ListChecks,
    title: 'We surface what you have already taken',
    body: 'The platform infers completed coursework, shows it back to you for review, then suggests what to take next.',
  },
]

export function LandingModel() {
  const reduce = useReducedMotion()

  return (
    <section id="model" className="landing-section">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16"
        >
          <div className="lg:sticky lg:top-28 lg:self-start">
            <motion.p variants={fadeUp} className="landing-label text-[var(--landing-accent)]">
              <RevealChars text="How recommendations work" once />
            </motion.p>
            <h2 className="landing-display mt-4 text-3xl font-bold sm:text-4xl lg:text-[2.8rem]">
              <RevealWords text="Introducing the Xplaina model" once />
            </h2>
            <BlurReveal className="mt-5 max-w-md text-base leading-relaxed text-[var(--landing-muted)]" delay={0.15}>
              How does Claripath recommend the best courses for you? We combine your academic context with skill
              prediction, then narrow the list to courses that actually fit your path.
            </BlurReveal>
          </div>

          <ol className="space-y-4">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.li
                  key={step.title}
                  variants={fadeUp}
                  whileHover={reduce ? undefined : { x: 6 }}
                  className="landing-card flex gap-5 p-5 sm:p-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--landing-accent-soft)] text-[var(--landing-accent)]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] text-[var(--landing-muted)]">
                      Step {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold">
                      <RevealWords text={step.title} once delay={i * 0.04} />
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{step.body}</p>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </motion.div>
      </div>
    </section>
  )
}

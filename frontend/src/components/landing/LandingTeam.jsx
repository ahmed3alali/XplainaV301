'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, stagger } from './motion'
import { StudentPortrait } from './StudentPortrait'
import { RevealWords, BlurReveal } from './AnimatedText'

const team = [
  {
    name: 'Ahmed Alali',
    role: 'Software Engineering',
    focus: 'Architecture and AI integration',
    image: '/Ahmed-Alali.png',
  },
  {
    name: 'Mhd Alhabeb',
    role: 'Software Engineering',
    focus: 'Data pipelines and backend',
    image: '/Habeb.jpeg',
  },
  {
    name: 'Enes Recepoglu',
    role: 'Software Engineering',
    focus: 'ML models and explainability',
    image: '/Enes.jpeg',
  },
]

export function LandingTeam() {
  const reduce = useReducedMotion()

  return (
    <section id="team" className="landing-section">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <h2 className="landing-display max-w-2xl text-3xl font-bold sm:text-4xl">
            <RevealWords text="Built by software engineering students who lived the problem" once />
          </h2>
          <BlurReveal className="mt-5 max-w-xl text-base leading-relaxed text-[var(--landing-muted)]" delay={0.1}>
            Claripath started in the middle of elective confusion. We built the tool we wished existed when planning our
            own degrees.
          </BlurReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {team.map((member, i) => (
              <motion.article
                key={member.name}
                variants={fadeUp}
                whileHover={reduce ? undefined : { y: -6 }}
                className="landing-card overflow-hidden p-0"
              >
                <StudentPortrait
                  src={member.image}
                  name={member.name}
                  caption={member.role}
                  className="aspect-[4/5] rounded-none border-0 shadow-none"
                  sizes="(max-width: 640px) 90vw, 280px"
                />
                <div className="p-5">
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                    className="text-sm leading-relaxed text-[var(--landing-muted)]"
                  >
                    {member.focus}
                  </motion.p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

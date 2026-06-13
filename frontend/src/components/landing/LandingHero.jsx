'use client'

import { useRouter } from 'next/navigation'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { usePreferSimpleMotion } from '@/hooks/usePreferSimpleMotion'
import { fadeUp, stagger, easeOutExpo } from './motion'
import { StudentPortrait } from './StudentPortrait'
import { RevealWords, RevealChars, ShimmerText, BlurReveal } from './AnimatedText'

export function LandingHero({ status }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const simpleText = usePreferSimpleMotion()
  const { scrollY } = useScroll()
  const collageY = useTransform(scrollY, [0, 500], [0, 70])
  const isAuth = status === 'authenticated'

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div
        className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-[var(--landing-accent-soft)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.p variants={fadeUp} className="landing-label text-[var(--landing-accent)]">
            <RevealChars text="CE & SE course planning" animateOnMount delay={0.1} />
          </motion.p>

          <h1 className="landing-display mt-5 text-[2.6rem] font-bold text-balance sm:text-5xl lg:text-[3.65rem]">
            <RevealWords
              text="Don't know what course to take in CE or SE?"
              animateOnMount
              delay={0.2}
              as="span"
            />
          </h1>

          <p className="landing-display mt-3 text-2xl font-semibold sm:text-3xl">
            <RevealWords text="Welcome to" animateOnMount delay={0.55} as="span" />
            {' '}
            {simpleText ? (
              <span>
                <ShimmerText>Claripath.dev</ShimmerText>
              </span>
            ) : (
              <motion.span
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.5, delay: 0.78, ease: easeOutExpo }}
              >
                <ShimmerText>Claripath.dev</ShimmerText>
              </motion.span>
            )}
          </p>

          <BlurReveal
            className="mt-6 max-w-[36ch] text-base leading-relaxed text-[var(--landing-muted)] sm:text-[17px]"
            delay={0.9}
            animateOnMount
          >
            We help computer and software engineering students pick the right electives with recommendations you can
            actually understand.
          </BlurReveal>

          <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <motion.button
              type="button"
              onClick={() => router.push(isAuth ? '/dashboard' : '/login')}
              whileHover={reduce ? undefined : { scale: 1.02, y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="landing-btn landing-btn-primary group"
            >
              {isAuth ? 'Go to dashboard' : 'Start for free'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
            <a href="#model" className="landing-btn landing-btn-secondary">
              See how it works
            </a>
          </motion.div>
        </motion.div>

        <motion.div style={reduce ? undefined : { y: collageY }} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StudentPortrait
              seed="claripath-student-a"
              src={"https://www.theforage.com/blog/wp-content/uploads/2023/12/coding-vs-programming.jpg"}
              name="Jaber M."
              caption="SE, junior"
              className="col-span-1 aspect-[4/5]"
              priority
            />
            <StudentPortrait
              seed="claripath-student-b"
              src={"https://img.freepik.com/premium-photo/peaceful-image-group-students-working-laptops-modern-computer-lab-focused-coding-programming-with-teacher-moving-around-offering-support-guidance-highlighting_1282204-4670.jpg?w=360"}
              name="Mohamed Khaled"
              caption="Junior, SE"
              className="col-span-1 mt-8 aspect-[4/5]"
            />
            <StudentPortrait
              seed="claripath-student-c"
              src={"https://img.freepik.com/premium-photo/shot-young-male-student-looking-lost-while-studying-class_762026-85103.jpg"}
              name="Saleem S."
              caption="SE, senior"
              className="col-span-2 aspect-[16/9] sm:aspect-[21/9]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

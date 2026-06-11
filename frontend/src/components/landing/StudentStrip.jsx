'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { fadeUp } from './motion'
import { RevealWords, RevealChars } from './AnimatedText'

const courses = [
  { id: 'javascript', name: 'JavaScript', label: 'Frontend', image: '/jslogo.png' },
  { id: 'java', name: 'Java', label: 'Backend', image: '/javalogo.webp' },
  { id: 'ml', name: 'Machine Learning', label: 'AI & data', image: '/ML.jpeg' },
  { id: 'web', name: 'Web Development', label: 'Full stack', image: '/webdevelopment.png' },
  { id: 'mobile', name: 'Mobile Development', label: 'Apps', image: '/image.jpeg' },
]

const CHIP_WIDTH = 176

function CourseChip({ course }) {
  const reduce = useReducedMotion()

  return (
    <motion.li
      whileHover={reduce ? undefined : { y: -6, scale: 1.03 }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
      className="group relative h-44 w-36 shrink-0 overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] sm:h-48 sm:w-40"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center bg-[var(--landing-bg)] p-5 sm:p-6">
          <Image
            src={course.image}
            alt={course.name}
            width={160}
            height={160}
            className="max-h-[4.5rem] w-auto max-w-full object-contain transition-transform duration-500 group-hover:scale-105 sm:max-h-20"
          />
        </div>
        <div className="border-t border-[var(--landing-border)] bg-[var(--landing-surface)] px-3 py-3">
          <p className="text-xs font-semibold text-[var(--landing-fg)]">{course.name}</p>
          <p className="mt-0.5 text-[10px] text-[var(--landing-muted)]">{course.label}</p>
        </div>
      </div>
    </motion.li>
  )
}

function LogoStack() {
  return (
    <div className="flex items-center">
      <ul className="flex -space-x-2.5" aria-hidden="true">
        {courses.map((course) => (
          <li
            key={course.id}
            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--landing-section-alt)] bg-[var(--landing-surface)] p-1.5 sm:h-11 sm:w-11"
          >
            <Image
              src={course.image}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-contain"
            />
          </li>
        ))}
      </ul>
      <span className="ml-3 inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)] px-2.5 font-mono text-[11px] font-medium text-[var(--landing-muted)] sm:h-11">
        +100
      </span>
    </div>
  )
}

function useMarqueeTrack(items) {
  const [setsPerHalf, setSetsPerHalf] = useState(6)

  useEffect(() => {
    const update = () => {
      const minHalfWidth = window.innerWidth * 1.6
      const itemsPerSet = items.length
      const sets = Math.ceil(minHalfWidth / (itemsPerSet * CHIP_WIDTH))
      setSetsPerHalf(Math.max(8, sets))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [items])

  return useMemo(() => {
    const half = Array.from({ length: setsPerHalf }, () => items).flat()
    return [...half, ...half]
  }, [items, setsPerHalf])
}

export function StudentStrip() {
  const reduce = useReducedMotion()
  const track = useMarqueeTrack(courses)

  return (
    <section
      className="landing-section-alt border-y border-[var(--landing-border)] py-10 sm:py-12"
      aria-label="Course topics covered by Claripath"
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={fadeUp}
        className="mx-auto mb-8 max-w-6xl px-5 sm:mb-10 sm:px-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 max-w-2xl">
            <p className="landing-label text-[var(--landing-muted)]">
              <RevealChars text="Course catalog" once />
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-balance sm:text-2xl lg:max-w-[22ch] lg:text-[1.75rem] xl:max-w-none xl:text-3xl">
              <RevealWords text="Our course recommender engine includes 100+ topics" once delay={0.05} />
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:shrink-0 lg:pb-1">
            <LogoStack />
            <p className="max-w-[16rem] text-sm leading-relaxed text-[var(--landing-muted)] sm:max-w-[12rem] lg:text-right">
              From JavaScript and Java to ML, web, and mobile — mapped to your degree path.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--landing-section-alt)] to-transparent sm:w-16"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--landing-section-alt)] to-transparent sm:w-16"
          aria-hidden="true"
        />

        <motion.ul
          className="flex w-max gap-4 px-5 sm:px-8"
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: 122, repeat: Infinity, ease: 'linear' }}
        >
          {track.map((course, i) => (
            <CourseChip key={`${course.id}-${i}`} course={course} />
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

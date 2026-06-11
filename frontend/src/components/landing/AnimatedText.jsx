'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { easeOutExpo } from './motion'

const wordChild = {
  hidden: { opacity: 0, y: 22, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: easeOutExpo },
  },
}

const wordContainer = (delay = 0, staggerBy = 0.038) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: staggerBy, delayChildren: delay },
  },
})

export function RevealWords({
  text,
  className = '',
  as: Tag = 'span',
  delay = 0,
  once = true,
  animateOnMount = false,
  staggerBy = 0.038,
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  const MotionTag = motion[Tag] || motion.span

  if (reduce) {
    return <Tag className={className}>{text}</Tag>
  }

  const motionProps = animateOnMount
    ? { initial: 'hidden', animate: 'visible' }
    : { initial: 'hidden', whileInView: 'visible', viewport: { once, amount: 0.45 } }

  return (
    <MotionTag className={className} variants={wordContainer(delay, staggerBy)} {...motionProps}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordChild}
          className="inline-block"
          style={{ marginRight: '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </MotionTag>
  )
}

export function RevealChars({
  text,
  className = '',
  delay = 0,
  animateOnMount = false,
  once = true,
}) {
  const reduce = useReducedMotion()
  const chars = text.split('')

  if (reduce) {
    return <span className={className}>{text}</span>
  }

  const motionProps = animateOnMount
    ? { initial: 'hidden', animate: 'visible' }
    : { initial: 'hidden', whileInView: 'visible', viewport: { once, amount: 0.8 } }

  return (
    <motion.span className={className} variants={wordContainer(delay, 0.022)} {...motionProps}>
      {chars.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.32, ease: easeOutExpo },
            },
          }}
          className="inline-block"
          style={char === ' ' ? { width: '0.3em' } : undefined}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  )
}

export function ShimmerText({ children, className = '' }) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <span className={className}>{children}</span>
  }

  return <span className={`landing-shimmer-text ${className}`}>{children}</span>
}

export function BlurReveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'p',
  once = true,
  animateOnMount = false,
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[Tag] || motion.p

  if (reduce) {
    return <Tag className={className}>{children}</Tag>
  }

  const motionProps = animateOnMount
    ? { initial: { opacity: 0, y: 16, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' } }
    : {
        initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
        whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
        viewport: { once, amount: 0.5 },
      }

  return (
    <MotionTag
      className={className}
      {...motionProps}
      transition={{ duration: 0.55, delay, ease: easeOutExpo }}
    >
      {children}
    </MotionTag>
  )
}

export function HighlightWord({ text, highlight, className = '' }) {
  const parts = text.split(highlight)
  if (parts.length < 2) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts[0]}
      <ShimmerText className="font-semibold">{highlight}</ShimmerText>
      {parts.slice(1).join(highlight)}
    </span>
  )
}

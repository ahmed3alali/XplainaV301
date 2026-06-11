'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'

export function StudentPortrait({
  seed,
  src: srcProp,
  name,
  caption,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 45vw, 220px',
}) {
  const reduce = useReducedMotion()
  const src = srcProp ?? `https://picsum.photos/seed/${seed}/480/600`

  return (
    <motion.figure
      whileHover={reduce ? undefined : { y: -8, scale: 1.02 }}
      transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
      className={`group relative overflow-hidden rounded-[1.35rem] bg-[var(--landing-photo-bg)] ${className}`}
    >
      <Image
        src={src}
        alt={name}
        width={480}
        height={600}
        priority={priority}
        sizes={sizes}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(18,18,18,0.72)] via-transparent to-transparent opacity-80" />
      {caption && (
        <figcaption className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-display text-sm font-semibold text-white">{name}</p>
          <p className="mt-0.5 text-xs text-white/75">{caption}</p>
        </figcaption>
      )}
    </motion.figure>
  )
}

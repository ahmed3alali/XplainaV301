'use client'

import Image from 'next/image'

export function ClaripathLogo({ className = '', height = 28, priority = false, theme }) {
  if (theme === 'light' || theme === 'dark') {
    const src = theme === 'dark' ? '/claripath-dark.png' : '/claripath-light.png'
    return (
      <Image
        src={src}
        alt="Claripath"
        width={Math.round(height * 1.62)}
        height={height}
        priority={priority}
        className={`h-auto w-auto object-contain object-left ${className}`}
        style={{ height, width: 'auto' }}
      />
    )
  }

  return (
    <span className={`claripath-logo inline-flex shrink-0 items-center ${className}`} style={{ height }}>
      <Image
        src="/claripath-light.png"
        alt="Claripath"
        width={Math.round(height * 1.62)}
        height={height}
        priority={priority}
        className="claripath-logo-light h-full w-auto object-contain object-left"
      />
      <Image
        src="/claripath-dark.png"
        alt=""
        aria-hidden
        width={Math.round(height * 1.62)}
        height={height}
        priority={priority}
        className="claripath-logo-dark h-full w-auto object-contain object-left"
      />
    </span>
  )
}

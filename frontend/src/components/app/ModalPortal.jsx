'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/providers/ThemeProvider'

export function ModalPortal({
  children,
  onClose,
  zIndex = 100,
  className = '',
  hostClassName = '',
  labelledBy,
}) {
  const [mounted, setMounted] = useState(false)
  const { theme, mounted: themeMounted } = useTheme()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !onClose) return

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mounted, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={`app-shell app-modal-root ${className}`}
      data-theme={themeMounted ? theme : 'light'}
      style={{ zIndex }}
    >
      <button
        type="button"
        className="app-modal-overlay"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div className="app-modal-stage">
        <div
          className={`app-modal-host ${hostClassName}`.trim()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

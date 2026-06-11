'use client'

import { useCallback, useEffect, useState } from 'react'

const NAV_OFFSET = 112

export function useActiveSection(sectionIds) {
  const [active, setActive] = useState(() => sectionIds[0] ?? '')

  const sectionKey = sectionIds.join('|')

  const pickActiveFromScroll = useCallback(() => {
    const ids = sectionKey.split('|').filter(Boolean)
    if (!ids.length) return undefined

    let current = ids[0]

    for (const href of ids) {
      const id = href.replace('#', '')
      const el = document.getElementById(id)
      if (!el) continue

      const { top } = el.getBoundingClientRect()
      if (top <= NAV_OFFSET) {
        current = href
      }
    }

    setActive(current)
  }, [sectionKey])

  const setActiveSection = useCallback(
    (href) => {
      if (sectionKey.split('|').includes(href)) {
        setActive(href)
      }
    },
    [sectionKey]
  )

  useEffect(() => {
    const ids = sectionKey.split('|').filter(Boolean)
    if (!ids.length) return undefined

    const onHashChange = () => {
      const hash = window.location.hash
      if (hash && ids.includes(hash)) {
        setActive(hash)
      }
    }

    pickActiveFromScroll()
    onHashChange()

    window.addEventListener('scroll', pickActiveFromScroll, { passive: true })
    window.addEventListener('hashchange', onHashChange)

    return () => {
      window.removeEventListener('scroll', pickActiveFromScroll)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [pickActiveFromScroll, sectionKey])

  return { active, setActiveSection }
}

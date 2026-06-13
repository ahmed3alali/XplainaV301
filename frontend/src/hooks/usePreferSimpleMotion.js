'use client'

import { useReducedMotion } from 'framer-motion'
import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(onChange) {
  const mq = window.matchMedia(MOBILE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

/** Skip heavy text animations on mobile and when the user prefers reduced motion. */
export function usePreferSimpleMotion() {
  const reduced = useReducedMotion()
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return reduced || isMobile
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { easeOut } from './motion'
import { ThemeToggle } from './ThemeToggle'
import { useActiveSection } from './useActiveSection'
import { ClaripathLogo } from '@/components/ClaripathLogo'

const links = [
  { href: '#model', label: 'Model' },
  { href: '#difference', label: 'Why Claripath' },
  { href: '#team', label: 'Team' },
  { href: '#plans', label: 'Plans' },
]

const SECTION_HREFS = links.map((l) => l.href)

export function LandingNav({ status, variant = 'landing' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const isAuthPage = variant === 'auth'
  const { active: activeHref, setActiveSection } = useActiveSection(isAuthPage ? [] : SECTION_HREFS)
  const isAuth = status === 'authenticated'

  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolled(value > 16)
  })

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const goToApp = () => {
    setOpen(false)
    router.push(isAuth ? '/dashboard' : '/login')
  }

  const handleNavClick = (href) => {
    setActiveSection(href)
    setOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4">
        <div
          className={`landing-nav-shell mx-auto w-full ${isAuthPage ? 'max-w-[40rem]' : 'max-w-[46rem]'} ${scrolled ? 'is-scrolled' : ''}`}
        >
          <nav className="flex h-[3.5rem] items-center gap-3 px-3 sm:px-4" aria-label="Main">
            <Link href="/" className="landing-nav-brand group shrink-0">
              <ClaripathLogo height={58} priority />
            </Link>

            {!isAuthPage && (
            <div className="hidden min-w-0 flex-1 justify-center lg:flex">
              <ul className="flex items-center gap-0.5 rounded-xl border border-[var(--landing-nav-rail-border)] bg-[var(--landing-nav-rail-bg)] p-1">
                {links.map((link) => {
                  const active = activeHref === link.href
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        onClick={() => handleNavClick(link.href)}
                        className={`landing-nav-link ${active ? 'is-active' : ''}`}
                        aria-current={active ? 'location' : undefined}
                      >
                        {active && (
                          <motion.span
                            layoutId="landing-nav-active"
                            className="landing-nav-link-bg"
                            transition={
                              reduce ? { duration: 0 } : { type: 'spring', duration: 0.42, bounce: 0.12 }
                            }
                          />
                        )}
                        <span className="relative">{link.label}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
            )}

            {isAuthPage ? (
              <div className="ml-auto flex items-center gap-1.5">
                <ThemeToggle />
                <Link href="/" className="landing-nav-cta group">
                  Back to home
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
                    strokeWidth={1.75}
                  />
                </Link>
              </div>
            ) : (
              <>
                <div className="ml-auto hidden items-center gap-1.5 lg:flex">
                  <ThemeToggle />
                  <span className="mx-0.5 h-4 w-px bg-[var(--landing-border)]" aria-hidden="true" />
                  {!isAuth && (
                    <button type="button" onClick={goToApp} className="landing-nav-text-btn">
                      Sign in
                    </button>
                  )}
                  <button type="button" onClick={goToApp} className="landing-nav-cta group">
                    {isAuth ? 'Dashboard' : 'Get started'}
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
                      strokeWidth={1.75}
                    />
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-1.5 lg:hidden">
                  <ThemeToggle />
                  <button
                    type="button"
                    className="landing-nav-icon-btn"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                  >
                    {open ? <X className="h-[15px] w-[15px]" strokeWidth={1.75} /> : <Menu className="h-[15px] w-[15px]" strokeWidth={1.75} />}
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      </header>

      <AnimatePresence>
        {open && !isAuthPage && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-[rgba(10,11,9,0.42)] backdrop-blur-[2px] lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.24, ease: easeOut }}
              className="fixed left-4 right-4 top-[4.75rem] z-[70] overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.35)] sm:left-auto sm:right-6 sm:w-[min(100%,22rem)] lg:hidden"
            >
              <div className="border-b border-[var(--landing-border)] px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-muted)]">Menu</p>
                <ClaripathLogo height={24} className="mt-2" />
              </div>
              <ul className="p-2">
                {links.map((link, i) => {
                  const active = activeHref === link.href
                  return (
                    <motion.li
                      key={link.href}
                      initial={reduce ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.22 }}
                    >
                      <a
                        href={link.href}
                        onClick={() => handleNavClick(link.href)}
                        className={`landing-nav-mobile-link ${active ? 'is-active' : ''}`}
                        aria-current={active ? 'location' : undefined}
                      >
                        <span className="font-mono text-[10px] text-[var(--landing-muted)]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {link.label}
                      </a>
                    </motion.li>
                  )
                })}
              </ul>
              <div className="flex flex-col gap-2 border-t border-[var(--landing-border)] p-4">
                {!isAuth && (
                  <button type="button" onClick={goToApp} className="landing-nav-text-btn w-full justify-center py-2">
                    Sign in
                  </button>
                )}
                <button type="button" onClick={goToApp} className="landing-nav-cta w-full justify-center">
                  {isAuth ? 'Dashboard' : 'Get started'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

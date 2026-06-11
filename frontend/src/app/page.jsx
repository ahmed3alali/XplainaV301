'use client'

import { useSession } from '@/providers/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { LandingThemeProvider, useLandingTheme } from '@/components/landing/LandingThemeProvider'
import { LandingAmbient } from '@/components/landing/LandingAmbient'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { StudentStrip } from '@/components/landing/StudentStrip'
import { LandingModel } from '@/components/landing/LandingModel'
import { LandingDifference } from '@/components/landing/LandingDifference'
import { LandingTeam } from '@/components/landing/LandingTeam'
import { LandingAcademicCredit } from '@/components/landing/LandingAcademicCredit'
import { LandingPricing } from '@/components/landing/LandingPricing'
import { LandingCta } from '@/components/landing/LandingCta'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingThemeProvider>
        <LandingPageInner />
      </LandingThemeProvider>
    </Suspense>
  )
}

function LandingPageInner() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, mounted } = useLandingTheme()
  const viewHome = searchParams.get('home') === '1'

  useEffect(() => {
    if (status === 'authenticated' && !viewHome) {
      router.push('/dashboard')
    }
  }, [status, router, viewHome])

  if (status === 'authenticated' && !viewHome) return null

  return (
    <div className="landing-page min-h-dvh" data-theme={mounted ? theme : 'light'}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <LandingAmbient />
      <div className="relative z-10">
        <LandingNav status={status} />
        <main id="main">
          <LandingHero status={status} />
          <StudentStrip />
          <LandingModel />
          <LandingDifference />
          <LandingTeam />
          <LandingAcademicCredit />
          <LandingPricing status={status} />
          <LandingCta status={status} />
        </main>
        <LandingFooter />
      </div>
    </div>
  )
}

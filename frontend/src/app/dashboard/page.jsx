'use client'

import { useSession } from '@/providers/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/services/api'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import ExplainModal from '@/components/ExplainModal'
import { RevealWords } from '@/components/landing/AnimatedText'
import {
  OnboardingLoader,
  ONBOARDING_MESSAGES,
} from '@/components/dashboard/OnboardingLoader'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardInner />
    </Suspense>
  )
}

function DashboardInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const justOnboarded = searchParams.get('onboarded') === '1'

  const [recommendations, setRecommendations] = useState([])
  const [takenCourses, setTakenCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(justOnboarded)
  const [onboardingMessage, setOnboardingMessage] = useState(ONBOARDING_MESSAGES[0])
  const [error, setError] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const loadStarted = useRef(false)

  const loadOnboardedDashboard = useCallback(async () => {
    setOnboarding(true)
    setLoading(true)
    setError(null)

    try {
      let coursesData = []
      for (let attempt = 0; attempt < 12; attempt++) {
        coursesData = await api.getMyCourses()
        if (coursesData.length > 0) break
        await sleep(300 + attempt * 250)
      }
      if (coursesData.length === 0) {
        sessionStorage.removeItem('pendingRecs')
        sessionStorage.removeItem('pendingCourseIds')
        router.replace('/select-courses')
        return
      }

      setTakenCourses(coursesData)

      let recs = []
      const pendingRaw = sessionStorage.getItem('pendingRecs')
      if (pendingRaw) {
        try {
          recs = JSON.parse(pendingRaw)
        } catch {
          recs = []
        }
      }

      const courseIds = coursesData.map((c) => c.COURSE_ID || c.course_id)
      if (courseIds.length > 0) {
        try {
          recs = await api.getDynamicRecommendations(courseIds, 10, 0.5)
        } catch {
          // Fall back to wizard-cached recommendations if dynamic call fails
        }
      }

      sessionStorage.removeItem('pendingRecs')
      sessionStorage.removeItem('pendingCourseIds')
      setRecommendations(Array.isArray(recs) ? recs : [])
      window.dispatchEvent(new CustomEvent('refresh-sidebar-courses'))
      router.replace('/dashboard', { scroll: false })
    } catch (err) {
      setError(err.message || 'Failed to load your dashboard')
    } finally {
      setOnboarding(false)
      setLoading(false)
    }
  }, [router])

  const fetchData = useCallback(async () => {
    if (!session?.user) return

    setLoading(true)
    setError(null)

    try {
      let coursesData = []
      if (session.user.userType === 'real_user') {
        coursesData = await api.getMyCourses()
        setTakenCourses(coursesData)

        if (coursesData.length === 0 && !justOnboarded) {
          router.push('/select-courses')
          return
        }
      }

      if (session.user.userType === 'dataset_user') {
        const data = await api.getRecommendations(session.user.id, 10, 0.5)
        setRecommendations(data)
      } else {
        const selectedCourses = coursesData.map((c) => c.COURSE_ID || c.course_id)
        const data = await api.getDynamicRecommendations(selectedCourses, 10, 0.5)
        setRecommendations(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [session, router, justOnboarded])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated' || !session?.user) return
    if (justOnboarded && session.user.userType === 'real_user') {
      if (loadStarted.current) return
      loadStarted.current = true
      loadOnboardedDashboard()
      return
    }

    fetchData()
  }, [status, session, justOnboarded, loadOnboardedDashboard, fetchData, router])

  useEffect(() => {
    if (!onboarding) return undefined

    let index = 0
    const interval = setInterval(() => {
      index = (index + 1) % ONBOARDING_MESSAGES.length
      setOnboardingMessage(ONBOARDING_MESSAGES[index])
    }, 2800)

    return () => clearInterval(interval)
  }, [onboarding])

  useEffect(() => {
    const handleRefresh = () => fetchData()
    window.addEventListener('refresh-recommendations', handleRefresh)
    return () => window.removeEventListener('refresh-recommendations', handleRefresh)
  }, [fetchData])

  if (status === 'loading' || (loading && !onboarding)) {
    return <DashboardSkeleton />
  }

  if (onboarding) {
    return <OnboardingLoader message={onboardingMessage} />
  }

  const isDatasetUser = session?.user?.userType === 'dataset_user'
  const avgMatch =
    recommendations.length > 0
      ? Math.round(
          (recommendations.reduce((sum, r) => sum + (r.hybrid_score || 0), 0) / recommendations.length) * 100
        )
      : 0

  return (
    <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 border-b border-[var(--landing-border)] pb-6">
        <RevealWords
          text="Your recommended courses"
          className="landing-display text-2xl font-bold sm:text-3xl"
          once
        />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--landing-muted)] sm:text-[15px]">
          {isDatasetUser
            ? `Personalized picks based on dataset user ${session.user.id}'s history.`
            : 'Ranked by the Xplaina model from your skills, transcript, and stated interests.'}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Recommendations" value={String(recommendations.length)} />
          <StatCard label="Avg. match" value={recommendations.length ? `${avgMatch}%` : '—'} />
          <StatCard label="Profile" value={isDatasetUser ? 'Dataset' : 'Live'} />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">
          Failed to load recommendations: {error}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="landing-card p-8 text-center">
          <p className="text-sm text-[var(--landing-muted)]">No recommendations yet. Add courses or retake the survey.</p>
        </div>
      ) : (
        <section aria-label="Course recommendations">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-muted)]">
            Top matches · users like you also took
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {recommendations.map((rec, index) => (
              <RecommendationCard
                key={rec.course_id}
                rec={rec}
                rank={index + 1}
                onExplain={() => setSelectedCourse(rec.course_id)}
              />
            ))}
          </div>
        </section>
      )}

      {selectedCourse && (
        <ExplainModal
          courseId={selectedCourse}
          userId={session?.user?.id}
          userType={session?.user?.userType}
          takenCourses={takenCourses}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--landing-muted)]">{label}</p>
      <p className="landing-display mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function RecommendationCard({ rec, rank, onExplain }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="app-rec-card flex flex-col justify-between"
    >
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-[var(--landing-muted)]">#{String(rank).padStart(2, '0')}</span>
          <span className="app-match-pill">
            <Sparkles className="h-3 w-3" strokeWidth={1.75} />
            {((rec.hybrid_score ?? 0) * 100).toFixed(0)}% match
          </span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-[var(--landing-fg)]">{rec.title}</h3>
        <p className="mt-1 font-mono text-[11px] text-[var(--landing-muted)]">{rec.course_id}</p>

        {rec.genres?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {rec.genres.slice(0, 4).map((g) => (
              <span key={g} className="app-tag">
                {g}
              </span>
            ))}
            {rec.genres.length > 4 && <span className="app-tag">+{rec.genres.length - 4}</span>}
          </div>
        )}
      </div>

      <button type="button" onClick={onExplain} className="app-action-btn mt-6 w-full justify-between">
        View explanation
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </motion.article>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 space-y-3">
        <div className="app-skeleton h-8 w-64" />
        <div className="app-skeleton h-4 w-full max-w-lg" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="app-skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="app-skeleton h-52 rounded-[1.1rem]" />
        ))}
      </div>
    </div>
  )
}

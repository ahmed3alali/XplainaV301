'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { api } from '@/services/api'
import { Loader2, LogOut, Info, RotateCcw } from 'lucide-react'
import ExplainModal from '@/components/ExplainModal'

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}>
      <DashboardInner />
    </Suspense>
  )
}

function DashboardInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  // When coming from the onboarding wizard, skip the empty-courses redirect
  const justOnboarded = searchParams.get('onboarded') === '1'
  
  const [recommendations, setRecommendations] = useState([])
  const [takenCourses, setTakenCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [selectedCourse, setSelectedCourse] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    const fetchData = async () => {
      try {
        // ── Check for recs pre-computed by the onboarding wizard ────────────
        const pendingRecsRaw = sessionStorage.getItem('pendingRecs')
        const pendingSkillsRaw = sessionStorage.getItem('pendingSkills')

        if (pendingRecsRaw && session.user.userType === 'real_user') {
          // Use wizard's pre-computed recommendations immediately
          const recs = JSON.parse(pendingRecsRaw)
          sessionStorage.removeItem('pendingRecs')
          sessionStorage.removeItem('pendingSkills')
          setRecommendations(recs)
          setLoading(false)
          return
        }

        // ── Normal fetch path ────────────────────────────────────────────────
        let coursesData = []
        if (session.user.apiToken) {
          coursesData = await api.getMyCourses(session.user.apiToken)
          setTakenCourses(coursesData)

          if (coursesData.length === 0 && session.user.userType === 'real_user' && !justOnboarded) {
            router.push('/select-courses')
            return
          }
        }

        if (session.user.userType === 'dataset_user') {
          const data = await api.getRecommendations(session.user.id, 10, 0.5)
          setRecommendations(data)
        } else {
          const selectedCourses = coursesData.map(c => c.COURSE_ID)
          const data = await api.getDynamicRecommendations(selectedCourses, 10, 0.5)
          setRecommendations(data)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status, session, router])

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  const isDatasetUser = session?.user?.userType === 'dataset_user'

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10 flex items-center justify-between border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">My Dashboard</h1>
          <p className="text-[13px] text-foreground/60">
            {isDatasetUser
              ? `Personalized courses based on Dataset User ${session.user.id}'s history.`
              : 'Courses recommended based on your skills and interests.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isDatasetUser && (
            <button
              onClick={() => router.push('/select-courses')}
              className="flex items-center gap-2 rounded-md border border-accent/20 bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retake Survey
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-surface-raised transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          Failed to load recommendations: {error}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Core Recommendations Area */}
          <main className="w-full flex flex-col">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground/60 mb-5">
              Top Recommendations | Users like you also took
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.course_id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border-subtle bg-surface p-5 transition-all hover:border-border hover:shadow-md"
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-raised border border-border-subtle text-[11px] font-semibold text-foreground/80">
                        #{index + 1}
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        <SparkleIcon />
                        {(rec.hybrid_score * 100).toFixed(0)}% Match
                      </div>
                    </div>
                    <h3 className="text-[15px] font-medium text-foreground tracking-tight leading-snug">
                      {rec.title}
                    </h3>
                    <p className="mt-1 text-[11px] font-mono text-foreground/30">ID: {rec.course_id}</p>

                    {/* Genre tags */}
                    {rec.genres?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rec.genres.slice(0, 4).map(g => (
                          <span
                            key={g}
                            className="rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-foreground/50"
                          >
                            {g}
                          </span>
                        ))}
                        {rec.genres.length > 4 && (
                          <span className="rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-foreground/40">
                            +{rec.genres.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                    
                  <button 
                    onClick={() => setSelectedCourse(rec.course_id)}
                    className="mt-6 flex w-full items-center justify-between rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-surface-raised hover:text-foreground"
                  >
                    View explanation
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </main>
        </div>
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

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
  )
}

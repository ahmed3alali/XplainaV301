'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Loader2, LogOut, Info, Settings } from 'lucide-react'
import ExplainModal from '@/components/ExplainModal'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [recommendations, setRecommendations] = useState([])
  const [takenCourses, setTakenCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [selectedCourse, setSelectedCourse] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      const fetchData = async () => {
        try {
          let coursesData = [];
          if (session.user.apiToken) {
            coursesData = await api.getMyCourses(session.user.apiToken)
            setTakenCourses(coursesData)
            
            if (coursesData.length === 0 && session.user.userType === "real_user") {
              router.push('/select-courses')
              return
            }
          }

          if (session.user.userType === "dataset_user") {
            // Predict for existing dataset user using matrix factorization
            const data = await api.getRecommendations(session.user.id, 10, 0.5)
            setRecommendations(data)
          } else {
            // Predict for real user dynamically with their selected courses
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
    }
  }, [status, session, router])

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Dashboard</h1>
          <p className="text-slate-400">
            {session?.user?.userType === "dataset_user"
              ? `Personalized courses based on Dataset User ${session.user.id}'s history.` 
              : "Personalized courses based on your selected courses."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => signOut()} className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
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
          {/* Sidebar for Taken Courses */}
          <aside className="w-full lg:w-1/3 shrink-0">
            <div className="sticky top-8 space-y-6">
              <div className="flex items-center justify-between pl-1">
                <h2 className="text-xl font-semibold text-slate-200">Courses You've Taken</h2>
                {session?.user?.userType === "real_user" && (
                  <Link href="/select-courses" className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors">
                    <Settings className="h-3.5 w-3.5" />
                    Change my selections
                  </Link>
                )}
              </div>
              
              <div className="space-y-3">
                {takenCourses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                    No courses taken yet.
                  </div>
                ) : (
                  takenCourses.map((course) => (
                    <div key={course.COURSE_ID} className="rounded-xl border border-white/5 bg-slate-900/30 p-4">
                      <h3 className="text-sm font-medium text-slate-300 line-clamp-2">{course.TITLE}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {course.genres?.slice(0, 3).map(g => (
                          <span key={g} className="rounded border border-white/5 bg-black/40 px-1.5 py-0.5 text-[10px] text-slate-500">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Core Recommendations Area */}
          <main className="w-full lg:w-2/3">
            <h2 className="text-xl font-semibold text-slate-200 mb-6 pl-1">Top Recommendations</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {recommendations.map((rec, index) => (
                <div key={rec.course_id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-6 transition-all hover:bg-white/5 hover:border-white/10">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 font-bold">
                        #{index + 1}
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                        <SparkleIcon />
                        {(rec.hybrid_score * 100).toFixed(0)}% Match
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100 title-font tracking-tight">{rec.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">Course ID: {rec.course_id}</p>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedCourse(rec.course_id)}
                    className="mt-6 flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 group-hover:bg-indigo-500 group-hover:text-white"
                  >
                    Why this course?
                    <Info className="h-4 w-4" />
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

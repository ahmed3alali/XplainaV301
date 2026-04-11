'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { BookMarked, History, Loader2, Library } from 'lucide-react'
import { api } from '@/services/api'

export default function Sidebar() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCourses() {
      if (!session?.user?.apiToken) return
      
      try {
        setLoading(true)
        const res = await fetch("http://127.0.0.1:8000/courses/my-courses", {
          headers: {
            "Authorization": `Bearer ${session.user.apiToken}`
          }
        })
        const data = await res.json()
        if (res.ok) {
          setCourses(data || [])
        }
      } catch (err) {
        console.error("Failed to load user courses:", err)
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [session])

  if (!session?.user) return null

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-80 flex-col border-r border-white/10 bg-slate-900/40 backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-3 border-b border-white/10 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
          <Library className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-white">Your Profile</h2>
          <p className="text-xs text-slate-400">
            {session.user.isDatasetUser ? 'Dataset Scholar' : 'Real-time Learner'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <History className="h-4 w-4" /> Taken Courses
          </h3>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            {loading ? '...' : courses.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
            <BookMarked className="mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">No courses taken yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course, idx) => (
              <div key={idx} className="group relative rounded-xl border border-white/5 bg-slate-950/50 p-4 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5">
                <h4 className="line-clamp-2 text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                  {course.title || course.TITLE || `Course ${course.course_id || course.COURSE_ID}`}
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(course.genres || []).slice(0, 2).map((g) => (
                    <span key={g} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

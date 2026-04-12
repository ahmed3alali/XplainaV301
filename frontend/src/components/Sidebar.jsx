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
    <aside className="fixed left-0 top-0 hidden h-screen w-80 flex-col border-r border-border-subtle bg-background lg:flex">
      <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface border border-border-subtle text-foreground">
          <Library className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-foreground tracking-tight">Your Profile</h2>
          <p className="text-[11px] text-foreground/60">
            {session.user.isDatasetUser ? 'Dataset Scholar' : 'Real-time Learner'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
            <History className="h-3 w-3" /> Taken Courses
          </h3>
          <span className="rounded-md border border-border-subtle bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
            {loading ? '...' : courses.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-subtle bg-surface p-6 text-center">
            <BookMarked className="mb-2 h-6 w-6 text-foreground/40" />
            <p className="text-[12px] text-foreground/50">No courses taken.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {courses.map((course, idx) => (
              <div key={idx} className="group relative rounded-md border border-transparent bg-transparent px-3 py-2.5 transition-all hover:bg-surface hover:border-border-subtle">
                <h4 className="line-clamp-2 text-[13px] font-medium text-foreground/80 group-hover:text-foreground leading-snug">
                  {course.title || course.TITLE || `Course ${course.course_id || course.COURSE_ID}`}
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(course.genres || []).slice(0, 2).map((g) => (
                    <span key={g} className="rounded border border-border-subtle bg-background px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-foreground/60 font-medium">
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

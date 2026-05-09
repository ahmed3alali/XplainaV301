'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { BookMarked, History, Loader2, Library, X } from 'lucide-react'
import { api } from '@/services/api'
import { createPortal } from 'react-dom'

export default function Sidebar() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(null)

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
            <History className="h-3 w-3" />  We think you have already taken
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
              <button 
                key={idx} 
                onClick={() => setSelectedCourse(course)}
                className="w-full text-left group relative rounded-md border border-transparent bg-transparent px-3 py-2.5 transition-all hover:bg-surface hover:border-border-subtle cursor-pointer"
              >
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
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCourse && (
        <SeedCourseModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
        />
      )}
    </aside>
  )
}

function SeedCourseModal({ course, onClose }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border-subtle bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-6 py-4">
          <h2 className="text-[17px] font-medium text-foreground tracking-tight break-words pr-4">
            {course.title || course.TITLE || `Course ${course.course_id || course.COURSE_ID}`}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-foreground/40 hover:bg-surface-raised hover:text-foreground transition-colors border border-transparent hover:border-border-subtle">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6 rounded-md border border-accent/20 bg-accent/5 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-accent">
              <BookMarked className="h-4 w-4" />
              Why is this course here?
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/70">
              This is a <strong className="text-foreground font-medium">Seed Course</strong>. 
              We automatically selected it because it perfectly matches the skills you chose during onboarding. 
              It acts as a foundation to trigger the AI model and generate your personalized recommendations.
            </p>
          </div>
          
          <div>
            <h3 className="mb-3 text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">Course Genres</h3>
            <div className="flex flex-wrap gap-2">
              {(course.genres || []).map((g) => (
                <span key={g} className="rounded border border-border-subtle bg-surface-raised px-2 py-1 text-[11px] font-medium text-foreground/80">
                  {g}
                </span>
              ))}
              {(!course.genres || course.genres.length === 0) && (
                <span className="text-[12px] text-foreground/40 italic">No genres available</span>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="mb-2 text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">Course ID</h3>
            <p className="text-[13px] font-mono text-foreground/60">{course.course_id || course.COURSE_ID}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

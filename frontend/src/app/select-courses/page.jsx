'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { BookOpen, Check, ArrowRight, Loader2, LogOut } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [courses, setCourses] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [checkingUser, setCheckingUser] = useState(true)

  useEffect(() => {
    async function checkUserRouting() {
      if (status === 'unauthenticated') {
        router.push('/login')
        return
      }
      
      if (status === 'authenticated') {
        // 1. Dataset users skip cold-start because their historical courses are in the backend.
        if (session.user.isDatasetUser) {
          router.push('/dashboard')
          return
        }

        // 2. Real Users - load their existing courses to populate the UI
        try {
          const res = await fetch("http://127.0.0.1:8000/courses/my-courses", {
             headers: { "Authorization": `Bearer ${session.user.apiToken}` }
          })
          const myCoursesData = await res.json()

          if (res.ok && myCoursesData && myCoursesData.length > 0) {
            const existingSet = new Set(myCoursesData.map(c => c.COURSE_ID))
            setSelected(existingSet)
          }

          setCheckingUser(false)
          
          api.getCourses(50)
            .then(data => {
              setCourses(data)
              setLoading(false)
            })
            .catch(err => {
              console.error("Failed to load generic courses", err)
              setLoading(false)
            })
        } catch (err) {
          console.error(err)
          setCheckingUser(false)
          setLoading(false)
        }
      }
    }

    checkUserRouting()
  }, [status, session, router])

  if (status === 'loading' || checkingUser || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  const toggleCourse = (id) => {
    const newSet = new Set(selected)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelected(newSet)
  }

  const handleProceed = async () => {
    setLoading(true)
    const selectedArray = Array.from(selected)

    // Save selected courses locally for dynamic prediction API 
    localStorage.setItem('selectedCourses', JSON.stringify(selectedArray))

    if (selectedArray.length > 0 && session?.user?.apiToken) {
      try {
        await fetch("http://127.0.0.1:8000/courses/my-courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.user.apiToken}`
          },
          body: JSON.stringify({ selected_courses: selectedArray })
        })
      } catch (err) {
        console.error("Failed to save to FastAPI", err)
      }
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background selection:bg-brand selection:text-brand-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">Build Your Profile</h1>
            <p className="text-sm text-foreground/60">Select any courses you have previously taken to personalize your recommendations.</p>
          </div>
          <button onClick={() => signOut()} className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-raised transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-24">
          {courses.map(course => {
            const isSelected = selected.has(course.COURSE_ID)
            return (
              <div
                key={course.COURSE_ID}
                onClick={() => toggleCourse(course.COURSE_ID)}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border p-5 transition-all duration-200 ${
                  isSelected 
                    ? 'border-brand bg-surface shadow-[inset_0_0_0_1px_var(--color-brand)]' 
                    : 'border-border-subtle bg-surface hover:border-border hover:bg-surface-raised'
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <BookOpen className={`h-[18px] w-[18px] ${isSelected ? 'text-brand' : 'text-foreground/40 group-hover:text-foreground/60'}`} />
                  <div className={`flex h-[18px] w-[18px] items-center justify-center rounded-sm border transition-colors ${
                    isSelected ? 'border-brand bg-brand text-brand-foreground' : 'border-border-subtle group-hover:border-border text-transparent'
                  }`}>
                    <Check className="h-3 w-3 font-bold" />
                  </div>
                </div>
                <h3 className="text-[15px] font-medium text-foreground line-clamp-2 leading-snug">{course.TITLE}</h3>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {course.genres?.slice(0, 3).map(g => (
                    <span key={g} className="rounded-md border border-border-subtle bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/60">
                      {g}
                    </span>
                  )) || null}
                  {course.genres?.length > 3 && (
                    <span className="rounded-md border border-border-subtle bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/60">
                      +{course.genres.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 glass-panel border-x-0 border-b-0 border-t z-50">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <p className="text-[13px] font-medium text-foreground/60">
              <span className="text-foreground">{selected.size}</span> courses selected
            </p>
            <button
              onClick={handleProceed}
              className="flex items-center gap-2 rounded-md bg-brand px-5 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-all hover:bg-brand/90 active:scale-95"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Build Your Profile</h1>
            <p className="text-slate-400">Select any courses you have previously taken to personalize your recommendations. Select none to proceed empty.</p>
          </div>
          <button onClick={() => signOut()} className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
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
                className={`group relative cursor-pointer overflow-hidden rounded-xl border p-5 transition-all ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                    : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <BookOpen className={`h-5 w-5 ${isSelected ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                    isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-600 group-hover:border-slate-500 text-transparent'
                  }`}>
                    <Check className="h-3 w-3" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-200 line-clamp-2">{course.TITLE}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.genres?.slice(0, 3).map(g => (
                    <span key={g} className="rounded-md bg-black/30 px-2 py-1 text-xs text-slate-400">
                      {g}
                    </span>
                  )) || null}
                  {course.genres?.length > 3 && (
                    <span className="rounded-md bg-black/30 px-2 py-1 text-xs text-slate-400">
                      +{course.genres.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <p className="text-sm text-slate-400">
              <strong className="text-white">{selected.size}</strong> courses selected
            </p>
            <button
              onClick={handleProceed}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 font-semibold text-slate-950 transition-transform active:scale-95 hover:bg-slate-200"
            >
              Get Recommendations
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

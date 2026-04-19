'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo, Suspense } from 'react'
import { api } from '@/services/api'
import {
  BookOpen, Check, ArrowRight, Loader2, LogOut,
  Search, X, ChevronLeft, ChevronRight, ArrowLeft,
} from 'lucide-react'

const PAGE_SIZE = 12

function SelectCoursesInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('edit') === '1'

  const [allCourses, setAllCourses] = useState([])   // full catalogue, never paginated
  const [selected, setSelected] = useState(new Set())
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [checkingUser, setCheckingUser] = useState(true)
  const [saving, setSaving] = useState(false)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // ── Auth guard & pre-load existing selections ──────────────────────────
  useEffect(() => {
    async function init() {
      if (status === 'unauthenticated') { router.push('/login'); return }
      if (status !== 'authenticated') return

      // Dataset users cannot edit courses – bounce them to dashboard
      if (session.user.isDatasetUser) { router.push('/dashboard'); return }

      // Load existing course selections (works for both first-visit & edit)
      try {
        const res = await fetch('http://127.0.0.1:8000/courses/my-courses', {
          headers: { Authorization: `Bearer ${session.user.apiToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.length > 0) {
            setSelected(new Set(data.map(c => c.COURSE_ID)))
          }
        }
      } catch (_) {}

      setCheckingUser(false)

      // Load full course catalogue
      try {
        const data = await api.getAllCourses()
        setAllCourses(data)
      } catch (err) {
        console.error('Failed to load courses', err)
      } finally {
        setLoadingCourses(false)
      }
    }
    init()
  }, [status, session, router])

  // ── Search: filters across ALL courses, not just current page ──────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCourses
    return allCourses.filter(
      c =>
        c.TITLE.toLowerCase().includes(q) ||
        c.COURSE_ID.toLowerCase().includes(q) ||
        c.genres?.some(g => g.toLowerCase().includes(q))
    )
  }, [allCourses, query])

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1) }, [query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageCourses = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Toggle individual course ────────────────────────────────────────────
  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Save & navigate ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    const ids = Array.from(selected)
    localStorage.setItem('selectedCourses', JSON.stringify(ids))

    if (session?.user?.apiToken) {
      try {
        await fetch('http://127.0.0.1:8000/courses/my-courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.user.apiToken}`,
          },
          body: JSON.stringify({ selected_courses: ids }),
        })
      } catch (err) {
        console.error('Failed to save courses', err)
      }
    }
    router.push('/dashboard')
  }

  // ── Loading states ─────────────────────────────────────────────────────
  if (status === 'loading' || checkingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  // ── Pagination controls ────────────────────────────────────────────────
  const canPrev = page > 1
  const canNext = page < totalPages

  const pageWindow = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i)
    }
    return range
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            {isEditMode && (
              <button
                onClick={() => router.push('/dashboard')}
                className="mb-3 flex items-center gap-1.5 text-[12px] text-foreground/50 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Dashboard
              </button>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">
              {isEditMode ? 'Edit Your Courses' : 'Build Your Profile'}
            </h1>
            <p className="text-sm text-foreground/50">
              {isEditMode
                ? 'Update the courses you have taken. Changes will refresh your recommendations.'
                : 'Select courses you have previously taken to personalise your recommendations.'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex shrink-0 items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-surface-raised transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by course name, ID, or topic…"
            className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-border focus:ring-0 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Results count ───────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between text-[12px] text-foreground/40">
          <span>
            {query
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`
              : `${allCourses.length} courses total`}
          </span>
          {selected.size > 0 && (
            <span className="text-foreground/60">
              <span className="text-foreground font-medium">{selected.size}</span> selected
            </span>
          )}
        </div>

        {/* ── Course grid ─────────────────────────────────────────────── */}
        {loadingCourses ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-foreground/40">
            <Search className="h-8 w-8" />
            <p className="text-sm">No courses match your search</p>
            <button onClick={() => setQuery('')} className="text-[12px] text-accent hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-28">
            {pageCourses.map(course => {
              const isSelected = selected.has(course.COURSE_ID)
              return (
                <div
                  key={course.COURSE_ID}
                  onClick={() => toggle(course.COURSE_ID)}
                  className={`group relative cursor-pointer overflow-hidden rounded-lg border p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-brand bg-surface shadow-[inset_0_0_0_1px_var(--color-brand)]'
                      : 'border-border-subtle bg-surface hover:border-border hover:bg-surface-raised'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <BookOpen
                      className={`h-[17px] w-[17px] ${
                        isSelected ? 'text-brand' : 'text-foreground/30 group-hover:text-foreground/50'
                      }`}
                    />
                    <div
                      className={`flex h-[17px] w-[17px] items-center justify-center rounded-sm border transition-all ${
                        isSelected
                          ? 'border-brand bg-brand text-brand-foreground scale-100'
                          : 'border-border-subtle group-hover:border-border text-transparent'
                      }`}
                    >
                      <Check className="h-2.5 w-2.5 font-bold" />
                    </div>
                  </div>

                  <h3 className="text-[14px] font-medium text-foreground line-clamp-2 leading-snug mb-1">
                    {course.TITLE}
                  </h3>
                  <p className="text-[11px] font-mono text-foreground/30 mb-3">{course.COURSE_ID}</p>

                  <div className="flex flex-wrap gap-1">
                    {course.genres?.slice(0, 3).map(g => (
                      <span
                        key={g}
                        className="rounded border border-border-subtle bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/50"
                      >
                        {g}
                      </span>
                    ))}
                    {course.genres?.length > 3 && (
                      <span className="rounded border border-border-subtle bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/50">
                        +{course.genres.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="fixed bottom-[72px] left-0 right-0 flex justify-center pb-2 z-40 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-border-subtle bg-surface/90 backdrop-blur-md px-3 py-2 shadow-lg">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!canPrev}
                className="flex h-7 w-7 items-center justify-center rounded text-foreground/40 hover:text-foreground hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {page > 3 && (
                <>
                  <button onClick={() => setPage(1)} className="h-7 min-w-[28px] rounded px-1.5 text-[12px] text-foreground/50 hover:bg-surface-raised hover:text-foreground transition-colors">1</button>
                  {page > 4 && <span className="px-1 text-[12px] text-foreground/30">…</span>}
                </>
              )}

              {pageWindow().map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-7 min-w-[28px] rounded px-1.5 text-[12px] font-medium transition-colors ${
                    n === page
                      ? 'bg-brand text-brand-foreground'
                      : 'text-foreground/50 hover:bg-surface-raised hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}

              {page < totalPages - 2 && (
                <>
                  {page < totalPages - 3 && <span className="px-1 text-[12px] text-foreground/30">…</span>}
                  <button onClick={() => setPage(totalPages)} className="h-7 min-w-[28px] rounded px-1.5 text-[12px] text-foreground/50 hover:bg-surface-raised hover:text-foreground transition-colors">{totalPages}</button>
                </>
              )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={!canNext}
                className="flex h-7 w-7 items-center justify-center rounded text-foreground/40 hover:text-foreground hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Sticky footer CTA ───────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-x-0 border-b-0 border-t">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <p className="text-[13px] font-medium text-foreground/50">
              <span className="text-foreground font-semibold">{selected.size}</span>{' '}
              {selected.size === 1 ? 'course' : 'courses'} selected
            </p>
            <div className="flex items-center gap-3">
              {isEditMode && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="rounded-md border border-border-subtle bg-surface px-4 py-2 text-[13px] font-medium text-foreground/70 hover:bg-surface-raised hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-2 rounded-md bg-brand px-5 py-2 text-[13px] font-medium text-brand-foreground shadow-sm transition-all hover:bg-brand/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isEditMode ? 'Save Changes' : 'Continue'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function SelectCoursesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    }>
      <SelectCoursesInner />
    </Suspense>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/providers/AuthProvider'
import { BookMarked, Loader2, Plus, Trash2, Search, X } from 'lucide-react'
import { ClaripathLogo } from '@/components/ClaripathLogo'
import { api } from '@/services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { ModalPortal } from '@/components/app/ModalPortal'

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { data: session } = useSession()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadCourses = async () => {
    if (session?.user?.userType !== 'real_user') return
    try {
      setLoading(true)
      const data = await api.getMyCourses()
      setCourses(data || [])
    } catch (err) {
      console.error('Failed to load user courses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()

    const handleRefresh = () => loadCourses()
    window.addEventListener('refresh-sidebar-courses', handleRefresh)
    window.addEventListener('refresh-recommendations', handleRefresh)

    return () => {
      window.removeEventListener('refresh-sidebar-courses', handleRefresh)
      window.removeEventListener('refresh-recommendations', handleRefresh)
    }
  }, [session])

  const handleRemoveCourse = async (e, courseId) => {
    e.stopPropagation()
    if (actionLoading) return

    try {
      setActionLoading(true)
      const updatedIds = courses
        .filter((c) => (c.COURSE_ID || c.course_id) !== courseId)
        .map((c) => c.COURSE_ID || c.course_id)

      await api.saveMyCourses(updatedIds)
      await loadCourses()
      window.dispatchEvent(new CustomEvent('refresh-recommendations'))
    } catch {
      alert('Failed to remove course')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddCourse = async (course) => {
    if (actionLoading) return

    try {
      setActionLoading(true)
      const currentIds = courses.map((c) => c.COURSE_ID || c.course_id)
      if (currentIds.includes(course.COURSE_ID)) {
        setShowAddModal(false)
        return
      }

      await api.saveMyCourses([...currentIds, course.COURSE_ID])
      await loadCourses()
      setShowAddModal(false)
      window.dispatchEvent(new CustomEvent('refresh-recommendations'))
    } catch {
      alert('Failed to add course')
    } finally {
      setActionLoading(false)
    }
  }

  if (!session?.user) return null

  const isRealUser = session.user.userType === 'real_user'
  const panel = (
    <SidebarPanel
      session={session}
      isRealUser={isRealUser}
      courses={courses}
      loading={loading}
      onAdd={() => setShowAddModal(true)}
      onSelect={setSelectedCourse}
      onRemove={handleRemoveCourse}
      onMobileClose={onMobileClose}
    />
  )

  return (
    <>
      <aside className="app-sidebar fixed left-0 top-0 hidden h-dvh flex-col lg:flex">{panel}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="app-modal-overlay fixed inset-0 z-[80] lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', duration: 0.42, bounce: 0.12 }}
              className="app-sidebar fixed left-0 top-0 z-[90] flex h-dvh flex-col shadow-2xl lg:hidden"
            >
              {panel}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {selectedCourse && (
        <SeedCourseModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}

      {showAddModal && (
        <AddCourseModal
          onClose={() => setShowAddModal(false)}
          onSelect={handleAddCourse}
          existingIds={courses.map((c) => c.COURSE_ID || c.course_id)}
        />
      )}
    </>
  )
}

function SidebarPanel({
  session,
  isRealUser,
  courses,
  loading,
  onAdd,
  onSelect,
  onRemove,
  onMobileClose,
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--landing-border)] px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <ClaripathLogo height={54} />
          <p className="font-mono text-[10px] text-[var(--landing-muted)]">
            {isRealUser ? 'Your transcript' : 'Dataset profile'}
          </p>
        </div>
        <button type="button" onClick={onMobileClose} className="app-icon-btn lg:hidden" aria-label="Close">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isRealUser ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                Courses we think you took
              </p>
              <div className="flex items-center gap-1.5">
                <span className="app-match-pill tabular-nums">{loading ? '…' : courses.length}</span>
                <button
                  type="button"
                  onClick={onAdd}
                  className="app-icon-btn h-8 w-8"
                  aria-label="Add course"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {loading && courses.length === 0 ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="app-skeleton h-14" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--landing-border)] bg-[var(--landing-bg)] p-6 text-center">
                <BookMarked className="mx-auto mb-2 h-6 w-6 text-[var(--landing-muted)]" strokeWidth={1.75} />
                <p className="text-sm text-[var(--landing-muted)]">No courses yet</p>
                <button type="button" onClick={onAdd} className="landing-nav-text-btn mt-3 text-[var(--landing-accent)]">
                  Add your first course
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {courses.map((course, idx) => (
                  <div key={idx} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(course)}
                      className="app-course-row w-full pr-10 text-left"
                    >
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--landing-fg)]">
                        {course.title || course.TITLE || `Course ${course.course_id || course.COURSE_ID}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(course.genres || []).slice(0, 2).map((g) => (
                          <span key={g} className="app-tag">
                            {g}
                          </span>
                        ))}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onRemove(e, course.COURSE_ID || course.course_id)}
                      className="absolute right-2 top-2.5 rounded-md p-1 text-[var(--landing-muted)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      aria-label="Remove course"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-5">
            <p className="text-sm font-medium">Dataset user {session.user.id}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
              Recommendations are generated from historical dataset patterns for this profile.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function AddCourseModal({ onClose, onSelect, existingIds }) {
  const [search, setSearch] = useState('')
  const [allCourses, setAllCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getAllCourses()
        setAllCourses(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = allCourses
    .filter(
      (c) =>
        !existingIds.includes(c.COURSE_ID) &&
        (c.TITLE.toLowerCase().includes(search.toLowerCase()) ||
          c.COURSE_ID.toLowerCase().includes(search.toLowerCase()))
    )
    .slice(0, 50)

  return (
    <ModalPortal onClose={onClose} zIndex={110} labelledBy="add-course-title" hostClassName="!w-[min(100%,36rem)]">
      <div className="app-modal">
        <div className="app-modal-header flex items-center justify-between px-5 py-4">
          <h2 id="add-course-title" className="landing-display text-lg font-bold">
            Add taken course
          </h2>
          <button type="button" onClick={onClose} className="app-icon-btn" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-[var(--landing-border)] bg-[var(--landing-surface)] p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--landing-muted)]" />
            <input
              autoFocus
              type="text"
              placeholder="Search by title or course ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="app-input"
            />
          </div>
        </div>

        <div className="app-modal-body p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="app-skeleton h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--landing-muted)]">No matching courses found.</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((course) => (
                <button
                  key={course.COURSE_ID}
                  type="button"
                  onClick={() => onSelect(course)}
                  className="app-course-row w-full text-left"
                >
                  <p className="text-[13px] font-medium text-[var(--landing-fg)]">{course.TITLE}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--landing-muted)]">
                    {course.COURSE_ID} · {course.genres?.join(', ')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

function SeedCourseModal({ course, onClose }) {
  const title = course.title || course.TITLE || `Course ${course.course_id || course.COURSE_ID}`

  return (
    <ModalPortal onClose={onClose} labelledBy="seed-course-title" hostClassName="!w-[min(100%,32rem)]">
      <div className="app-modal">
        <div className="app-modal-header flex items-start justify-between gap-3 px-5 py-4">
          <h2 id="seed-course-title" className="landing-display pr-2 text-lg font-bold leading-snug">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="app-icon-btn shrink-0" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="app-modal-body space-y-5 p-5">
          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-accent-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--landing-accent)]">Why is this course here?</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
              This is a seed course selected because it matches skills from your onboarding answers. It helps the
              Xplaina model anchor your recommendations.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--landing-muted)]">Genres</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(course.genres || []).map((g) => (
                <span key={g} className="app-tag text-[11px]">
                  {g}
                </span>
              ))}
              {(!course.genres || course.genres.length === 0) && (
                <span className="text-sm text-[var(--landing-muted)]">No genres listed</span>
              )}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--landing-muted)]">Course ID</p>
            <p className="mt-1 font-mono text-sm text-[var(--landing-fg)]">
              {course.course_id || course.COURSE_ID}
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

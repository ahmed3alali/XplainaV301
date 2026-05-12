'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { adminUsers } from '@/services/adminApi'
import {
  Search, Download, Loader2, ChevronLeft, ChevronRight,
  Trash2, User, BookOpen, Calendar, X, CheckCircle, XCircle, AlertTriangle, Key,
} from 'lucide-react'

// ── User Detail Slide-over ────────────────────────────────────────────────────

function UserDetailPanel({ user, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState({ email: user.email, is_active: user.is_active })

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await adminUsers.update(user.id, form)
      onUpdate(updated)
      setEditing(false)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters.')
      return
    }
    setChangingPw(true)
    try {
      await adminUsers.changePassword(user.id, newPassword)
      alert('Password updated successfully.')
      setNewPassword('')
    } catch (err) {
      alert(err?.response?.data?.detail || 'Password update failed')
    } finally {
      setChangingPw(false)
    }
  }


  const fields = [
    { label: 'User ID', value: user.id, mono: true },
    { label: 'Email', value: user.email },
    { label: 'Education Level', value: user.education_level || '—' },
    { label: 'College Year', value: user.college_year || '—' },
    { label: 'Course Selections', value: user.course_count },
    { label: 'Registered', value: new Date(user.created_at).toLocaleString() },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-[#0a0a18] border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center border border-indigo-500/20">
              <span className="text-sm font-bold text-indigo-300">
                {user.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                {user.full_name || user.email}
              </p>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                user.is_active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {fields.map(({ label, value, mono }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</span>
              <span className={`text-sm text-white/80 break-all ${mono ? 'font-mono text-xs text-indigo-300' : ''}`}>
                {String(value)}
              </span>
            </div>
          ))}

          {user.interest_text && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Interest</span>
              <p className="text-sm text-white/70 leading-relaxed">{user.interest_text}</p>
            </div>
          )}

          {user.selected_skills?.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {user.selected_skills.map(skill => (
                  <span key={skill} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Edit section */}
          {editing ? (
            <div className="space-y-3 pt-4 border-t border-white/[0.05]">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Edit User</p>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Email</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#080810] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/40">Active</label>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 text-sm font-medium py-2 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="w-full mt-4 py-2.5 rounded-lg border border-white/[0.06] text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all">
              Edit User
            </button>
          )}

          {/* Password change section */}
          <div className="space-y-3 pt-6 border-t border-white/[0.05]">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Reset Password</p>
            <div>
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-[#080810] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPw || !newPassword}
              className="w-full bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-300 text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {changingPw ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              Update Student Password
            </button>
          </div>
        </div>
      </div>
    </div>

  )
}

// ── Confirm Delete Dialog ─────────────────────────────────────────────────────

function ConfirmDialog({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0e0e1a] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-base font-bold text-white text-center mb-2">Delete User?</h3>
        <p className="text-sm text-white/50 text-center mb-6">
          This will permanently delete <strong className="text-white/80">{user.email}</strong> and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-white/[0.05] text-white/60 text-sm font-medium hover:bg-white/[0.08] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Users Page ───────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [data, setData] = useState({ data: [], total: 0, total_pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [hasCourses, setHasCourses] = useState(null)
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const searchTimeout = useRef(null)

  const fetchUsers = useCallback(async (p = 1, q = search, hc = hasCourses) => {
    setLoading(true)
    setError('')
    try {
      const res = await adminUsers.list({ page: p, search: q, has_courses: hc })
      setData(res)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [search, hasCourses])

  useEffect(() => { fetchUsers(1) }, [])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchUsers(1, val, hasCourses)
    }, 400)
  }

  const handleFilter = (val) => {
    setHasCourses(val)
    setPage(1)
    fetchUsers(1, search, val)
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchUsers(newPage)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await adminUsers.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Check your connection.')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminUsers.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchUsers(page)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const handleUserUpdate = (updated) => {
    setData(d => ({
      ...d,
      data: d.data.map(u => u.id === updated.id ? updated : u),
    }))
    setSelectedUser(updated)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {data.total.toLocaleString()} total users
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          id="export-csv-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            id="user-search"
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-full bg-[#0e0e1a] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {[
            { label: 'All', val: null },
            { label: 'Has Courses', val: true },
            { label: 'No Courses', val: false },
          ].map(({ label, val }) => (
            <button
              key={label}
              onClick={() => handleFilter(val)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                hasCourses === val
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-[#0e0e1a] border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-[#0e0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['User', 'Education', 'Courses', 'Status', 'Registered', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded-lg bg-white/[0.04] animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-white/30 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                data.data.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-300">
                            {user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white/90 text-sm">{user.email}</p>
                          {user.full_name && <p className="text-xs text-white/40">{user.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/50 text-xs">
                      {user.education_level || '—'}
                      {user.college_year && ` · ${user.college_year}`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-white/30" />
                        <span className={`text-sm font-semibold ${user.course_count > 0 ? 'text-indigo-300' : 'text-white/30'}`}>
                          {user.course_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        user.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {user.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-white/40 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.total_pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.05]">
            <p className="text-xs text-white/30">
              Page {data.page} of {data.total_pages} · {data.total} users
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => handlePageChange(page + 1)}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User detail slide-over */}
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUserUpdate}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}

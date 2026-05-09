'use client'

import { useEffect, useState } from 'react'
import { adminAdmins } from '@/services/adminApi'
import {
  ShieldCheck, ShieldAlert, Loader2, ToggleLeft, ToggleRight,
  CheckCircle, XCircle, UserCog, Calendar, Key, Plus, X,
} from 'lucide-react'

function getRoleBadge(role) {
  if (role === 'superadmin') {
    return 'bg-violet-500/15 text-violet-300 border-violet-500/25'
  }
  return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
}

function AdminRow({ admin, currentAdminId, onToggle, toggling, onChangePassword }) {
  const isSelf = admin.id === currentAdminId
  const [showPw, setShowPw] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [changing, setChanging] = useState(false)

  const handlePw = async () => {
    if (newPw.length < 8) return alert('Min 8 chars')
    setChanging(true)
    try {
      await onChangePassword(admin.id, newPw)
      setNewPw('')
      setShowPw(false)
      alert('Password updated')
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed')
    } finally {
      setChanging(false)
    }
  }

  return (
    <>
      <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border flex-shrink-0 ${
              admin.role === 'superadmin'
                ? 'bg-violet-500/20 border-violet-500/30'
                : 'bg-indigo-500/20 border-indigo-500/30'
            }`}>
              {admin.role === 'superadmin'
                ? <ShieldAlert className="w-4 h-4 text-violet-300" />
                : <ShieldCheck className="w-4 h-4 text-indigo-300" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white/90">{admin.email}</p>
                {isSelf && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
              {admin.full_name && <p className="text-xs text-white/40">{admin.full_name}</p>}
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getRoleBadge(admin.role)}`}>
            {admin.role === 'superadmin' ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            {admin.role}
          </span>
        </td>
        <td className="px-5 py-4">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
            admin.is_active
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-white/[0.04] text-white/30 border-white/[0.06]'
          }`}>
            {admin.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {admin.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-5 py-4 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(admin.created_at).toLocaleDateString()}
          </div>
        </td>
        <td className="px-5 py-4 text-xs text-white/40">
          {admin.last_login_at
            ? new Date(admin.last_login_at).toLocaleString()
            : '—'}
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPw(!showPw)}
              className="p-1.5 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
              title="Change Password"
            >
              <Key className="w-4 h-4" />
            </button>
            {!isSelf && (
              <button
                onClick={() => onToggle(admin)}
                disabled={toggling === admin.id}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                  admin.is_active
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                {toggling === admin.id ? <Loader2 className="w-3 h-3 animate-spin" /> : admin.is_active ? 'Deactivate' : 'Activate'}
              </button>
            )}
          </div>
        </td>
      </tr>
      {showPw && (
        <tr className="bg-indigo-500/[0.03] border-b border-white/[0.03]">
          <td colSpan={6} className="px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">New Password:</span>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min 8 characters"
                className="bg-[#080810] border border-white/[0.08] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 w-48"
              />
              <button
                onClick={handlePw}
                disabled={changing || !newPw}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-all disabled:opacity-50"
              >
                Update Password
              </button>
              <button onClick={() => setShowPw(false)} className="text-white/20 hover:text-white/40 text-xs">Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}


export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [error, setError] = useState('')
  const [currentAdminId, setCurrentAdminId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', password: '', full_name: '', role: 'admin' })
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      const newAdmin = await adminAdmins.create(addForm)
      setAdmins(prev => [newAdmin, ...prev])
      setShowAdd(false)
      setAddForm({ email: '', password: '', full_name: '', role: 'admin' })
      alert('Admin created successfully')
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to create admin')
    } finally {
      setAdding(false)
    }
  }

  const handlePwChange = async (adminId, newPw) => {
    await adminAdmins.changePassword(adminId, newPw)
  }

  useEffect(() => {
    const user = localStorage.getItem('adminUser')
    if (user) {
      try { setCurrentAdminId(JSON.parse(user).id) } catch { /* ignore */ }
    }
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminAdmins.list()
      setAdmins(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load admins.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (admin) => {
    setToggling(admin.id)
    try {
      if (admin.is_active) {
        await adminAdmins.deactivate(admin.id)
        setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: false } : a))
      } else {
        const updated = await adminAdmins.update(admin.id, { is_active: true })
        setAdmins(prev => prev.map(a => a.id === admin.id ? updated : a))
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Action failed — superadmin role required.')
    } finally {
      setToggling(null)
    }
  }

  const activeCount = admins.filter(a => a.is_active).length
  const superCount = admins.filter(a => a.role === 'superadmin').length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admins</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {activeCount} active · {superCount} superadmin{superCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-white text-sm font-semibold transition-all"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Add Manually
          </button>
          <a
            href="/admin/admins/invite"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <UserCog className="w-4 h-4" />
            Invite Link
          </a>
        </div>
      </div>

      {showAdd && (
        <div className="bg-[#0e0e1a] border border-indigo-500/20 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Create Admin Manually</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email"
              required
              value={addForm.email}
              onChange={e => setAddForm({ ...addForm, email: e.target.value })}
              className="bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50"
            />
            <input
              type="password"
              placeholder="Password"
              required
              minLength={8}
              value={addForm.password}
              onChange={e => setAddForm({ ...addForm, password: e.target.value })}
              className="bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={addForm.full_name}
              onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
              className="bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50"
            />
            <select
              value={addForm.role}
              onChange={e => setAddForm({ ...addForm, role: e.target.value })}
              className="bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 appearance-none"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={adding}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Admin Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-6 py-2.5 bg-white/[0.05] text-white/50 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total Admins', value: admins.length, color: 'indigo' },
          { label: 'Active', value: activeCount, color: 'emerald' },
          { label: 'Superadmins', value: superCount, color: 'violet' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`px-4 py-2 rounded-xl border text-sm flex items-center gap-2 ${
            color === 'emerald'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : color === 'violet'
                ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
          }`}>
            <span className="font-bold">{value}</span>
            <span className="text-white/40 text-xs">{label}</span>
          </div>
        ))}
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
                {['Admin', 'Role', 'Status', 'Created', 'Last Login', 'Action'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded-lg bg-white/[0.04] animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-white/30 text-sm">
                    No admins found
                  </td>
                </tr>
              ) : (
                admins.map(admin => (
                  <AdminRow
                    key={admin.id}
                    admin={admin}
                    currentAdminId={currentAdminId}
                    onToggle={handleToggle}
                    toggling={toggling}
                    onChangePassword={handlePwChange}
                  />

                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

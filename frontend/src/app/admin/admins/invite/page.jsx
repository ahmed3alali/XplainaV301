'use client'

import { useEffect, useState } from 'react'
import { adminInvites } from '@/services/adminApi'
import {
  Key, Copy, Check, Trash2, Loader2, Plus, Clock, UserCheck,
  ShieldCheck, ShieldAlert, ExternalLink,
} from 'lucide-react'

function InviteCard({ invite, onRevoke, revoking }) {
  const [copied, setCopied] = useState(false)
  const expired = new Date(invite.expires_at) < new Date()
  const registerUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/register?token=${invite.token}`

  const copyLink = () => {
    navigator.clipboard.writeText(registerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusColor = invite.used
    ? 'border-white/[0.06] bg-white/[0.02]'
    : expired
      ? 'border-amber-500/20 bg-amber-500/[0.03]'
      : 'border-indigo-500/20 bg-indigo-500/[0.03]'

  return (
    <div className={`rounded-2xl border p-5 space-y-4 transition-all ${statusColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${
            invite.role === 'superadmin'
              ? 'bg-violet-500/20 border-violet-500/30'
              : 'bg-indigo-500/20 border-indigo-500/30'
          }`}>
            {invite.role === 'superadmin'
              ? <ShieldAlert className="w-4 h-4 text-violet-300" />
              : <ShieldCheck className="w-4 h-4 text-indigo-300" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {invite.email || 'Open invite'}
            </p>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
              invite.role === 'superadmin'
                ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
            }`}>
              {invite.role}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border flex-shrink-0 ${
          invite.used
            ? 'bg-white/[0.04] text-white/30 border-white/[0.06]'
            : expired
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {invite.used ? 'Used' : expired ? 'Expired' : 'Active'}
        </span>
      </div>

      {/* Token + copy */}
      {!invite.used && !expired && (
        <div className="bg-[#080810] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
          <code className="flex-1 text-[11px] text-indigo-300/80 font-mono truncate">
            {invite.token}
          </code>
          <button
            onClick={copyLink}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.06] hover:bg-white/[0.10] text-white/60 border border-white/[0.08]'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-white/30">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Expires {new Date(invite.expires_at).toLocaleString()}
        </span>
        {!invite.used && (
          <button
            onClick={() => onRevoke(invite.id)}
            disabled={revoking === invite.id}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
          >
            {revoking === invite.id
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Trash2 className="w-3 h-3" />
            }
            Revoke
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminInvitePage() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'admin', expires_in_hours: 48 })
  const [newInvite, setNewInvite] = useState(null)

  const fetchInvites = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminInvites.list()
      setInvites(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load invites. Superadmin access required.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvites() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const invite = await adminInvites.create({
        email: form.email || undefined,
        role: form.role,
        expires_in_hours: Number(form.expires_in_hours),
      })
      setNewInvite(invite)
      setInvites(prev => [invite, ...prev])
      setShowForm(false)
      setForm({ email: '', role: 'admin', expires_in_hours: 48 })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create invite.')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (inviteId) => {
    setRevoking(inviteId)
    try {
      await adminInvites.revoke(inviteId)
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Revoke failed.')
    } finally {
      setRevoking(null)
    }
  }

  const activeInvites = invites.filter(i => !i.used && new Date(i.expires_at) > new Date())
  const usedInvites = invites.filter(i => i.used)
  const expiredInvites = invites.filter(i => !i.used && new Date(i.expires_at) <= new Date())

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Invite Links</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Generate secure one-time invite tokens for new admins
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          New Invite
        </button>
      </div>

      {/* How it works banner */}
      <div className="bg-indigo-500/[0.06] border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
        <Key className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-white/50 leading-relaxed">
          <span className="text-indigo-300 font-semibold">Secure invite-only registration.</span>{' '}
          Generate a one-time token, share the link with the new admin, and they can register.
          Tokens are single-use and expire automatically. No static secrets are ever used.
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* New invite form */}
      {showForm && (
        <div className="bg-[#0e0e1a] border border-indigo-500/20 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">Create Invite Token</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Email (optional — pre-assign to a specific person)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@company.com"
                className="w-full bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/60 transition-all appearance-none"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Expires In</label>
                <select
                  value={form.expires_in_hours}
                  onChange={e => setForm(f => ({ ...f, expires_in_hours: e.target.value }))}
                  className="w-full bg-[#080810] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/60 transition-all appearance-none"
                >
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Key className="w-4 h-4" />Generate Token</>}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-sm font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Newly created invite spotlight */}
      {newInvite && !newInvite.used && (
        <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <UserCheck className="w-4 h-4" />
            Invite created — share this link
          </div>
          <div className="bg-[#080810] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
            <code className="flex-1 text-xs text-emerald-300/80 font-mono break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/admin/register?token={newInvite.token}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/admin/register?token=${newInvite.token}`
                )
              }}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <p className="text-xs text-white/30">
            Expires: {new Date(newInvite.expires_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* Invite lists */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : (
        <>
          {activeInvites.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Active ({activeInvites.length})
              </h3>
              {activeInvites.map(inv => (
                <InviteCard key={inv.id} invite={inv} onRevoke={handleRevoke} revoking={revoking} />
              ))}
            </section>
          )}

          {expiredInvites.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Expired ({expiredInvites.length})
              </h3>
              {expiredInvites.map(inv => (
                <InviteCard key={inv.id} invite={inv} onRevoke={handleRevoke} revoking={revoking} />
              ))}
            </section>
          )}

          {usedInvites.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                Used ({usedInvites.length})
              </h3>
              {usedInvites.map(inv => (
                <InviteCard key={inv.id} invite={inv} onRevoke={handleRevoke} revoking={revoking} />
              ))}
            </section>
          )}

          {invites.length === 0 && !showForm && (
            <div className="text-center py-16 text-white/30 text-sm">
              <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No invite tokens yet. Create one to onboard a new admin.
            </div>
          )}
        </>
      )}
    </div>
  )
}

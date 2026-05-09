'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { adminAuth } from '@/services/adminApi'
import { ShieldCheck, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'
import { Suspense } from 'react'

function RegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillToken = searchParams.get('token') || ''

  const [form, setForm] = useState({
    invite_token: prefillToken,
    email: '',
    password: '',
    full_name: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await adminAuth.register(
        form.invite_token, form.email, form.password, form.full_name
      )
      localStorage.setItem('adminToken', data.access_token)
      localStorage.setItem('adminUser', JSON.stringify({
        id: data.admin_id,
        email: data.email,
        role: data.role,
      }))
      router.push('/admin/dashboard')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/8 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-[440px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Admin Account</h1>
          <p className="text-sm text-white/40 mt-1">You need a valid invite token to register</p>
        </div>

        <div className="bg-[#0e0e1a] border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { key: 'invite_token', label: 'Invite Token', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
              { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@xplaina.com' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  required
                  className="w-full bg-[#080810] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-[#080810] border border-white/[0.08] rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" />Create Admin Account</>}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/[0.04] text-center">
            <a href="/admin/login" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminRegisterPage() {
  return <Suspense fallback={null}><RegisterInner /></Suspense>
}

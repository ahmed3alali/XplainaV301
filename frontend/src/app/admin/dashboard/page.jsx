'use client'

import { useEffect, useState } from 'react'
import { adminStats } from '@/services/adminApi'
import {
  Users, ShieldCheck, BookOpen, TrendingUp, Loader2, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'

function StatCard({ icon: Icon, label, value, delta, color = 'indigo', loading }) {
  const colorMap = {
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
  }
  const cls = colorMap[color] || colorMap.indigo

  return (
    <div className={`relative rounded-2xl border bg-gradient-to-br ${cls} p-6 overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">{label}</p>
          {loading ? (
            <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-white tabular-nums">
              {value?.toLocaleString() ?? '—'}
            </p>
          )}
          {delta !== undefined && !loading && (
            <p className="text-xs mt-2 text-white/40">
              <span className="text-emerald-400 font-semibold">+{delta}</span> this week
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05]`}>
          <Icon className={`w-5 h-5 ${cls.split(' ').find(c => c.startsWith('text-'))}`} />
        </div>
      </div>
      {/* Subtle glow */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 bg-current" />
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0e0e1a] border border-white/10 rounded-xl px-4 py-3 text-sm">
        <p className="text-white/50 text-xs mb-1">{label}</p>
        <p className="font-semibold text-indigo-300">{payload[0].value} registrations</p>
      </div>
    )
  }
  return null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminStats.get()
      setStats(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load stats.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const chartData = stats?.registrations_last_30_days?.map(d => ({
    date: d.date.slice(5), // "MM-DD"
    count: d.count,
  })) || []

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">System overview and analytics</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] text-sm text-white/60 hover:text-white/80 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users} label="Total Users" color="indigo"
          value={stats?.total_users} delta={stats?.new_users_this_week} loading={loading}
        />
        <StatCard
          icon={TrendingUp} label="New This Week" color="emerald"
          value={stats?.new_users_this_week} loading={loading}
        />
        <StatCard
          icon={ShieldCheck} label="Active Admins" color="violet"
          value={stats?.active_admins} loading={loading}
        />
        <StatCard
          icon={BookOpen} label="Course Selections" color="amber"
          value={stats?.total_course_selections} loading={loading}
        />
      </div>

      {/* Chart */}
      <div className="bg-[#0e0e1a] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">User Registrations</h2>
            <p className="text-xs text-white/40 mt-0.5">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs text-white/40">Daily signups</span>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-white/30 text-sm">
            No registration data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                axisLine={false} tickLine={false} allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="count" stroke="#6366f1"
                strokeWidth={2} fill="url(#colorCount)" dot={false}
                activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { href: '/admin/users', label: 'Manage Users', desc: 'View, edit, and export all users', icon: Users, color: 'indigo' },
          { href: '/admin/admins', label: 'Manage Admins', desc: 'Control admin access and roles', icon: ShieldCheck, color: 'violet' },
        ].map(({ href, label, desc, icon: Icon, color }) => (
          <a
            key={href} href={href}
            className={`group flex items-center gap-4 p-5 rounded-2xl border bg-[#0e0e1a] hover:bg-[#12122a] border-white/[0.06] hover:border-indigo-500/30 transition-all`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              color === 'violet' ? 'bg-violet-500/15' : 'bg-indigo-500/15'
            }`}>
              <Icon className={`w-5 h-5 ${color === 'violet' ? 'text-violet-400' : 'text-indigo-400'}`} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-xs text-white/40 mt-0.5">{desc}</p>
            </div>
            <div className="ml-auto text-white/20 group-hover:text-white/50 transition-colors">
              →
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, ShieldCheck, LogOut,
  Menu, X, ChevronRight, Settings, Key,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { href: '/admin/admins/invite', label: 'Invite Links', icon: Key },
]

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminUser, setAdminUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auth guard — runs client-side
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    const user = localStorage.getItem('adminUser')
    const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register'

    if (!token && !isAuthPage) {
      router.replace('/admin/login')
      return
    }
    if (user) {
      try { setAdminUser(JSON.parse(user)) } catch { /* ignore */ }
    }
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    router.push('/admin/login')
  }

  // Auth pages get bare layout
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register'
  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 w-64 bg-[#0a0a18] border-r border-white/[0.05] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.05]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">XplainaV301</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-400' : 'text-white/30 group-hover:text-white/50'}`} />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-indigo-400/60" />}
              </Link>
            )
          })}
        </nav>

        {/* Admin info + logout */}
        <div className="px-3 py-4 border-t border-white/[0.05]">
          {adminUser && (
            <div className="px-3 py-2 mb-2 rounded-lg bg-white/[0.03]">
              <p className="text-xs font-medium text-white/80 truncate">
                {adminUser.full_name || adminUser.email}
              </p>
              <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                adminUser.role === 'superadmin'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {adminUser.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-[#080810]/80 backdrop-blur-md border-b border-white/[0.04]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/40 hover:text-white/80 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-white/30">
              {NAV_ITEMS.find(n => pathname.startsWith(n.href))?.label || 'Admin'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-white/30">
              {adminUser?.email}
            </span>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              {(adminUser?.full_name || adminUser?.email || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

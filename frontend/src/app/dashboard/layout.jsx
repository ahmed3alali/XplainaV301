'use client'

import { useState } from 'react'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import Sidebar from '@/components/Sidebar'
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar'

function DashboardShell({ children }) {
  const { theme, mounted } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell min-h-dvh" data-theme={mounted ? theme : 'light'}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-[var(--app-sidebar-width)]">
        <DashboardTopBar onMenuClick={() => setMobileOpen(true)} />
        {children}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <ThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  )
}

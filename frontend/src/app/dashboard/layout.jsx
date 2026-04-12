import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 w-full lg:pl-80 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}

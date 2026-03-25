import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ title, children }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={
        isMobile
          ? `fixed inset-y-0 left-0 z-50 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'relative shrink-0'
      }>
        <Sidebar
          collapsed={isMobile ? false : collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onClose={() => setMobileOpen(false)}
          isMobile={isMobile}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          title={title}
          onMenuClick={() => setMobileOpen(v => !v)}
          isMobile={isMobile}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f7f6f2]">
          {children}
        </main>
      </div>
    </div>
  )
}

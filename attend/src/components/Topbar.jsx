import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'

export default function Topbar({ title, onMenuClick, isMobile }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(r => setUnread(r.data.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-black/8 bg-[#f7f6f2]">
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/8 text-[#17184a] text-xl font-bold"
            aria-label="Open menu"
          >
            ☰
          </button>
        )}
        <h1 className="font-serif text-lg md:text-xl font-medium text-[#111318]">{title}</h1>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <Link to="/notifications" className="relative">
          <span className="text-lg">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#684df4] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setOpen(v => !v)}>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-[#684df4]/30 hover:border-[#684df4] transition-colors"
              />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-[#684df4]/20 hover:border-[#684df4] transition-colors"
                style={{ background: '#684df4' }}>
                <span className="text-white text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-black/8 z-50 overflow-hidden">
              <Link to="/settings" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 border-b border-black/8">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#684df4' }}>
                    <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111318] truncate">{user?.name}</p>
                  <p className="text-xs text-black/40 capitalize">{user?.role}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

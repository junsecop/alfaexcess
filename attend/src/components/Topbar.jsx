import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function Topbar({ title, onMenuClick, isMobile }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(r => setUnread(r.data.count))
      .catch(() => {})
  }, [])

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
        <Link to="/settings">
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
        </Link>
      </div>
    </header>
  )
}

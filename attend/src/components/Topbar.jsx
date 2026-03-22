import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function Topbar({ title }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get('/notifications/unread-count')
      .then(r => setUnread(r.data.count))
      .catch(() => {})
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-black/8 bg-[#f7f6f2]">
      <h1 className="font-serif text-xl font-medium text-[#111318]">{title}</h1>
      <div className="flex items-center gap-4">
        <Link to="/notifications" className="relative">
          <span className="text-lg">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#c8f04a] text-[#111318] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <Link to="/settings">
          <div className="w-8 h-8 rounded-full bg-[#c8f04a] flex items-center justify-center">
            <span className="text-[#111318] text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  )
}

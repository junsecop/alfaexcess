import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const TYPE_ICONS = {
  bill: '₹',
  task: '✓',
  attendance: '📅',
  sync: '↑',
  system: '⚙',
}

const TYPE_COLORS = {
  bill: 'bg-purple-100 text-purple-700',
  task: 'bg-blue-100 text-blue-700',
  attendance: 'bg-green-100 text-green-700',
  sync: 'bg-yellow-100 text-yellow-700',
  system: 'bg-gray-100 text-gray-600',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/notifications').then(r => {
      setNotifications(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAll = async () => {
    await api.patch('/notifications/read-all')
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }

  const deleteN = async (id) => {
    await api.delete(`/notifications/${id}`)
    setNotifications(ns => ns.filter(n => n.id !== id))
  }

  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter(n => !n.read) : notifications.filter(n => n.type === filter)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Layout title="Notifications">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[#17184a]">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#684df4' }}>
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAll} className="text-sm font-medium underline" style={{ color: '#684df4' }}>
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'unread', 'bill', 'task', 'attendance', 'system'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'text-white' : 'bg-black/5 text-black/50 hover:bg-black/10'}`}
              style={filter === f ? { background: '#684df4' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#684df4', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-black/8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#684df4' + '20' }}>
              <span className="text-xl">🔔</span>
            </div>
            <p className="text-sm text-black/40">No notifications</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(n => (
            <div key={n.id}
              className={`bg-white rounded-2xl p-4 border transition-all ${!n.read ? 'shadow-sm' : 'border-black/8 opacity-70'}`}
              style={!n.read ? { borderColor: '#684df4' + '40' } : {}}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${TYPE_COLORS[n.type] || 'bg-gray-100'}`}>
                  {TYPE_ICONS[n.type] || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#17184a]">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#684df4' }} />}
                  </div>
                  <p className="text-xs text-black/50 mt-0.5">{n.message}</p>
                  <p className="text-xs text-black/30 mt-1">
                    {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0 items-end">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)}
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ color: '#684df4', background: '#684df4' + '15' }}>
                      Read
                    </button>
                  )}
                  <button onClick={() => deleteN(n.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                </div>
              </div>
              {n.link && (
                <a href={n.link} className="mt-2 text-xs font-medium underline block" style={{ color: '#684df4' }}>
                  View →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

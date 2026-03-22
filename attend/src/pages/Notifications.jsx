import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const TYPE_ICONS = {
  bill: '₹',
  task: '⚑',
  attendance: '✓',
  sync: '↑',
  system: '⚙',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications').then(r => {
      setNotifications(r.data)
      setLoading(false)
    })
  }, [])

  const markRead = async (id) => {
    const r = await api.patch(`/notifications/${id}/read`)
    setNotifications(ns => ns.map(n => n._id === id ? r.data : n))
  }

  const markAll = async () => {
    await api.patch('/notifications/read-all')
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }

  const deleteN = async (id) => {
    await api.delete(`/notifications/${id}`)
    setNotifications(ns => ns.filter(n => n._id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Layout title="Notifications">
      <div className="max-w-2xl mx-auto space-y-4">
        {unreadCount > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-black/50">{unreadCount} unread</p>
            <button onClick={markAll}
              className="text-sm font-medium text-[#111318] underline">
              Mark all as read
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-3 border-[#c8f04a] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-black/8">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-sm text-black/40">No notifications yet</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id}
              className={`bg-white rounded-2xl p-4 border transition-all ${n.read ? 'border-black/8 opacity-60' : 'border-[#c8f04a]/40 shadow-sm'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${n.read ? 'bg-black/5' : 'bg-[#c8f04a]'}`}>
                  {TYPE_ICONS[n.type] || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111318]">{n.title}</p>
                  <p className="text-xs text-black/50 mt-0.5">{n.message}</p>
                  <p className="text-xs text-black/30 mt-1">
                    {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n._id)} className="text-xs text-black/40 hover:text-black">
                      Mark read
                    </button>
                  )}
                  <button onClick={() => deleteN(n._id)} className="text-xs text-red-400 hover:text-red-600">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

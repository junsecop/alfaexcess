import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-black/8 flex flex-col gap-1">
      <p className="text-xs text-black/40 font-medium uppercase tracking-wide">{label}</p>
      <p className="font-serif text-3xl font-semibold" style={{ color: color || '#17184a' }}>{value}</p>
      {sub && <p className="text-xs text-black/30">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [today, setToday] = useState(null)
  const [stats, setStats] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [showCheckoutMenu, setShowCheckoutMenu] = useState(false)
  const [msg, setMsg] = useState('')

  const month = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    api.get('/attendance/today').then(r => setToday(r.data))
    if (['admin', 'manager'].includes(user?.role)) {
      api.get(`/attendance/stats?month=${month}`).then(r => setStats(r.data))
    }
  }, [user?.role, month])

  const handleCheckIn = async () => {
    setCheckingIn(true)
    setMsg('')
    try {
      const r = await api.post('/attendance/checkin')
      setToday(r.data)
      setMsg('Checked in successfully')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async (halfDay = false) => {
    setCheckingOut(true)
    setShowCheckoutMenu(false)
    setMsg('')
    try {
      const r = await api.post('/attendance/checkout', { halfDay })
      setToday(r.data)
      setMsg(halfDay ? 'Half day marked' : 'Checked out successfully')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
    } finally {
      setCheckingOut(false)
    }
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const statusStyle = {
    present: 'bg-green-100 text-green-700',
    late: 'bg-yellow-100 text-yellow-700',
    half_day: 'bg-purple-100 text-purple-700',
    absent: 'bg-red-100 text-red-700',
    leave: 'bg-blue-100 text-blue-700',
  }

  return (
    <Layout title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">

        {/* Welcome bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl md:text-2xl font-medium" style={{ color: '#17184a' }}>
              {now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'},{' '}
              <span>{user?.name?.split(' ')[0]}</span>
            </h2>
            <p className="text-xs text-black/40 mt-0.5">{dateStr} · {timeStr}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize text-white shrink-0"
            style={{ background: '#684df4' }}>
            {user?.role}
          </span>
        </div>

        {/* Attendance card */}
        {['admin', 'manager', 'staff'].includes(user?.role) && (
          <div className="bg-white rounded-2xl p-5 border border-black/8">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/40 mb-4">Today's Attendance</p>

            {today?.checkIn ? (
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="bg-black/3 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
                  <p className="text-xs text-black/40 mb-1">Check In</p>
                  <p className="text-lg font-semibold" style={{ color: '#17184a' }}>{today.checkIn}</p>
                </div>
                {today.checkOut ? (
                  <div className="bg-black/3 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
                    <p className="text-xs text-black/40 mb-1">Check Out</p>
                    <p className="text-lg font-semibold" style={{ color: '#17184a' }}>{today.checkOut}</p>
                  </div>
                ) : null}
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle[today.status] || 'bg-gray-100'}`}>
                    {today.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4 p-4 rounded-xl" style={{ background: '#684df4' + '10' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: '#684df4' }} />
                <p className="text-sm text-black/50">Not checked in yet</p>
              </div>
            )}

            {msg && (
              <p className="text-xs font-medium mb-3 px-3 py-2 rounded-lg bg-green-50 text-green-700">{msg}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCheckIn}
                disabled={!!today?.checkIn || checkingIn}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition text-white"
                style={{ background: '#684df4' }}
              >
                {checkingIn ? 'Checking in…' : 'Check In'}
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() => setShowCheckoutMenu(v => !v)}
                  disabled={!today?.checkIn || !!today?.checkOut || checkingOut}
                  className="w-full py-3 rounded-xl text-sm font-semibold border border-black/15 disabled:opacity-40 transition hover:bg-black/5 flex items-center justify-center gap-1"
                  style={{ color: '#17184a' }}
                >
                  {checkingOut ? 'Checking out…' : 'Check Out'}
                  {!today?.checkOut && today?.checkIn && (
                    <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {showCheckoutMenu && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-black/10 shadow-lg z-10 overflow-hidden">
                    <button
                      onClick={() => handleCheckOut(false)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 transition font-medium"
                      style={{ color: '#17184a' }}
                    >
                      Full Day
                      <p className="text-xs text-black/40 font-normal">Normal checkout</p>
                    </button>
                    <div className="border-t border-black/5" />
                    <button
                      onClick={() => handleCheckOut(true)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50 transition font-medium text-purple-700"
                    >
                      Half Day
                      <p className="text-xs text-purple-400 font-normal">Mark as half-day leave</p>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats (admin/manager) */}
        {stats && (
          <div>
            <p className="text-xs text-black/40 font-semibold uppercase tracking-wide mb-3">
              This month — {month}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Present" value={stats.present || 0} color="#684df4" />
              <StatCard label="Late" value={stats.late || 0} color="#f59e0b" />
              <StatCard label="Absent" value={stats.absent || 0} color="#ef4444" />
              <StatCard label="Leave" value={(stats.leave || 0) + (stats.half_day || 0)} sub="incl. half-day" color="#3b82f6" />
            </div>
          </div>
        )}

        {/* Quick links (mobile friendly) */}
        <div>
          <p className="text-xs text-black/40 font-semibold uppercase tracking-wide mb-3">Quick Access</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Attendance', icon: '📅', href: '/attendance' },
              { label: 'Billing', icon: '₹', href: '/billing' },
              { label: 'Work Log', icon: '✓', href: '/work-log' },
              { label: 'Notifications', icon: '🔔', href: '/notifications' },
            ].map(q => (
              <a key={q.label} href={q.href}
                className="bg-white rounded-2xl p-4 border border-black/8 flex flex-col items-center gap-2 hover:shadow-sm transition-shadow">
                <span className="text-2xl">{q.icon}</span>
                <span className="text-xs font-medium text-black/60">{q.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

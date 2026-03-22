import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/8">
      <p className="text-xs text-black/40 font-medium uppercase tracking-wide mb-3">{label}</p>
      <p className="font-serif text-3xl font-medium text-[#111318]">{value}</p>
      {sub && <p className="text-xs text-black/40 mt-1">{sub}</p>}
      {accent && (
        <div className="mt-3 h-1 w-12 rounded-full" style={{ background: '#c8f04a' }} />
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [today, setToday] = useState(null)
  const [stats, setStats] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
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

  const handleCheckOut = async () => {
    setCheckingOut(true)
    setMsg('')
    try {
      const r = await api.post('/attendance/checkout')
      setToday(r.data)
      setMsg('Checked out successfully')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error')
    } finally {
      setCheckingOut(false)
    }
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Layout title="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#111318]">
              Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              {user?.name?.split(' ')[0]}
            </h2>
            <p className="text-sm text-black/40 mt-0.5">{dateStr} · {timeStr}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
            style={{ background: '#c8f04a', color: '#111318' }}>
            {user?.role}
          </span>
        </div>

        {/* Check in/out card */}
        {['admin', 'manager', 'staff'].includes(user?.role) && (
          <div className="bg-white rounded-2xl p-6 border border-black/8 flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#111318] mb-1">Today's Attendance</p>
              {today ? (
                <div className="space-y-1">
                  <p className="text-xs text-black/50">
                    Check-in: <span className="font-semibold text-[#111318]">{today.checkIn || '—'}</span>
                    {today.checkOut && (
                      <> &nbsp;·&nbsp; Check-out: <span className="font-semibold text-[#111318]">{today.checkOut}</span></>
                    )}
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize
                    ${today.status === 'present' ? 'bg-green-100 text-green-700'
                    : today.status === 'late' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'}`}>
                    {today.status}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-black/40">Not checked in yet</p>
              )}
              {msg && <p className="text-xs mt-2 text-[#c8f04a]">{msg}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCheckIn}
                disabled={!!today?.checkIn || checkingIn}
                className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition"
                style={{ background: '#c8f04a', color: '#111318' }}
              >
                {checkingIn ? '…' : 'Check In'}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={!today?.checkIn || !!today?.checkOut || checkingOut}
                className="px-5 py-2 rounded-lg text-sm font-semibold border border-black/15 disabled:opacity-40 transition hover:bg-black/5"
              >
                {checkingOut ? '…' : 'Check Out'}
              </button>
            </div>
          </div>
        )}

        {/* Stats (admin/manager) */}
        {stats && (
          <div>
            <p className="text-xs text-black/40 font-medium uppercase tracking-wide mb-3">
              This month — {month}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Present" value={stats.present || 0} accent />
              <StatCard label="Late" value={stats.late || 0} />
              <StatCard label="Absent" value={stats.absent || 0} />
              <StatCard label="Leave" value={(stats.leave || 0) + (stats['half-day'] || 0)} sub="incl. half-day" />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

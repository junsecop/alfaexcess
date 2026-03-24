import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const STATUS_COLORS = {
  present:  'bg-green-100 text-green-700',
  late:     'bg-yellow-100 text-yellow-700',
  absent:   'bg-red-100 text-red-700',
  leave:    'bg-blue-100 text-blue-700',
  half_day: 'bg-purple-100 text-purple-700',
}

const fmtStatus = (s) => s?.replace('_', '-') ?? ''

export default function Attendance() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const fetchRecords = () => {
    if (isManager) {
      const params = new URLSearchParams({ month })
      if (selectedUser) params.set('userId', selectedUser)
      api.get(`/attendance/all?${params}`).then(r => setRecords(r.data))
    } else {
      api.get(`/attendance/my?month=${month}`).then(r => setRecords(r.data))
    }
  }

  useEffect(() => {
    fetchRecords()
    if (isManager) {
      api.get('/auth/users').then(r => setUsers(r.data))
    }
  }, [month, selectedUser, isManager])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const r = await api.post('/attendance/sync', { month })
      setSyncMsg(`Synced ${r.data.count} records`)
    } catch {
      setSyncMsg('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Layout title="Attendance">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8f04a]"
          />
          {isManager && (
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8f04a]"
            >
              <option value="">All staff</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#c8f04a', color: '#111318' }}
            >
              {syncing ? 'Syncing…' : 'Sync to Sheets'}
            </button>
          )}
        </div>
        {syncMsg && <p className="text-sm text-green-600">{syncMsg}</p>}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Date</th>
                {isManager && <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Staff</th>}
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Check In</th>
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Check Out</th>
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Note</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="px-4 py-10 text-center text-sm text-black/30">
                    No records for this period
                  </td>
                </tr>
              ) : records.map(r => (
                <tr key={r._id} className="border-b border-black/5 hover:bg-black/2 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#111318]">{r.date}</td>
                  {isManager && (
                    <td className="px-4 py-3 text-black/60">{r.user?.name || '—'}</td>
                  )}
                  <td className="px-4 py-3 text-black/60">{r.checkIn || '—'}</td>
                  <td className="px-4 py-3 text-black/60">{r.checkOut || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[r.status] || ''}`}>
                      {fmtStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-black/40 text-xs">{r.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

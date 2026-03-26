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
  visit:    'bg-teal-100 text-teal-700',
}
const ALL_STATUSES = ['present', 'late', 'absent', 'leave', 'half_day', 'visit']

export default function Attendance() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const isAdmin = user?.role === 'admin'
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Edit modal (admin/manager)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', status: '', note: '' })
  const [editSaving, setEditSaving] = useState(false)

  // Mark attendance modal (admin/manager)
  const [markModal, setMarkModal] = useState(false)
  const [markForm, setMarkForm] = useState({
    userId: '',
    date: new Date().toLocaleDateString('en-CA'),
    checkIn: '',
    checkOut: '',
    status: 'present',
    note: '',
  })
  const [markSaving, setMarkSaving] = useState(false)
  const [markError, setMarkError] = useState('')

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
    if (isManager) api.get('/auth/users').then(r => setUsers(r.data))
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

  const handleMarkSave = async (e) => {
    e.preventDefault()
    if (!markForm.userId) return setMarkError('Please select a staff member')
    setMarkSaving(true)
    setMarkError('')
    try {
      const r = await api.post('/attendance/mark', markForm)
      setMarkModal(false)
      setMarkForm({ userId: '', date: new Date().toLocaleDateString('en-CA'), checkIn: '', checkOut: '', status: 'present', note: '' })
      fetchRecords()
    } catch (err) {
      setMarkError(err.response?.data?.message || 'Failed to save')
    } finally {
      setMarkSaving(false)
    }
  }

  const downloadCSV = () => {
    const headers = isManager
      ? ['Name', 'Department', 'Date', 'Check In', 'Check Out', 'Status', 'Location', 'Note']
      : ['Date', 'Check In', 'Check Out', 'Status', 'Location', 'Note']
    const rows = records.map(r => isManager
      ? [r.user?.name || '', r.user?.department || '', r.date, r.checkIn || '', r.checkOut || '', r.status?.replace('_', ' ') || '', r.locationName || '', r.note || '']
      : [r.date, r.checkIn || '', r.checkOut || '', r.status?.replace('_', ' ') || '', r.locationName || '', r.note || '']
    )
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openEdit = (r) => {
    setEditModal(r)
    setEditForm({ checkIn: r.checkIn || '', checkOut: r.checkOut || '', status: r.status || 'present', note: r.note || '' })
  }

  const handleDelete = async (r) => {
    if (!confirm(`Delete attendance record for ${r.user?.name || 'this user'} on ${r.date}?`)) return
    try {
      await api.delete(`/attendance/${r.id}`)
      setRecords(rs => rs.filter(rec => rec.id !== r.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      const r = await api.patch(`/attendance/${editModal.id}`, editForm)
      setRecords(rs => rs.map(rec => rec.id === r.data.id ? { ...rec, ...r.data } : rec))
      setEditModal(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update')
    } finally {
      setEditSaving(false)
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
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
          />
          {isManager && user?.canDownloadCsv !== false && (
            <button
              onClick={downloadCSV}
              disabled={records.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-black/15 text-black/60 hover:text-black disabled:opacity-30 transition flex items-center gap-1.5"
            >
              ↓ Download CSV
            </button>
          )}
          {isManager && (
            <>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
              >
                <option value="">All staff</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button
                onClick={() => { setMarkModal(true); setMarkError('') }}
                className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#684df4' }}
              >
                + Mark Attendance
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 border border-black/15 text-black/60 hover:text-black"
              >
                {syncing ? 'Syncing…' : 'Sync to Sheets'}
              </button>
            </>
          )}
        </div>
        {syncMsg && <p className="text-sm text-green-600">{syncMsg}</p>}

        {/* Summary cards */}
        {records.length > 0 && (() => {
          const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
          const cards = [
            { label: 'Present',  key: 'present',  color: '#16a34a' },
            { label: 'Late',     key: 'late',      color: '#d97706' },
            { label: 'Absent',   key: 'absent',    color: '#dc2626' },
            { label: 'Leave',    key: 'leave',      color: '#2563eb' },
            { label: 'Half Day', key: 'half_day',  color: '#7c3aed' },
          ]
          const working = (counts.present || 0) + (counts.late || 0) + (counts.half_day || 0)
          return (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-black/8 sm:col-span-1 col-span-3">
                <p className="text-xs text-black/40 mb-1">Working Days</p>
                <p className="text-2xl font-bold font-serif" style={{ color: '#17184a' }}>{working}</p>
              </div>
              {cards.map(c => (
                <div key={c.key} className="bg-white rounded-2xl p-4 border border-black/8">
                  <p className="text-xs text-black/40 mb-1">{c.label}</p>
                  <p className="text-2xl font-bold font-serif" style={{ color: c.color }}>{counts[c.key] || 0}</p>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-black/8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Date</th>
                {isManager && <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Staff</th>}
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Check In</th>
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Check Out</th>
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-black/40 uppercase tracking-wide">Location</th>
                {isManager && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="px-4 py-10 text-center text-sm text-black/30">
                    No records for this period
                  </td>
                </tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-b border-black/5 hover:bg-black/2 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#111318] whitespace-nowrap">{r.date}</td>
                  {isManager && <td className="px-4 py-3 text-black/60 text-xs">{r.user?.name || '—'}</td>}
                  <td className="px-4 py-3 text-black/60 font-medium">{r.checkIn || '—'}</td>
                  <td className="px-4 py-3 text-black/60">{r.checkOut || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-black/50">
                    {r.locationName && <span>📍 {r.locationName}</span>}
                    {r.latitude && r.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 text-[#684df4] underline text-xs"
                      >
                        {r.locationName ? 'map' : `📍 map`}
                      </a>
                    )}
                    {!r.locationName && !r.latitude && '—'}
                  </td>
                  {isManager && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="text-xs px-2 py-1 rounded-lg border border-black/10 text-black/40 hover:text-black hover:border-black/30 transition"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(r)}
                            className="text-xs px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:text-red-600 hover:border-red-300 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Attendance modal */}
      {markModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-serif text-lg font-medium mb-1" style={{ color: '#17184a' }}>Mark Attendance</h3>
            <p className="text-xs text-black/40 mb-4">Set attendance for a staff member manually</p>
            <form onSubmit={handleMarkSave} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Staff Member *</label>
                <select required
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white"
                  value={markForm.userId}
                  onChange={e => setMarkForm(f => ({ ...f, userId: e.target.value }))}>
                  <option value="">Select staff…</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Date *</label>
                <input type="date" required
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  value={markForm.date}
                  onChange={e => setMarkForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Check In</label>
                  <input type="time"
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={markForm.checkIn}
                    onChange={e => setMarkForm(f => ({ ...f, checkIn: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Check Out</label>
                  <input type="time"
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={markForm.checkOut}
                    onChange={e => setMarkForm(f => ({ ...f, checkOut: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Status *</label>
                <select required
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white"
                  value={markForm.status}
                  onChange={e => setMarkForm(f => ({ ...f, status: e.target.value }))}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Note (optional)</label>
                <input
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  placeholder="e.g. Field visit, Medical leave…"
                  value={markForm.note}
                  onChange={e => setMarkForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              {markError && <p className="text-sm text-red-500">{markError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setMarkModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm">Cancel</button>
                <button type="submit" disabled={markSaving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#684df4' }}>
                  {markSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-serif text-lg font-medium mb-1" style={{ color: '#17184a' }}>Edit Record</h3>
            <p className="text-xs text-black/40 mb-4">
              {editModal.user?.name || 'Staff'} · {editModal.date}
            </p>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Check In</label>
                  <input type="time" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={editForm.checkIn} onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Check Out</label>
                  <input type="time" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={editForm.checkOut} onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Status</label>
                <select className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white"
                  value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Note</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  placeholder="Optional note…"
                  value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm">Cancel</button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#684df4' }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

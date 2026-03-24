import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const TABS = ['Overview', 'Submit Bill', 'Approvals', 'Spending Report', 'My Bills']

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-blue-100 text-blue-700',
}

function SubmitBill({ onSubmitted }) {
  const [form, setForm] = useState({ title: '', type: 'misc', amount: '', month: new Date().toISOString().slice(0, 7), category: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('file', file)
      const r = await api.post('/billing', fd)
      onSubmitted(r.data)
      setMsg('Bill submitted successfully!')
      setForm({ title: '', type: 'misc', amount: '', month: new Date().toISOString().slice(0, 7), category: '' })
      setFile(null)
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <input required placeholder="Bill title" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <select className="px-3 py-2 border border-black/15 rounded-lg text-sm"
          value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {['electricity','water','rent','salary','misc','customer'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input required type="number" placeholder="Amount (₹)" className="px-3 py-2 border border-black/15 rounded-lg text-sm"
          value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
      </div>
      <input type="month" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
        value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
      <input placeholder="Category (optional)" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
        value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
      <div className="border-2 border-dashed border-black/15 rounded-lg p-4 text-center cursor-pointer hover:border-[#c8f04a]">
        <input type="file" className="hidden" id="bill-file" onChange={e => setFile(e.target.files[0])} />
        <label htmlFor="bill-file" className="cursor-pointer text-sm text-black/40">
          {file ? file.name : 'Click to attach file (optional)'}
        </label>
      </div>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      <button type="submit" disabled={loading}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold"
        style={{ background: '#c8f04a', color: '#111318' }}>
        {loading ? 'Submitting…' : 'Submit Bill'}
      </button>
    </form>
  )
}

function BillRow({ bill, onAction, isManager }) {
  const [rejMsg, setRejMsg] = useState('')
  const [showReject, setShowReject] = useState(false)

  const approve = async () => {
    try {
      await api.patch(`/billing/${bill.id}/approve`, { status: 'approved' })
      onAction()
    } catch {}
  }

  const reject = async () => {
    try {
      await api.patch(`/billing/${bill.id}/approve`, { status: 'rejected', adminMessage: rejMsg })
      onAction()
      setShowReject(false)
    } catch {}
  }

  const deleteBill = async () => {
    if (!confirm(`Delete "${bill.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/billing/${bill.id}`)
      onAction()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <tr className="border-b border-black/5 hover:bg-black/2 last:border-0">
      <td className="px-4 py-3 font-medium text-[#111318] text-sm">{bill.title}</td>
      <td className="px-4 py-3 text-sm text-black/60 capitalize">{bill.type}</td>
      <td className="px-4 py-3 text-sm font-medium">₹{bill.amount?.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-black/50">{bill.month}</td>
      {isManager && <td className="px-4 py-3 text-sm text-black/60">{bill.submittedBy?.name || '—'}</td>}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[bill.status]}`}>
          {bill.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2 items-center">
          {isManager && bill.status === 'pending' && (
            <>
              <button onClick={approve} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Approve</button>
              <button onClick={() => setShowReject(s => !s)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">Reject</button>
              {showReject && (
                <div className="flex gap-1">
                  <input placeholder="Reason" value={rejMsg} onChange={e => setRejMsg(e.target.value)}
                    className="text-xs px-2 py-1 border border-black/15 rounded" />
                  <button onClick={reject} className="text-xs px-2 py-1 bg-red-600 text-white rounded">Send</button>
                </div>
              )}
            </>
          )}
          {bill.fileUrl && (
            <a href={bill.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View File</a>
          )}
          {isManager && (
            <button onClick={deleteBill} className="text-xs text-red-400 hover:text-red-600 ml-1">Delete</button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function Billing() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const [tab, setTab] = useState(0)
  const [bills, setBills] = useState([])
  const [myBills, setMyBills] = useState([])
  const [summary, setSummary] = useState(null)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchAll = () => {
    if (isManager) {
      api.get(`/billing/all?month=${month}`).then(r => setBills(r.data))
      api.get(`/billing/summary?month=${month}`).then(r => setSummary(r.data))
    }
    api.get(`/billing/my?month=${month}`).then(r => setMyBills(r.data))
  }

  useEffect(() => { fetchAll() }, [month, isManager])

  const visibleTabs = isManager ? TABS : ['Overview', 'Submit Bill', 'My Bills']

  return (
    <Layout title="Billing">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Month picker */}
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8f04a]" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-black/10">
          {visibleTabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === i ? 'border-[#c8f04a] text-[#111318]' : 'border-transparent text-black/40 hover:text-black/70'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Spent', value: `₹${(summary?.total || 0).toLocaleString()}` },
              { label: 'Electricity', value: `₹${(summary?.electricity || 0).toLocaleString()}` },
              { label: 'Water', value: `₹${(summary?.water || 0).toLocaleString()}` },
              { label: 'Misc', value: `₹${(summary?.misc || 0).toLocaleString()}` },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl p-5 border border-black/8">
                <p className="text-xs text-black/40 uppercase tracking-wide mb-2">{c.label}</p>
                <p className="font-serif text-2xl font-medium">{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Submit Bill */}
        {tab === 1 && (
          <div className="bg-white rounded-2xl p-6 border border-black/8">
            <h3 className="font-serif text-lg font-medium mb-4">Submit a Bill</h3>
            <SubmitBill onSubmitted={() => fetchAll()} />
          </div>
        )}

        {/* Admin Approvals */}
        {tab === 2 && isManager && (
          <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8">
                  {['Title','Type','Amount','Month','Submitted By','Status','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-black/40 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.length === 0
                  ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-black/30">No bills</td></tr>
                  : bills.map(b => <BillRow key={b.id} bill={b} onAction={fetchAll} isManager={isManager} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* Spending Report */}
        {tab === 3 && isManager && (
          <div className="bg-white rounded-2xl p-6 border border-black/8 space-y-3">
            <h3 className="font-serif text-lg font-medium">Spending Breakdown — {month}</h3>
            {summary ? (
              <div className="space-y-2">
                {Object.entries(summary).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-black/60">{k}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-black/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min(100, (v / (summary.total || 1)) * 100)}%`,
                          background: '#c8f04a'
                        }} />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">₹{v.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-black/10 pt-2 flex justify-between font-semibold text-sm">
                  <span>Total</span>
                  <span>₹{(summary.total || 0).toLocaleString()}</span>
                </div>
              </div>
            ) : <p className="text-sm text-black/30">No data</p>}
          </div>
        )}

        {/* My Bills */}
        {((isManager && tab === 4) || (!isManager && tab === 2)) && (
          <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8">
                  {['Title','Type','Amount','Month','Status','File'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-black/40 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myBills.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-black/30">No bills</td></tr>
                  : myBills.map(b => (
                    <tr key={b.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-[#111318]">{b.title}</td>
                      <td className="px-4 py-3 text-black/60 capitalize">{b.type}</td>
                      <td className="px-4 py-3 font-medium">₹{b.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-black/50">{b.month}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {b.fileUrl && <a href={b.fileUrl} target="_blank" rel="noreferrer" className="text-xs underline">View</a>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}

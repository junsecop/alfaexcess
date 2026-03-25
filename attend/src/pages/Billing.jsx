import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid:     'bg-blue-100 text-blue-700',
}

const DOC_TYPES = ['electricity', 'water', 'invoice', 'receipt', 'report', 'other']
const BILL_TYPES = ['electricity', 'water', 'rent', 'salary', 'misc', 'customer']

// ── Submit Bill Form ──────────────────────────────────────────
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
    <div className="bg-white rounded-2xl p-6 border border-black/8 max-w-lg">
      <h3 className="font-serif text-lg font-medium mb-5" style={{ color: '#17184a' }}>Submit a Bill</h3>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-black/50 mb-1 block">Bill Title *</label>
          <input required placeholder="e.g. Office electricity - June" className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-black/50 mb-1 block">Type</label>
            <select className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm bg-white"
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {BILL_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-black/50 mb-1 block">Amount (₹) *</label>
            <input required type="number" placeholder="0.00" className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-black/50 mb-1 block">Month</label>
            <input type="month" className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm"
              value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-black/50 mb-1 block">Category</label>
            <input placeholder="Optional" className="w-full px-3 py-2.5 border border-black/15 rounded-xl text-sm"
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-black/50 mb-1 block">Attach File (optional)</label>
          <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-[#684df4] transition-colors"
            onClick={() => document.getElementById('bill-file').click()}>
            <input type="file" className="hidden" id="bill-file" onChange={e => setFile(e.target.files[0])} />
            <p className="text-sm text-black/40">{file ? file.name : 'Click to attach receipt or invoice'}</p>
          </div>
        </div>
        {msg && <p className={`text-sm px-3 py-2 rounded-lg ${msg.includes('fail') || msg.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{msg}</p>}
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#684df4' }}>
          {loading ? 'Submitting…' : 'Submit Bill'}
        </button>
      </form>
    </div>
  )
}

// ── Bill Row ──────────────────────────────────────────────────
function BillRow({ bill, onAction, isManager }) {
  const [rejMsg, setRejMsg] = useState('')
  const [showReject, setShowReject] = useState(false)

  const approve = async () => {
    try { await api.patch(`/billing/${bill.id}/approve`, { status: 'approved' }); onAction() } catch {}
  }
  const reject = async () => {
    try { await api.patch(`/billing/${bill.id}/approve`, { status: 'rejected', adminMessage: rejMsg }); onAction(); setShowReject(false) } catch {}
  }
  const deleteBill = async () => {
    if (!confirm(`Delete "${bill.title}"?`)) return
    try { await api.delete(`/billing/${bill.id}`); onAction() } catch (e) { alert(e.response?.data?.message || 'Failed') }
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-black/8 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: '#17184a' }}>{bill.title}</p>
          <div className="flex flex-wrap gap-2 mt-1 items-center">
            <span className="text-xs text-black/40 capitalize">{bill.type}</span>
            {bill.month && <span className="text-xs text-black/40">· {bill.month}</span>}
            {isManager && bill.submittedBy && <span className="text-xs text-black/40">· {bill.submittedBy.name}</span>}
          </div>
          {bill.adminMessage && (
            <p className="text-xs text-red-500 mt-1">Note: {bill.adminMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-bold text-base" style={{ color: '#17184a' }}>₹{bill.amount?.toLocaleString()}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[bill.status]}`}>
            {bill.status}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 items-center">
        {bill.fileUrl && (
          <a href={bill.fileUrl} target="_blank" rel="noreferrer"
            className="text-xs font-medium px-3 py-1 rounded-full border"
            style={{ color: '#684df4', borderColor: '#684df4' + '40' }}>
            View File
          </a>
        )}
        {isManager && bill.status === 'pending' && (
          <>
            <button onClick={approve}
              className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              Approve
            </button>
            <button onClick={() => setShowReject(s => !s)}
              className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
              Reject
            </button>
            {showReject && (
              <div className="flex gap-2 w-full mt-1">
                <input placeholder="Rejection reason" value={rejMsg} onChange={e => setRejMsg(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 border border-black/15 rounded-xl" />
                <button onClick={reject} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-xl font-medium">Send</button>
              </div>
            )}
          </>
        )}
        {isManager && (
          <button onClick={deleteBill} className="text-xs text-red-400 hover:text-red-600 ml-auto">Delete</button>
        )}
      </div>
    </div>
  )
}

// ── Documents Section ──────────────────────────────────────────
function Documents() {
  const [docs, setDocs] = useState([])
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), docType: 'other', description: '', amount: '' })
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { api.get('/uploads').then(r => setDocs(r.data)) }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return setMsg('Please select a file')
    setUploading(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('month', form.month)
      fd.append('docType', form.docType)
      if (form.description) fd.append('tag', form.description)
      if (form.amount) fd.append('amount', form.amount)
      const r = await api.post('/uploads', fd)
      setDocs(d => [r.data, ...d])
      setFile(null)
      setForm(f => ({ ...f, description: '', amount: '' }))
      setMsg('Uploaded successfully')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return
    await api.delete(`/uploads/${id}`)
    setDocs(d => d.filter(x => x.id !== id))
  }

  const formatSize = (b) => !b ? '—' : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <div className="bg-white rounded-2xl p-5 border border-black/8">
        <h3 className="font-serif text-base font-medium mb-4" style={{ color: '#17184a' }}>Upload Document</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-[#684df4] transition-colors"
            onClick={() => document.getElementById('doc-upload').click()}>
            <input type="file" id="doc-upload" className="hidden" onChange={e => setFile(e.target.files[0])} />
            <p className="text-sm text-black/40">{file ? file.name : 'Click to select file'}</p>
            <p className="text-xs text-black/30 mt-1">PDF, images, Excel — max 20MB</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Type</label>
              <select value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}
                className="w-full px-3 py-2 border border-black/15 rounded-xl text-sm bg-white">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Month</label>
              <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="w-full px-3 py-2 border border-black/15 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Description</label>
              <input placeholder="Bill description" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-black/15 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Amount (₹)</label>
              <input type="number" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-black/15 rounded-xl text-sm" />
            </div>
          </div>
          {msg && <p className={`text-sm px-3 py-2 rounded-lg ${msg.includes('fail') || msg.includes('Please') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{msg}</p>}
          <button type="submit" disabled={uploading}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2"
            style={{ background: '#684df4' }}>
            {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading…</> : 'Upload'}
          </button>
        </form>
      </div>

      {/* Docs list */}
      <div className="space-y-2">
        {docs.length === 0 && <p className="text-sm text-black/30 text-center py-8">No documents uploaded</p>}
        {docs.map(d => (
          <div key={d.id} className="bg-white rounded-2xl p-4 border border-black/8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm"
              style={{ background: '#684df4' + '15', color: '#684df4' }}>📄</div>
            <div className="flex-1 min-w-0">
              <a href={d.fileUrl} target="_blank" rel="noreferrer"
                className="text-sm font-medium underline truncate block" style={{ color: '#684df4' }}>
                {d.originalName}
              </a>
              <div className="flex gap-2 text-xs text-black/40 mt-0.5 flex-wrap">
                <span className="capitalize">{d.docType}</span>
                {d.month && <span>· {d.month}</span>}
                {d.tag && <span>· {d.tag}</span>}
                {d.amount && <span className="font-semibold text-black/60">· ₹{Number(d.amount).toLocaleString()}</span>}
                <span>· {d.uploadedBy?.name}</span>
              </div>
            </div>
            <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Billing Page ──────────────────────────────────────────
export default function Billing() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const [tab, setTab] = useState(isManager ? 'overview' : 'submit')
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

  const TABS = isManager
    ? [
        { key: 'overview',  label: 'Overview' },
        { key: 'approvals', label: `Approvals ${bills.filter(b => b.status === 'pending').length ? `(${bills.filter(b => b.status === 'pending').length})` : ''}` },
        { key: 'spending',  label: 'Spending' },
        { key: 'documents', label: 'Documents' },
        { key: 'submit',    label: 'Submit Bill' },
        { key: 'mybills',   label: 'My Bills' },
      ]
    : [
        { key: 'submit',  label: 'Submit Bill' },
        { key: 'mybills', label: 'My Bills' },
      ]

  return (
    <Layout title="Billing">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Month picker */}
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-black/15 text-sm bg-white focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#684df4' }} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-black/10 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap
                ${tab === t.key ? 'border-[#684df4] text-[#684df4]' : 'border-transparent text-black/40 hover:text-black/70'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && isManager && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Spent', value: `₹${(summary?.total || 0).toLocaleString()}` },
                { label: 'Electricity', value: `₹${(summary?.electricity || 0).toLocaleString()}` },
                { label: 'Water', value: `₹${(summary?.water || 0).toLocaleString()}` },
                { label: 'Misc', value: `₹${(summary?.misc || 0).toLocaleString()}` },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-2xl p-5 border border-black/8">
                  <p className="text-xs text-black/40 uppercase tracking-wide mb-2">{c.label}</p>
                  <p className="font-serif text-2xl font-semibold" style={{ color: '#17184a' }}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Pending bills preview */}
            {bills.filter(b => b.status === 'pending').length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: '#17184a' }}>Pending Approvals</p>
                  <button onClick={() => setTab('approvals')} className="text-xs underline" style={{ color: '#684df4' }}>View all</button>
                </div>
                <div className="space-y-2">
                  {bills.filter(b => b.status === 'pending').slice(0, 3).map(b => (
                    <BillRow key={b.id} bill={b} onAction={fetchAll} isManager={isManager} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approvals */}
        {tab === 'approvals' && isManager && (
          <div className="space-y-2">
            {bills.length === 0
              ? <p className="text-sm text-black/30 text-center py-10">No bills for this month</p>
              : bills.map(b => <BillRow key={b.id} bill={b} onAction={fetchAll} isManager={isManager} />)}
          </div>
        )}

        {/* Spending */}
        {tab === 'spending' && isManager && (
          <div className="bg-white rounded-2xl p-6 border border-black/8 space-y-3">
            <h3 className="font-serif text-lg font-medium" style={{ color: '#17184a' }}>Spending — {month}</h3>
            {summary && Object.keys(summary).filter(k => k !== 'total').length > 0 ? (
              <div className="space-y-3">
                {Object.entries(summary).filter(([k]) => k !== 'total').map(([k, v]) => (
                  <div key={k} className="flex items-center gap-4">
                    <span className="text-sm capitalize text-black/60 w-24">{k}</span>
                    <div className="flex-1 h-2 bg-black/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(100, (v / (summary.total || 1)) * 100)}%`,
                        background: '#684df4'
                      }} />
                    </div>
                    <span className="text-sm font-semibold w-24 text-right" style={{ color: '#17184a' }}>₹{v.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-black/10 pt-3 flex justify-between font-bold text-sm" style={{ color: '#17184a' }}>
                  <span>Total</span>
                  <span>₹{(summary.total || 0).toLocaleString()}</span>
                </div>
              </div>
            ) : <p className="text-sm text-black/30">No approved spending data</p>}
          </div>
        )}

        {/* Documents */}
        {tab === 'documents' && isManager && <Documents />}

        {/* Submit Bill */}
        {tab === 'submit' && <SubmitBill onSubmitted={() => { fetchAll(); setTab('mybills') }} />}

        {/* My Bills */}
        {tab === 'mybills' && (
          <div className="space-y-2">
            {myBills.length === 0
              ? <p className="text-sm text-black/30 text-center py-10">No bills submitted this month</p>
              : myBills.map(b => (
                <div key={b.id} className="bg-white rounded-2xl p-4 border border-black/8">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#17184a' }}>{b.title}</p>
                      <p className="text-xs text-black/40 mt-0.5 capitalize">{b.type} · {b.month}</p>
                      {b.adminMessage && <p className="text-xs text-red-500 mt-1">Note: {b.adminMessage}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold" style={{ color: '#17184a' }}>₹{b.amount?.toLocaleString()}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                    </div>
                  </div>
                  {b.fileUrl && (
                    <a href={b.fileUrl} target="_blank" rel="noreferrer"
                      className="mt-2 text-xs font-medium underline block" style={{ color: '#684df4' }}>View File</a>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

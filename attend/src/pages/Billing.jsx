import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function parsePayment(tags = []) {
  const payment  = tags.find(t => t.startsWith('payment:'))?.slice(8) || null  // 'collected' | 'pending'
  const paidAmt  = tags.find(t => t.startsWith('paidamt:'))?.slice(8) || ''
  const collect  = tags.find(t => t.startsWith('collect:'))?.slice(8) || ''
  const phone    = tags.find(t => t.startsWith('phone:'))?.slice(6) || ''
  const customer = tags.find(t => t.startsWith('customer:'))?.slice(9) || ''
  return { payment, paidAmt, collect, phone, customer }
}

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
  const [uploadProgress, setUploadProgress] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    setUploadProgress('')
    try {
      let fileUrl = null, fileName = null

      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setMsg('File too large — maximum size is 5 MB')
          setLoading(false)
          return
        }
        // 1. Get signed upload URL from backend
        setUploadProgress('Getting upload URL…')
        const { data: { signedUrl, publicUrl } } = await api.post('/billing/upload-url', {
          fileName: file.name,
          contentType: file.type,
        })

        // 2. Upload directly to Supabase (fast — bypasses Vercel)
        setUploadProgress('Uploading file…')
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!uploadRes.ok) throw new Error('File upload failed')
        fileUrl = publicUrl
        fileName = file.name
      }

      // 3. Save metadata to DB
      setUploadProgress('Saving…')
      const r = await api.post('/billing', { ...form, fileUrl, fileName })
      onSubmitted(r.data)
      setMsg('Bill submitted successfully!')
      setForm({ title: '', type: 'misc', amount: '', month: new Date().toISOString().slice(0, 7), category: '' })
      setFile(null)
    } catch (err) {
      setMsg(err.response?.data?.message || err.message || 'Failed')
    } finally {
      setLoading(false)
      setUploadProgress('')
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
            {!file && <p className="text-xs text-black/30 mt-1">Max 5 MB · PDF, image, Excel</p>}
          </div>
        </div>
        {uploadProgress && <p className="text-xs text-[#684df4] px-3 py-2 rounded-lg bg-[#684df4]/5">{uploadProgress}</p>}
        {msg && <p className={`text-sm px-3 py-2 rounded-lg ${msg.includes('fail') || msg.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{msg}</p>}
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#684df4' }}>
          {loading ? (uploadProgress || 'Submitting…') : 'Submit Bill'}
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
            <p className="text-xs text-black/30 mt-1">PDF, images, Excel — max 5 MB</p>
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
  const [cleaning, setCleaning] = useState(false)
  const [doneTasks, setDoneTasks] = useState([])

  const cleanupOldBills = async () => {
    if (!confirm('Delete all approved/paid bills from previous months? This cannot be undone.')) return
    setCleaning(true)
    try {
      const r = await api.delete('/billing/cleanup')
      alert(`Deleted ${r.data.count} old bill(s).`)
      fetchAll()
    } catch (e) {
      alert(e.response?.data?.message || 'Cleanup failed')
    } finally {
      setCleaning(false)
    }
  }

  const downloadCSV = () => {
    const headers = ['Title', 'Type', 'Category', 'Amount', 'Status', 'Month', 'Submitted By', 'Admin Note']
    const rows = bills.map(b => [
      b.title || '', b.type || '', b.category || '',
      b.amount || 0, b.status || '', b.month || '',
      b.submittedBy?.name || '', b.adminMessage || '',
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `billing-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fetchAll = () => {
    if (isManager) {
      api.get(`/billing/all?month=${month}`).then(r => setBills(r.data))
      api.get(`/billing/summary?month=${month}`).then(r => setSummary(r.data))
      api.get('/tasks/all?status=done').then(r => setDoneTasks(r.data)).catch(() => {})
    }
    api.get(`/billing/my?month=${month}`).then(r => setMyBills(r.data))
  }

  useEffect(() => { fetchAll() }, [month, isManager])

  const TABS = isManager
    ? [
        { key: 'overview',  label: 'Overview' },
        { key: 'approvals', label: `Approvals ${bills.filter(b => b.status === 'pending').length ? `(${bills.filter(b => b.status === 'pending').length})` : ''}` },
        { key: 'spending',     label: 'Spending' },
        { key: 'collections',  label: 'Collections' },
        { key: 'documents',    label: 'Documents' },
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

        {/* Month picker + actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-black/15 text-sm bg-white focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': '#684df4' }} />
          {isManager && (
            <button onClick={downloadCSV} disabled={bills.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-black/15 text-black/60 hover:text-black disabled:opacity-30 transition flex items-center gap-1.5">
              ↓ Download CSV
            </button>
          )}
          {user?.role === 'admin' && (
            <button onClick={cleanupOldBills} disabled={cleaning}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors">
              {cleaning ? 'Cleaning…' : 'Cleanup Old Bills'}
            </button>
          )}
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

        {/* Collections */}
        {tab === 'collections' && isManager && (() => {
          const monthTasks = doneTasks.filter(t =>
            t.completedAt && t.completedAt.slice(0, 7) === month
          )
          const tasksWithPayment = monthTasks.filter(t => (t.tags || []).some(tag => tag.startsWith('payment:')))
          const collected = tasksWithPayment.filter(t => parsePayment(t.tags).payment === 'collected')
          const pending   = tasksWithPayment.filter(t => parsePayment(t.tags).payment === 'pending')
          const totalCollected = collected.reduce((sum, t) => {
            const { paidAmt, collect } = parsePayment(t.tags)
            return sum + (Number(paidAmt || collect) || 0)
          }, 0)
          const rate = tasksWithPayment.length ? Math.round((collected.length / tasksWithPayment.length) * 100) : 0

          // Per-staff breakdown
          const byStaff = {}
          collected.forEach(t => {
            const name = t.assignedTo?.name || 'Unknown'
            const { paidAmt, collect } = parsePayment(t.tags)
            byStaff[name] = (byStaff[name] || 0) + (Number(paidAmt || collect) || 0)
          })

          return (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-black/8">
                  <p className="text-xs text-black/40 uppercase tracking-wide mb-2">Total Collected</p>
                  <p className="font-serif text-2xl font-semibold text-green-600">₹{totalCollected.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-black/8">
                  <p className="text-xs text-black/40 uppercase tracking-wide mb-2">Pending</p>
                  <p className="font-serif text-2xl font-semibold text-red-500">{pending.length} visits</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-black/8">
                  <p className="text-xs text-black/40 uppercase tracking-wide mb-2">Collection Rate</p>
                  <p className="font-serif text-2xl font-semibold" style={{ color: '#684df4' }}>{rate}%</p>
                </div>
              </div>

              {/* Staff breakdown */}
              {Object.keys(byStaff).length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-black/8">
                  <p className="text-sm font-semibold mb-4" style={{ color: '#17184a' }}>Staff Collections</p>
                  <div className="space-y-3">
                    {Object.entries(byStaff).sort((a,b) => b[1]-a[1]).map(([name, amt]) => (
                      <div key={name} className="flex items-center gap-4">
                        <span className="text-sm text-black/60 w-32 truncate">{name}</span>
                        <div className="flex-1 h-2 bg-black/8 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100,(amt/totalCollected)*100)}%`, background: '#684df4' }} />
                        </div>
                        <span className="text-sm font-semibold w-24 text-right text-green-600">₹{amt.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collected list */}
              {collected.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-black/8">
                  <p className="text-sm font-semibold mb-3" style={{ color: '#17184a' }}>Collected Payments</p>
                  <div className="space-y-2">
                    {collected.map(t => {
                      const { paidAmt, collect, phone } = parsePayment(t.tags)
                      const amt = paidAmt || collect
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#17184a] truncate">{t.title}</p>
                            <p className="text-xs text-black/40">{t.assignedTo?.name}{t.completedAt ? ` · ${new Date(t.completedAt).toLocaleDateString('en-IN')}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {phone && (
                              <a href={`https://wa.me/91${phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                                className="text-xs px-2 py-1 rounded-lg font-medium text-white" style={{ background: '#25D366' }}>📞</a>
                            )}
                            <span className="text-sm font-bold text-green-600">₹{Number(amt).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Pending follow-up list */}
              {pending.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-red-100">
                  <p className="text-sm font-semibold mb-1" style={{ color: '#17184a' }}>⚠ Pending Follow-up Calls</p>
                  <p className="text-xs text-black/40 mb-3">These customers haven't paid yet — call them before month end</p>
                  <div className="space-y-2">
                    {pending.map(t => {
                      const { phone, customer } = parsePayment(t.tags)
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#17184a] truncate">{t.title}</p>
                            <p className="text-xs text-black/40">
                              {customer && <span className="font-medium text-black/60">{customer} · </span>}
                              {t.assignedTo?.name}{t.completedAt ? ` · ${new Date(t.completedAt).toLocaleDateString('en-IN')}` : ''}
                            </p>
                          </div>
                          {phone && (
                            <a href={`https://wa.me/91${phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shrink-0"
                              style={{ background: '#25D366' }}>
                              <svg viewBox="0 0 32 32" fill="currentColor" width="12" height="12">
                                <path d="M16 0C7.164 0 0 7.164 0 16c0 2.812.732 5.45 2.017 7.74L0 32l8.51-2.234A15.93 15.93 0 0016 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm7.993 22.274c-.33.927-1.942 1.791-2.657 1.84-.714.05-1.366.283-4.64-.964-3.916-1.499-6.367-5.5-6.558-5.756-.19-.256-1.571-2.087-1.571-3.981s.996-2.823 1.35-3.21c.352-.386.768-.482 1.024-.482.256 0 .512.002.736.013.237.011.555-.09.87.665.33.796 1.12 2.742 1.217 2.942.097.2.16.434.033.7-.129.27-.194.434-.385.668-.192.234-.403.523-.576.703-.192.2-.39.417-.168.817.222.4.988 1.628 2.121 2.637 1.457 1.299 2.687 1.701 3.087 1.894.4.192.633.16.865-.097.232-.255.992-1.155 1.257-1.553.265-.397.53-.33.896-.198.366.13 2.321 1.094 2.72 1.294.399.2.665.3.764.466.097.168.097.966-.233 1.893z"/>
                              </svg>
                              Call
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {tasksWithPayment.length === 0 && (
                <p className="text-sm text-black/30 text-center py-10">No payment records for {month} — they appear when staff complete tasks and record payment</p>
              )}
            </div>
          )
        })()}

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

import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const DOC_TYPES = ['electricity', 'water', 'invoice', 'receipt', 'report', 'other']

export default function DataUploads() {
  const [docs, setDocs] = useState([])
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), docType: 'other', description: '', amount: '' })
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState({ month: '', docType: '' })

  const fetchDocs = () => {
    const params = new URLSearchParams()
    if (filter.month) params.set('month', filter.month)
    if (filter.docType) params.set('docType', filter.docType)
    api.get(`/uploads?${params}`).then(r => setDocs(r.data))
  }

  useEffect(() => { fetchDocs() }, [filter])

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

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
  }

  return (
    <Layout title="Data Uploads">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Upload form */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-4" style={{ color: '#17184a' }}>Upload Document</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
              style={{ borderColor: file ? '#684df4' : '#e5e7eb' }}
              onClick={() => document.getElementById('doc-file').click()}
            >
              <input type="file" id="doc-file" className="hidden" onChange={e => setFile(e.target.files[0])} />
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: '#684df4' + '15' }}>
                <span className="text-lg">📎</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#17184a' }}>{file ? file.name : 'Click to select file'}</p>
              <p className="text-xs text-black/40 mt-1">PDF, images, Excel — max 20MB</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Document Type</label>
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
                <label className="text-xs font-medium text-black/50 mb-1 block">Bill Description</label>
                <input placeholder="e.g. Office electricity bill" value={form.description}
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

            {msg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${msg.includes('fail') || msg.includes('Please') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {msg}
              </p>
            )}

            <button type="submit" disabled={uploading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 text-white flex items-center gap-2"
              style={{ background: '#684df4' }}>
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : 'Upload'}
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input type="month" value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-black/15 text-sm bg-white" />
          <select value={filter.docType} onChange={e => setFilter(f => ({ ...f, docType: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-black/15 text-sm bg-white">
            <option value="">All types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filter.month || filter.docType) && (
            <button onClick={() => setFilter({ month: '', docType: '' })}
              className="px-3 py-2 rounded-xl border border-black/15 text-sm text-black/40 hover:text-black bg-white">
              Clear
            </button>
          )}
        </div>

        {/* File list */}
        <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8">
                  {['File', 'Type', 'Month', 'Description', 'Amount', 'Size', 'By', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-black/40 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-black/30">No uploads yet</td></tr>
                  : docs.map(d => (
                    <tr key={d.id} className="border-b border-black/5 last:border-0 hover:bg-black/2">
                      <td className="px-4 py-3">
                        <a href={d.fileUrl} target="_blank" rel="noreferrer"
                          className="font-medium underline text-sm truncate max-w-[150px] block"
                          style={{ color: '#684df4' }}>
                          {d.originalName}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-black/60 capitalize">{d.docType}</td>
                      <td className="px-4 py-3 text-black/50">{d.month || '—'}</td>
                      <td className="px-4 py-3 text-black/50 text-xs">{d.tag || '—'}</td>
                      <td className="px-4 py-3 text-black/60 text-xs font-medium">{d.amount ? `₹${Number(d.amount).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-black/40 text-xs">{formatSize(d.fileSize)}</td>
                      <td className="px-4 py-3 text-black/50 text-xs">{d.uploadedBy?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-black/5">
            {docs.length === 0
              ? <p className="px-4 py-10 text-center text-sm text-black/30">No uploads yet</p>
              : docs.map(d => (
                <div key={d.id} className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm" style={{ background: '#684df4' + '15', color: '#684df4' }}>
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={d.fileUrl} target="_blank" rel="noreferrer"
                      className="text-sm font-medium underline truncate block" style={{ color: '#684df4' }}>
                      {d.originalName}
                    </a>
                    <p className="text-xs text-black/40 mt-0.5 capitalize">{d.docType} · {d.month || '—'}</p>
                    {d.tag && <p className="text-xs text-black/40">{d.tag}</p>}
                    {d.amount && <p className="text-xs font-semibold text-black/60">₹{Number(d.amount).toLocaleString()}</p>}
                  </div>
                  <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

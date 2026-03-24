import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const DOC_TYPES = ['electricity', 'water', 'invoice', 'receipt', 'report', 'other']

export default function DataUploads() {
  const [docs, setDocs] = useState([])
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({ tag: '', month: new Date().toISOString().slice(0, 7), docType: 'other' })
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
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      const r = await api.post('/uploads', fd)
      setDocs(d => [r.data, ...d])
      setFile(null)
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
          <h3 className="font-serif text-lg font-medium mb-4">Upload Document</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-black/15 rounded-lg p-6 text-center hover:border-[#c8f04a] transition-colors">
              <input type="file" id="doc-file" className="hidden" onChange={e => setFile(e.target.files[0])} />
              <label htmlFor="doc-file" className="cursor-pointer">
                <p className="text-sm font-medium text-[#111318]">{file ? file.name : 'Click to select file'}</p>
                <p className="text-xs text-black/40 mt-1">PDF, images, Excel — max 20MB</p>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))}
                className="px-3 py-2 border border-black/15 rounded-lg text-sm">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="px-3 py-2 border border-black/15 rounded-lg text-sm" />
              <input placeholder="Tag (optional)" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                className="px-3 py-2 border border-black/15 rounded-lg text-sm" />
            </div>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
            <button type="submit" disabled={uploading}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: '#c8f04a', color: '#111318' }}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input type="month" value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white" placeholder="Filter by month" />
          <select value={filter.docType} onChange={e => setFilter(f => ({ ...f, docType: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white">
            <option value="">All types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* File list */}
        <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8">
                {['File','Type','Month','Tag','Size','Uploaded By',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-black/40 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.length === 0
                ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-black/30">No uploads yet</td></tr>
                : docs.map(d => (
                  <tr key={d.id} className="border-b border-black/5 last:border-0 hover:bg-black/2">
                    <td className="px-4 py-3">
                      <a href={d.fileUrl} target="_blank" rel="noreferrer"
                        className="text-[#111318] font-medium underline text-sm truncate max-w-[180px] block">
                        {d.originalName}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-black/60 capitalize">{d.docType}</td>
                    <td className="px-4 py-3 text-black/50">{d.month || '—'}</td>
                    <td className="px-4 py-3 text-black/40 text-xs">{d.tag || '—'}</td>
                    <td className="px-4 py-3 text-black/50 text-xs">{formatSize(d.fileSize)}</td>
                    <td className="px-4 py-3 text-black/50 text-xs">{d.uploadedBy?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(d.id)}
                        className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

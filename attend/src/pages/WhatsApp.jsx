import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function Avatar({ user, size = 'md' }) {
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs'
  return user?.avatar ? (
    <img src={user.avatar} alt={user.name} className={`${sz} rounded-full object-cover shrink-0 border border-black/8`} />
  ) : (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold shrink-0`} style={{ background: '#684df4', color: '#fff' }}>
      {user?.name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function toWaNumber(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.length === 10) return `91${digits}`
  return digits
}

const IST_NOW = () => {
  const now = new Date()
  const date = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  return { date, time }
}

export default function WhatsApp() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState('contacts')

  // Contacts
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')

  // Message generator
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(() => {
    const { date, time } = IST_NOW()
    return { customer: '', date, time, reason: '', productId: '', notes: '' }
  })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).catch(() => {})
    api.get('/products').then(r => setProducts(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.productId) {
      setSelectedProduct(products.find(p => p.id === form.productId) || null)
    } else {
      setSelectedProduct(null)
    }
  }, [form.productId, products])

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  )

  const buildMessage = () => {
    const lines = []
    lines.push(`Hello${form.customer ? ` ${form.customer}` : ''},`)
    lines.push('')
    lines.push(`Date: ${form.date} at ${form.time}`)
    if (form.reason) lines.push(`Purpose: ${form.reason}`)
    if (selectedProduct) {
      lines.push('')
      lines.push(`Product: ${selectedProduct.name}`)
      lines.push(`Price: ₹${Number(selectedProduct.price).toLocaleString('en-IN')}`)
      if (selectedProduct.description) lines.push(`Details: ${selectedProduct.description}`)
      if (selectedProduct.category) lines.push(`Category: ${selectedProduct.category}`)
    }
    if (form.notes) {
      lines.push('')
      lines.push(form.notes)
    }
    lines.push('')
    lines.push('— Alfanex Solutions')
    return lines.join('\n')
  }

  const message = buildMessage()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <Layout title="Contact">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-black/8">
          {['contacts', 'message'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? 'text-white' : 'text-black/50 hover:text-black/70'
              }`}
              style={tab === t ? { background: '#684df4' } : {}}
            >
              {t === 'contacts' ? '👥 Contacts' : '💬 Message Generator'}
            </button>
          ))}
        </div>

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <div className="space-y-3">
            <input
              placeholder="Search by name or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-black/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
            />
            {filtered.length === 0 && (
              <p className="text-center text-sm text-black/40 py-8">No contacts found</p>
            )}
            <div className="space-y-2">
              {filtered.map(u => (
                <div key={u.id} className="bg-white rounded-xl px-4 py-3 border border-black/8 flex items-center gap-3">
                  <Avatar user={u} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#17184a] truncate">{u.name}</p>
                    <p className="text-xs text-black/40 capitalize">
                      {u.role}{u.department ? ` · ${u.department}` : ''}
                    </p>
                    {u.phone && (
                      <p className="text-xs text-black/50 mt-0.5">{u.phone}</p>
                    )}
                  </div>
                  {u.phone ? (
                    <a
                      href={`https://wa.me/${toWaNumber(u.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0"
                      style={{ background: '#25D366' }}
                    >
                      <svg viewBox="0 0 32 32" fill="currentColor" width="13" height="13">
                        <path d="M16 0C7.164 0 0 7.164 0 16c0 2.812.732 5.45 2.017 7.74L0 32l8.51-2.234A15.93 15.93 0 0016 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm7.993 22.274c-.33.927-1.942 1.791-2.657 1.84-.714.05-1.366.283-4.64-.964-3.916-1.499-6.367-5.5-6.558-5.756-.19-.256-1.571-2.087-1.571-3.981s.996-2.823 1.35-3.21c.352-.386.768-.482 1.024-.482.256 0 .512.002.736.013.237.011.555-.09.87.665.33.796 1.12 2.742 1.217 2.942.097.2.16.434.033.7-.129.27-.194.434-.385.668-.192.234-.403.523-.576.703-.192.2-.39.417-.168.817.222.4.988 1.628 2.121 2.637 1.457 1.299 2.687 1.701 3.087 1.894.4.192.633.16.865-.097.232-.255.992-1.155 1.257-1.553.265-.397.53-.33.896-.198.366.13 2.321 1.094 2.72 1.294.399.2.665.3.764.466.097.168.097.966-.233 1.893z"/>
                      </svg>
                      Chat
                    </a>
                  ) : (
                    <span className="text-xs text-black/25 shrink-0">No number</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MESSAGE GENERATOR TAB ── */}
        {tab === 'message' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-black/8 space-y-4">
              <h3 className="font-serif text-base font-medium" style={{ color: '#17184a' }}>Message Details</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-black/50 mb-1 block">Customer Name</label>
                  <input
                    placeholder="e.g. Ravi Kumar"
                    value={form.customer}
                    onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={form.time.replace(/\s?(AM|PM)/i, '')}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number)
                      const ampm = h >= 12 ? 'PM' : 'AM'
                      const h12 = h % 12 || 12
                      setForm(f => ({ ...f, time: `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}` }))
                    }}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-black/50 mb-1 block">Purpose / Reason</label>
                  <input
                    placeholder="e.g. Site visit, Product demo, Follow-up…"
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-black/50 mb-1 block">Product (optional)</label>
                  <select
                    value={form.productId}
                    onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30 bg-white"
                  >
                    <option value="">— None —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString('en-IN')}</option>
                    ))}
                  </select>
                </div>

                {/* Product preview */}
                {selectedProduct && (
                  <div className="col-span-2 flex gap-3 p-3 rounded-xl border border-[#684df4]/20 bg-[#684df4]/5">
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt={selectedProduct.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0 border border-black/8" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center text-2xl border border-black/8 bg-white">◈</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#17184a]">{selectedProduct.name}</p>
                      <p className="text-sm font-bold" style={{ color: '#684df4' }}>₹{Number(selectedProduct.price).toLocaleString('en-IN')}</p>
                      {selectedProduct.category && <p className="text-xs text-black/40">{selectedProduct.category}</p>}
                      {selectedProduct.description && <p className="text-xs text-black/60 mt-1 line-clamp-2">{selectedProduct.description}</p>}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-xs font-medium text-black/50 mb-1 block">Additional Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Any extra details…"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-2xl p-5 border border-black/8">
              <h3 className="font-serif text-base font-medium mb-3" style={{ color: '#17184a' }}>Preview</h3>
              <pre className="text-sm text-black/70 whitespace-pre-wrap bg-[#f7f8fc] rounded-xl p-4 border border-black/8 font-sans leading-relaxed">
                {message}
              </pre>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                  style={copied ? { borderColor: '#25D366', color: '#25D366' } : { borderColor: '#684df4', color: '#684df4' }}
                >
                  {copied ? '✓ Copied!' : 'Copy Message'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#25D366' }}
                >
                  Share on WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

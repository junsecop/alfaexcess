import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function ProductModal({ product, onClose, onSaved }) {
  const editing = !!product
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || '',
    inStock: product?.inStock ?? true,
  })
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (image) fd.append('image', image)
      const r = editing
        ? await api.put(`/products/${product.id}`, fd)
        : await api.post('/products', fd)
      onSaved(r.data)
      onClose()
    } catch {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-serif text-lg font-medium mb-4">{editing ? 'Edit Product' : 'New Product'}</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Product name" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <textarea placeholder="Description" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm h-16 resize-none"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" placeholder="Price (₹)" className="px-3 py-2 border border-black/15 rounded-lg text-sm"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            <input placeholder="Category" className="px-3 py-2 border border-black/15 rounded-lg text-sm"
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.inStock}
              onChange={e => setForm(f => ({ ...f, inStock: e.target.checked }))} />
            In Stock
          </label>
          <div className="border border-dashed border-black/15 rounded-lg p-3 text-center">
            <input type="file" id="prod-img" className="hidden" accept="image/*" onChange={e => setImage(e.target.files[0])} />
            <label htmlFor="prod-img" className="cursor-pointer text-sm text-black/40">
              {image ? image.name : 'Upload image (optional)'}
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-black/15 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#c8f04a', color: '#111318' }}>
              {loading ? '…' : editing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Products() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    await api.delete(`/products/${id}`)
    setProducts(p => p.filter(x => x._id !== id))
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Products">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex gap-3 items-center">
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-[#c8f04a]" />
          {isManager && (
            <button onClick={() => { setEditing(null); setShowModal(true) }}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#c8f04a', color: '#111318' }}>
              + Add Product
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-10 text-center text-sm text-black/30 border border-black/8">
              No products found
            </div>
          )}
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-black/8 overflow-hidden">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-black/5 flex items-center justify-center">
                  <span className="text-4xl text-black/20">◈</span>
                </div>
              )}
              <div className="p-4">
                <p className="font-medium text-[#111318] text-sm truncate">{p.name}</p>
                {p.category && <p className="text-xs text-black/40 mt-0.5">{p.category}</p>}
                <p className="font-serif text-lg font-medium mt-2">₹{p.price?.toLocaleString()}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                  {isManager && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(p); setShowModal(true) }}
                        className="text-xs text-black/40 hover:text-black">Edit</button>
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDelete(p.id)}
                          className="text-xs text-red-400 hover:text-red-600">Del</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <ProductModal
          product={editing}
          onClose={() => setShowModal(false)}
          onSaved={saved => {
            setProducts(ps => editing
              ? ps.map(p => p.id === saved.id ? saved : p)
              : [saved, ...ps]
            )
          }}
        />
      )}
    </Layout>
  )
}

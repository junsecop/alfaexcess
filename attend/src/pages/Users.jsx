import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const EMPTY = { name: '', email: '', password: '', role: 'staff', department: '', phone: '' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null) // null = create, user obj = edit
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pwModal, setPwModal] = useState(null) // user obj for password reset
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, department: u.department || '', phone: u.phone || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone }
        await api.put(`/auth/users/${editing.id}`, payload)
      } else {
        await api.post('/auth/create-user', form)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const openPwModal = (u) => {
    setPwModal(u)
    setNewPw('')
    setPwError('')
    setPwSuccess('')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setPwSaving(true)
    setPwError('')
    setPwSuccess('')
    try {
      await api.put(`/auth/users/${pwModal.id}/password`, { password: newPw })
      setPwSuccess('Password updated successfully')
      setNewPw('')
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password')
    } finally {
      setPwSaving(false)
    }
  }

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name}?`)) return
    try {
      await api.delete(`/auth/users/${u.id}`)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    }
  }

  const roleColor = (role) => {
    if (role === 'admin') return { background: '#111318', color: '#c8f04a' }
    if (role === 'manager') return { background: '#e8f5d0', color: '#2d5a00' }
    return { background: '#f0f0f0', color: '#555' }
  }

  return (
    <Layout title="Users">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-black/40">{users.length} active user{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: '#c8f04a', color: '#111318' }}
        >
          + Add User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#c8f04a] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 text-black/40 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Department</th>
                <th className="text-left px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-black/5 last:border-0 hover:bg-black/2">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: '#c8f04a', color: '#111318' }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-[#111318]">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-black/60">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize" style={roleColor(u.role)}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-black/60">{u.department || '—'}</td>
                  <td className="px-5 py-3 text-black/60">{u.phone || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="text-xs text-black/40 hover:text-black mr-3">Edit</button>
                    <button onClick={() => handleDeactivate(u)} className="text-xs text-red-400 hover:text-red-600">Deactivate</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-black/30">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-serif text-xl font-medium mb-5">{editing ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Name *</label>
                  <input required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Email *</label>
                  <input required type="email" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                {!editing && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-black/50 mb-1 block">Password *</label>
                    <input required type="password" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Role</label>
                  <select className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white"
                    value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Department</label>
                  <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-black/50 mb-1 block">Phone</label>
                  <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#c8f04a', color: '#111318' }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

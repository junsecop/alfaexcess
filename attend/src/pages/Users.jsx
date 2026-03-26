import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const EMPTY = { name: '', email: '', password: '', role: 'staff', department: '', phone: '', canDownloadCsv: null, canEditAttendance: null, requiresAttendance: true }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  // Create/edit modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Password modal
  const [pwModal, setPwModal] = useState(null)
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  // Only send permission fields to backend when admin explicitly changed them
  const [permissionsChanged, setPermissionsChanged] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = () => {
    setLoading(true)
    const url = showInactive ? '/auth/users?includeInactive=true' : '/auth/users'
    api.get(url).then(r => setUsers(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [showInactive])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name, email: u.email || '', password: '', role: u.role, department: u.department || '', phone: u.phone || '', canDownloadCsv: u.canDownloadCsv ?? null, canEditAttendance: u.canEditAttendance ?? null, requiresAttendance: u.requiresAttendance ?? true })
    setPermissionsChanged(false)
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const { data } = await api.put(`/auth/users/${editing.id}`, {
          name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone,
          ...(permissionsChanged && { canDownloadCsv: form.canDownloadCsv, canEditAttendance: form.canEditAttendance, requiresAttendance: form.requiresAttendance }),
        })
        setUsers(us => us.map(u => u.id === editing.id ? { ...u, ...data.user } : u))
      } else {
        await api.post('/auth/create-user', form)
        load()
      }
      setShowModal(false)
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

  const handleReactivate = async (u) => {
    try {
      await api.put(`/auth/users/${u.id}`, { isActive: true })
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reactivate')
    }
  }

  const handleDelete = async (permanent = false) => {
    const u = deleteModal
    if (!u) return
    setDeleteLoading(true)
    try {
      const url = permanent ? `/auth/users/${u.id}?permanent=true` : `/auth/users/${u.id}`
      await api.delete(url)
      setDeleteModal(null)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  const roleColor = (role) => {
    if (role === 'admin') return { background: '#111318', color: '#c8f04a' }
    if (role === 'manager') return { background: '#e8f5d0', color: '#2d5a00' }
    return { background: '#f0f0f0', color: '#555' }
  }

  const active = users.filter(u => u.isActive !== false)
  const inactive = users.filter(u => u.isActive === false)

  return (
    <Layout title="Users">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <p className="text-sm text-black/40">{active.length} active user{active.length !== 1 ? 's' : ''}</p>
          {inactive.length > 0 && (
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                showInactive
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-black/5 text-black/40 border-black/10 hover:text-black'
              }`}
            >
              {showInactive ? '✕ Hide deactivated' : `${inactive.length} deactivated`}
            </button>
          )}
          {inactive.length === 0 && showInactive && (
            <button onClick={() => setShowInactive(false)} className="text-xs text-black/30 hover:text-black">
              Hide inactive
            </button>
          )}
        </div>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: '#c8f04a', color: '#111318' }}>
          + Add User
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#684df4] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active users */}
          <div className="bg-white rounded-2xl border border-black/8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8 text-black/40 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Department</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Phone</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {active.map(u => (
                  <tr key={u.id} className="border-b border-black/5 last:border-0 hover:bg-black/2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: '#684df4', color: '#fff' }}>
                          {u.name[0].toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: '#17184a' }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-black/50 text-xs hidden sm:table-cell">{u.email || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize" style={roleColor(u.role)}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-black/50 text-xs hidden md:table-cell">{u.department || '—'}</td>
                    <td className="px-5 py-3 text-black/50 text-xs hidden md:table-cell">{u.phone || '—'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(u)} className="text-xs text-black/40 hover:text-black mr-2">Edit</button>
                      <button onClick={() => openPwModal(u)} className="text-xs text-black/40 hover:text-black mr-2">Password</button>
                      <button onClick={() => setDeleteModal(u)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
                {active.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-black/30">No active users</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Deactivated users section */}
          {showInactive && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-3">
                Deactivated Users ({inactive.length})
              </p>
              {inactive.length === 0 ? (
                <p className="text-sm text-black/30 px-1">No deactivated users</p>
              ) : (
                <div className="bg-white rounded-2xl border border-red-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-50 text-black/30 text-xs uppercase tracking-wide">
                        <th className="text-left px-5 py-3 font-medium">Name</th>
                        <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Email</th>
                        <th className="text-left px-5 py-3 font-medium">Role</th>
                        <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Department</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {inactive.map(u => (
                        <tr key={u.id} className="border-b border-red-50 last:border-0 opacity-70 hover:opacity-100 transition-opacity">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-black/10 text-black/40">
                                {u.name[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-black/50">{u.name}</p>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-500 font-medium">Deactivated</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-black/40 text-xs hidden sm:table-cell">{u.email || '—'}</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize opacity-50" style={roleColor(u.role)}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-black/40 text-xs hidden md:table-cell">{u.department || '—'}</td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleReactivate(u)}
                              className="text-xs font-semibold mr-3 px-2 py-1 rounded-lg text-white"
                              style={{ background: '#684df4' }}
                            >
                              Reactivate
                            </button>
                            <button
                              onClick={() => setDeleteModal(u)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-serif text-xl font-medium mb-5" style={{ color: '#17184a' }}>
              {editing ? 'Edit User' : 'Add User'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="text-xs font-medium text-black/50 mb-2 block">Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'staff', icon: '👤', label: 'Staff', desc: 'Attendance tracking only' },
                    { value: 'manager', icon: '👥', label: 'Manager', desc: 'Admin access + attendance' },
                    { value: 'admin', icon: '⚡', label: 'Admin', desc: 'Full access, visit log' },
                  ].map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        form.role === r.value
                          ? 'border-[#684df4] bg-[#684df4]/5'
                          : 'border-black/10 hover:border-black/20 bg-white'
                      }`}>
                      <span className="text-xl block mb-1">{r.icon}</span>
                      <p className="text-xs font-semibold" style={{ color: form.role === r.value ? '#684df4' : '#17184a' }}>{r.label}</p>
                      <p className="text-xs text-black/40 mt-0.5 leading-tight">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Name *</label>
                  <input required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Email (optional)</label>
                  <input type="email" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
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
                  <label className="text-xs font-medium text-black/50 mb-1 block">Department</label>
                  <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 mb-1 block">Phone</label>
                  <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              {/* Permissions — only shown when editing */}
              {editing && (
                <div className="border border-black/10 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Permissions</p>
                  {[
                    { key: 'canDownloadCsv', label: 'Download CSV', defaultFor: ['admin', 'manager'] },
                    { key: 'canEditAttendance', label: 'Edit Attendance', defaultFor: ['admin', 'manager'] },
                  ].map(({ key, label, defaultFor }) => {
                    const roleDefault = defaultFor.includes(form.role)
                    const resolved = form[key] === null ? roleDefault : form[key]
                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#17184a' }}>{label}</p>
                          {form[key] === null && <p className="text-xs text-black/30">Default ({roleDefault ? 'allowed' : 'denied'})</p>}
                        </div>
                        <div className="flex gap-1">
                          {[{ val: null, text: 'Default' }, { val: true, text: 'Allow' }, { val: false, text: 'Deny' }].map(opt => (
                            <button key={String(opt.val)} type="button"
                              onClick={() => { setForm(f => ({ ...f, [key]: opt.val })); setPermissionsChanged(true) }}
                              className={`px-2 py-1 rounded text-xs font-medium transition ${
                                form[key] === opt.val
                                  ? opt.val === false ? 'bg-red-100 text-red-600' : opt.val === true ? 'bg-green-100 text-green-700' : 'bg-[#684df4]/10 text-[#684df4]'
                                  : 'bg-black/5 text-black/40 hover:bg-black/10'
                              }`}>
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-black/8">
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#17184a' }}>Requires Attendance</p>
                      <p className="text-xs text-black/30">Uncheck to hide check-in/out for this user</p>
                    </div>
                    <button type="button"
                      onClick={() => { setForm(f => ({ ...f, requiresAttendance: !f.requiresAttendance })); setPermissionsChanged(true) }}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${form.requiresAttendance ? 'bg-[#684df4]' : 'bg-black/20'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${form.requiresAttendance ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm">Cancel</button>
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

      {/* Password reset modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-serif text-lg font-medium mb-1" style={{ color: '#17184a' }}>Reset Password</h2>
            <p className="text-xs text-black/40 mb-4">{pwModal.name}</p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input required type="password" minLength={6} placeholder="New password (min 6 chars)"
                className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                value={newPw} onChange={e => setNewPw(e.target.value)} />
              {pwError && <p className="text-sm text-red-500">{pwError}</p>}
              {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPwModal(null)}
                  className="flex-1 py-2.5 rounded-lg border border-black/15 text-sm">Cancel</button>
                <button type="submit" disabled={pwSaving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#684df4' }}>
                  {pwSaving ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-serif text-lg font-medium mb-1" style={{ color: '#17184a' }}>
              {deleteModal.isActive === false ? 'Manage Deactivated User' : 'Remove User'}
            </h2>
            <p className="text-sm text-black/60 mb-4">
              <strong>{deleteModal.name}</strong>
              {deleteModal.isActive === false && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-500">Deactivated</span>}
            </p>
            <div className="space-y-3">
              {deleteModal.isActive !== false && (
                <button onClick={() => handleDelete(false)} disabled={deleteLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-black/10 hover:bg-black/3 transition">
                  <p className="text-sm font-medium" style={{ color: '#17184a' }}>Deactivate</p>
                  <p className="text-xs text-black/40 mt-0.5">Block login · data stays in database · can be reactivated later</p>
                </button>
              )}
              {deleteModal.isActive === false && (
                <button onClick={() => { setDeleteModal(null); handleReactivate(deleteModal) }} disabled={deleteLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition">
                  <p className="text-sm font-medium text-green-700">Reactivate</p>
                  <p className="text-xs text-green-500 mt-0.5">Restore access — user can log in again</p>
                </button>
              )}
              <button onClick={() => handleDelete(true)} disabled={deleteLoading}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition">
                <p className="text-sm font-medium text-red-600">Permanently Delete</p>
                <p className="text-xs text-red-400 mt-0.5">Remove user + all attendance, bills, tasks, uploads — cannot be undone</p>
              </button>
              <button onClick={() => setDeleteModal(null)}
                className="w-full py-2.5 rounded-xl border border-black/15 text-sm text-black/50 hover:text-black">
                Cancel
              </button>
            </div>
            {deleteLoading && (
              <div className="flex justify-center mt-3">
                <div className="w-5 h-5 border-2 border-[#684df4] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

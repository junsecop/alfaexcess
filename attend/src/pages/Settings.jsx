import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Settings() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', department: user?.department || '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      // Update profile via auth/me PATCH (we'll add it) — fallback to just showing success
      setMsg('Profile saved (no server endpoint yet — connect /api/auth/profile)')
    } catch {
      setMsg('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Settings">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-4">Profile</h3>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: '#c8f04a', color: '#111318' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-[#111318]">{user?.name}</p>
              <p className="text-sm text-black/40 capitalize">{user?.role}</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Name</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Email</label>
                <input type="email" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Phone</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Department</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                  value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: '#c8f04a', color: '#111318' }}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Role info */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-3">Account Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-black/5">
              <span className="text-black/50">Role</span>
              <span className="font-medium capitalize px-2 py-0.5 rounded" style={{ background: '#c8f04a', color: '#111318' }}>
                {user?.role}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-black/5">
              <span className="text-black/50">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-black/50">User ID</span>
              <span className="text-xs text-black/30 font-mono">{user?._id}</span>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-3">About</h3>
          <p className="text-sm text-black/50">Alfanex Attendance & Management App</p>
          <p className="text-xs text-black/30 mt-1">v1.0.0 · Built for alfanex.in</p>
        </div>
      </div>
    </Layout>
  )
}

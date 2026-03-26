import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Settings() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  })
  const [profileMsg, setProfileMsg] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState('')
  const fileRef = useRef()

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg('')
    try {
      const r = await api.patch('/auth/profile', form)
      setUser(r.data.user)
      setProfileMsg('Profile saved')
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Failed to save')
    } finally {
      setProfileSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) return setPwMsg('Passwords do not match')
    setPwSaving(true)
    setPwMsg('')
    try {
      await api.patch('/auth/password', { current: pwForm.current, next: pwForm.next })
      setPwMsg('Password changed successfully')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg(err.response?.data?.message || 'Failed')
    } finally {
      setPwSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarMsg('')
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const r = await api.post('/auth/avatar', fd)
      setUser(r.data.user)
      setAvatarMsg('Photo updated')
    } catch (err) {
      setAvatarMsg(err.response?.data?.message || 'Upload failed')
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <Layout title="Settings">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Profile card */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-5" style={{ color: '#17184a' }}>Profile</h3>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-black/8" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-2 border-black/8"
                  style={{ background: '#684df4', color: '#fff' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-white shadow"
                style={{ background: '#684df4', color: '#fff' }}
                title="Change photo"
              >
                {avatarUploading ? '…' : '✎'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#17184a' }}>{user?.name}</p>
              <p className="text-xs text-black/40 capitalize mt-0.5">{user?.role}{user?.department ? ` · ${user.department}` : ''}</p>
              <button onClick={() => fileRef.current.click()} className="text-sm mt-2 font-medium" style={{ color: '#684df4' }}>
                {avatarUploading ? 'Uploading…' : 'Change photo'}
              </button>
              {avatarMsg && <p className="text-xs text-green-600 mt-1">{avatarMsg}</p>}
              <div className="mt-4 pt-4 border-t border-black/8">
                <button
                  onClick={async () => { await logout(); navigate('/login') }}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#e53e3e' }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Name</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Email (optional)</label>
                <input type="email" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Phone</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Department</label>
                <input className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            {profileMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${profileMsg.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {profileMsg}
              </p>
            )}
            <button type="submit" disabled={profileSaving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#684df4' }}>
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-4" style={{ color: '#17184a' }}>Change Password</h3>
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Current Password</label>
              <input required type="password"
                className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">New Password</label>
                <input required type="password" minLength={6}
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50 mb-1 block">Confirm Password</label>
                <input required type="password"
                  className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30"
                  value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
            {pwMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${pwMsg.includes('incorrect') || pwMsg.includes('match') || pwMsg.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {pwMsg}
              </p>
            )}
            <button type="submit" disabled={pwSaving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#684df4' }}>
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl p-6 border border-black/8">
          <h3 className="font-serif text-lg font-medium mb-3" style={{ color: '#17184a' }}>Account</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-black/5">
              <span className="text-black/50">Role</span>
              <span className="font-semibold capitalize px-2 py-0.5 rounded text-white text-xs"
                style={{ background: '#684df4' }}>{user?.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-black/5">
              <span className="text-black/50">Email</span>
              <span className="font-medium text-xs">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-black/50">User ID</span>
              <span className="text-xs text-black/30 font-mono truncate max-w-[140px]">{user?.id}</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-5 border border-black/8">
          <p className="text-sm text-black/50">Alfanex Attendance & Management</p>
          <p className="text-xs text-black/30 mt-1">v1.0.0 · alfanex.in</p>
        </div>
      </div>
    </Layout>
  )
}

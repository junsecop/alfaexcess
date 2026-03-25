import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f7f8fc' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: '#17184a' }}>
        <div>
          <div className="text-xl font-bold font-serif" style={{ color: '#c8f04a' }}>Alfanex Solutions</div>
        </div>
        <div>
          <div className="w-12 h-1 rounded-full mb-6" style={{ background: '#684df4' }} />
          <h2 className="text-white font-serif text-4xl font-medium leading-tight mb-4">
            Manage your team,<br />track every day.
          </h2>
          <p className="text-white/50 text-sm">
            Attendance, billing, tasks — all in one place.
          </p>
        </div>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Alfanex</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo — shown on all screens */}
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="Alfanex Solutions" className="h-14 object-contain mx-auto" />
          </div>

          <h1 className="font-serif text-3xl font-medium mb-1" style={{ color: '#17184a' }}>Sign in</h1>
          <p className="text-sm text-black/40 mb-8">Use your name or email to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#17184a' }}>
                Name or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#684df4' }}
                placeholder="Your name or email"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#17184a' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white text-sm focus:outline-none focus:ring-2"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-60 text-white mt-2"
              style={{ background: '#684df4' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

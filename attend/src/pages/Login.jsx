import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f7f6f2' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: '#111318' }}
      >
        <div>
          <span className="text-[#c8f04a] text-2xl font-bold font-serif">Alfanex</span>
        </div>
        <div>
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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl font-medium text-[#111318] mb-2">Sign in</h1>
          <p className="text-sm text-black/50 mb-8">Enter your credentials to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c8f04a] focus:border-transparent"
                placeholder="you@alfanex.in"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c8f04a] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity"
              style={{ background: '#c8f04a', color: '#111318' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

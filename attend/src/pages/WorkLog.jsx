import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}
const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

function CreateTaskModal({ users, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', assignedToId: '', priority: 'medium', dueDate: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/tasks', form)
      onCreated(r.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-serif text-lg font-medium mb-4" style={{ color: '#17184a' }}>New Task</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm" placeholder="Title"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm h-20 resize-none" placeholder="Description (optional)"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div>
            <label className="text-xs font-medium text-black/50 mb-1 block">Assign to *</label>
            <select required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white"
              value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
              <option value="">Select staff member…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Priority</label>
              <select className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white"
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Due Date</label>
              <input type="date" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-black/15 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#684df4' }}>
              {loading ? '…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WorkLog() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchTasks = () => {
    const endpoint = isManager ? `/tasks/all${statusFilter ? `?status=${statusFilter}` : ''}` : '/tasks/my'
    api.get(endpoint).then(r => setTasks(r.data))
  }

  useEffect(() => {
    fetchTasks()
    if (isManager) api.get('/auth/users').then(r => setUsers(r.data))
  }, [statusFilter, isManager])

  const updateStatus = async (id, status) => {
    try {
      const r = await api.patch(`/tasks/${id}/status`, { status })
      setTasks(ts => ts.map(t => t.id === id ? r.data : t))
    } catch {}
  }

  const handleDelete = async (task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return
    try {
      await api.delete(`/tasks/${task.id}`)
      setTasks(ts => ts.filter(t => t.id !== task.id))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <Layout title="Work Log">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex gap-3 items-center">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none">
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {isManager && (
            <button onClick={() => setShowModal(true)}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#684df4' }}>
              + Assign Task
            </button>
          )}
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center text-sm text-black/30 border border-black/8">
              No tasks found
            </div>
          )}
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl p-5 border border-black/8">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-sm" style={{ color: '#17184a' }}>{task.title}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-black/50 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-black/40 flex-wrap">
                    {task.assignedTo && <span>👤 {task.assignedTo.name}</span>}
                    {task.dueDate && <span>📅 Due: {task.dueDate.slice(0, 10)}</span>}
                    {task.assignedBy && <span>By: {task.assignedBy.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                  {task.status !== 'done' && task.status !== 'cancelled' && (
                    <select
                      value={task.status}
                      onChange={e => updateStatus(task.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-black/15 bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      {isManager && <option value="cancelled">Cancelled</option>}
                    </select>
                  )}
                  {user?.role === 'admin' && (
                    <button onClick={() => handleDelete(task)}
                      className="text-xs px-2 py-1 rounded border border-red-100 text-red-400 hover:text-red-600 hover:border-red-300 transition">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <CreateTaskModal
          users={users}
          onClose={() => setShowModal(false)}
          onCreated={t => setTasks(ts => [t, ...ts])}
        />
      )}
    </Layout>
  )
}

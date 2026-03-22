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
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function CreateTaskModal({ users, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api.post('/tasks', form)
      onCreated(r.data)
      onClose()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-serif text-lg font-medium mb-4">New Task</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm" placeholder="Title"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm h-20 resize-none" placeholder="Description"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <select required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
            value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
            <option value="">Assign to…</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <select className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
            value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="date" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
            value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-black/15 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#c8f04a', color: '#111318' }}>
              {loading ? '…' : 'Create'}
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
      setTasks(ts => ts.map(t => t._id === id ? r.data : t))
    } catch {}
  }

  return (
    <Layout title="Work Log">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex gap-3 items-center">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-black/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8f04a]">
            <option value="">All statuses</option>
            {['pending','in-progress','done','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {isManager && (
            <button onClick={() => setShowModal(true)}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#c8f04a', color: '#111318' }}>
              + New Task
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
            <div key={task._id} className="bg-white rounded-2xl p-5 border border-black/8">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-[#111318] text-sm">{task.title}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-black/50 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-black/40 flex-wrap">
                    {task.assignedTo && <span>Assigned to: {task.assignedTo.name || '—'}</span>}
                    {task.dueDate && <span>Due: {task.dueDate.slice(0, 10)}</span>}
                    {task.assignedBy && <span>By: {task.assignedBy.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                    {task.status}
                  </span>
                  {task.status !== 'done' && task.status !== 'cancelled' && (
                    <select
                      value={task.status}
                      onChange={e => updateStatus(task._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-black/15 bg-white"
                    >
                      <option value="pending">pending</option>
                      <option value="in-progress">in-progress</option>
                      <option value="done">done</option>
                      {isManager && <option value="cancelled">cancelled</option>}
                    </select>
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

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

// Parse all metadata stored in tags array
function parseTaskMeta(tags = []) {
  const phone    = tags.find(t => t.startsWith('phone:'))?.slice(6) || ''
  const location = tags.find(t => t.startsWith('location:'))?.slice(9) || ''
  const collect  = tags.find(t => t.startsWith('collect:'))?.slice(8) || ''   // expected amount to collect
  const payment  = tags.find(t => t.startsWith('payment:'))?.slice(8) || null // 'collected:500' | 'pending' | null
  const paidAmt  = tags.find(t => t.startsWith('paidamt:'))?.slice(8) || ''   // actual collected amount
  const customer = tags.find(t => t.startsWith('customer:'))?.slice(9) || ''
  return { phone, location, collect, payment, paidAmt, customer }
}

// Returns tags array with payment tags replaced
function setPaymentTags(existingTags = [], collected, amount, customer) {
  const base = existingTags.filter(t =>
    !t.startsWith('payment:') && !t.startsWith('paidamt:') && !t.startsWith('customer:')
  )
  if (collected) {
    base.push('payment:collected')
    if (amount) base.push(`paidamt:${amount}`)
  } else {
    base.push('payment:pending')
    if (customer) base.push(`customer:${customer}`)
  }
  return base
}

// ── Payment Modal (record or edit) ────────────────────────────
function PaymentModal({ task, markDone, onClose, onSaved }) {
  const { collect, payment, paidAmt, customer, phone } = parseTaskMeta(task.tags)
  const isEdit = !!payment  // editing existing payment vs recording new

  const [collected, setCollected] = useState(
    payment === 'collected' ? true : payment === 'pending' ? false : null
  )
  const [amount, setAmount] = useState(paidAmt || collect || '')
  const [customerName, setCustomerName] = useState(customer || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (collected === null) return
    setSaving(true)
    const newTags = setPaymentTags(task.tags, collected, amount, customerName)
    try {
      const r = await api.patch(`/tasks/${task.id}/status`, {
        status: markDone ? 'done' : task.status,
        tags: newTags,
      })
      onSaved(r.data)
      onClose()
    } catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-serif text-base font-medium mb-1" style={{ color: '#17184a' }}>
          {isEdit ? 'Edit Payment' : 'Payment Collection'}
        </h3>
        <p className="text-xs text-black/40 mb-1">{task.title}</p>
        {collect && (
          <p className="text-xs font-semibold mb-4" style={{ color: '#684df4' }}>
            Expected: ₹{Number(collect).toLocaleString('en-IN')}
          </p>
        )}

        <div className="flex gap-3 mb-4">
          <button onClick={() => setCollected(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors
              ${collected === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-black/10 text-black/50'}`}>
            ✅ Collected
          </button>
          <button onClick={() => setCollected(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors
              ${collected === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-black/10 text-black/50'}`}>
            ❌ Not Collected
          </button>
        </div>

        {collected === true && (
          <div className="mb-4">
            <label className="text-xs font-medium text-black/50 mb-1 block">Amount Collected (₹)</label>
            <input type="number" placeholder={collect || '0.00'} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-black/15 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30" />
          </div>
        )}

        {collected === false && (
          <div className="mb-4 space-y-2">
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Customer Name (for follow-up)</label>
              <input placeholder="e.g. Ravi Kumar" value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-black/15 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#684df4]/30" />
            </div>
            {phone && (
              <p className="text-xs text-black/40">📞 {phone}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-black/15 text-sm text-black/50">
            {markDone && !isEdit ? 'Skip' : 'Cancel'}
          </button>
          <button onClick={save} disabled={collected === null || saving}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: '#684df4' }}>
            {saving ? '…' : markDone ? 'Save & Complete' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create Task Modal ─────────────────────────────────────────
function CreateTaskModal({ users, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', assignedToId: '', priority: 'medium', dueDate: '',
    phone: '', location: '', collectAmount: '',
  })
  const [loading, setLoading] = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [error, setError] = useState('')

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        setForm(f => ({ ...f, location: `https://maps.google.com/?q=${latitude},${longitude}` }))
        setLocLoading(false)
      },
      () => setLocLoading(false)
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const tags = []
      if (form.phone.trim())         tags.push(`phone:${form.phone.trim()}`)
      if (form.location.trim())      tags.push(`location:${form.location.trim()}`)
      if (form.collectAmount.trim()) tags.push(`collect:${form.collectAmount.trim()}`)
      const r = await api.post('/tasks', {
        title: form.title, description: form.description,
        assignedToId: form.assignedToId, priority: form.priority,
        dueDate: form.dueDate, tags,
      })
      onCreated(r.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar">
        <h3 className="font-serif text-lg font-medium mb-4" style={{ color: '#17184a' }}>New Task</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm" placeholder="Title"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm h-20 resize-none"
            placeholder="Description (optional)"
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

          {/* Customer & collection info */}
          <div className="border-t border-black/8 pt-3 space-y-3">
            <p className="text-xs font-medium text-black/40 uppercase tracking-wide">Customer Info (optional)</p>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Amount to Collect (₹)</label>
              <input type="number" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                placeholder="Leave blank if no payment needed"
                value={form.collectAmount} onChange={e => setForm(f => ({ ...f, collectAmount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Phone Number</label>
              <input type="tel" className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm"
                placeholder="e.g. 9876543210"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 mb-1 block">Location</label>
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 border border-black/15 rounded-lg text-sm"
                  placeholder="Paste maps link or address"
                  value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                <button type="button" onClick={useCurrentLocation} disabled={locLoading}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-black/15 text-black/60 hover:bg-black/5 shrink-0 disabled:opacity-50">
                  {locLoading ? '…' : '📍 Now'}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-black/15 text-sm">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#684df4' }}>
              {loading ? '…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function WorkLog() {
  const { user } = useAuth()
  const isManager = ['admin', 'manager'].includes(user?.role)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [paymentTask, setPaymentTask] = useState(null)   // {task, markDone}
  const [statusFilter, setStatusFilter] = useState('')

  const fetchTasks = () => {
    const endpoint = isManager
      ? `/tasks/all${statusFilter ? `?status=${statusFilter}` : ''}`
      : '/tasks/my'
    api.get(endpoint).then(r => setTasks(r.data))
  }

  useEffect(() => {
    fetchTasks()
    if (isManager) api.get('/auth/users').then(r => setUsers(r.data))
  }, [statusFilter, isManager])

  const updateStatus = async (id, status) => {
    if (status === 'done') {
      const task = tasks.find(t => t.id === id)
      const { collect } = parseTaskMeta(task?.tags)
      if (collect) {
        // Has a collection amount — show payment modal before completing
        setPaymentTask({ task, markDone: true })
        return
      }
    }
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

  const onPaymentSaved = (updated) => {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))
    setPaymentTask(null)
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
          {tasks.map(task => {
            const { phone, location, collect, payment, paidAmt, customer } = parseTaskMeta(task.tags)
            const isDone = task.status === 'done'
            const hasPendingPayment = isDone && collect && !payment

            return (
              <div key={task.id}
                className={`bg-white rounded-2xl p-5 border transition-colors ${hasPendingPayment ? 'border-orange-200' : 'border-black/8'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">

                    {/* Title + priority */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-sm" style={{ color: '#17184a' }}>{task.title}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {collect && !isDone && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-600">
                          ₹{Number(collect).toLocaleString('en-IN')} to collect
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-black/50 mb-2">{task.description}</p>
                    )}

                    {/* Phone + location */}
                    {(phone || location) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {phone && (
                          <a href={`https://wa.me/91${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                            style={{ background: '#25D366' }}>
                            📞 {phone}
                          </a>
                        )}
                        {location && (
                          <a href={location} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                            style={{ background: '#684df4' }}>
                            📍 {location.startsWith('https://maps') ? 'Open Location' : location.length > 30 ? location.slice(0, 30) + '…' : location}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Payment status (done tasks) */}
                    {isDone && collect && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {!payment && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-600">
                            ⏳ Payment not recorded
                          </span>
                        )}
                        {payment === 'collected' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                            ✓ ₹{paidAmt ? Number(paidAmt).toLocaleString('en-IN') : Number(collect).toLocaleString('en-IN')} Collected
                          </span>
                        )}
                        {payment === 'pending' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600">
                            ⚠ Payment Pending{customer ? ` · ${customer}` : ''}
                          </span>
                        )}
                        {/* Admin/manager can always edit payment */}
                        {isManager && (
                          <button
                            onClick={() => setPaymentTask({ task, markDone: false })}
                            className="text-xs px-2 py-1 rounded border border-[#684df4]/30 text-[#684df4] hover:bg-[#684df4]/5 transition">
                            Edit Payment
                          </button>
                        )}
                        {/* Staff can record if not yet recorded */}
                        {!isManager && !payment && (
                          <button
                            onClick={() => setPaymentTask({ task, markDone: false })}
                            className="text-xs px-2 py-1 rounded border border-[#684df4]/30 text-[#684df4] hover:bg-[#684df4]/5 transition">
                            + Record Payment
                          </button>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-black/40 flex-wrap">
                      {task.assignedTo && <span>👤 {task.assignedTo.name}</span>}
                      {task.dueDate && <span>📅 Due: {task.dueDate.slice(0, 10)}</span>}
                      {task.assignedBy && <span>By: {task.assignedBy.name}</span>}
                    </div>
                  </div>

                  {/* Right side: status + actions */}
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
            )
          })}
        </div>
      </div>

      {showModal && (
        <CreateTaskModal
          users={users}
          onClose={() => setShowModal(false)}
          onCreated={t => setTasks(ts => [t, ...ts])}
        />
      )}
      {paymentTask && (
        <PaymentModal
          task={paymentTask.task}
          markDone={paymentTask.markDone}
          onClose={() => setPaymentTask(null)}
          onSaved={onPaymentSaved}
        />
      )}
    </Layout>
  )
}

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import db, { sb } from './lib/db.js'

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// ─── Helpers ───────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production'
const signTokens = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '8h' }),
  refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }),
})
const setCookies = (res, at, rt) => {
  res.cookie('accessToken', at, { httpOnly: true, secure: isProd, maxAge: 8 * 60 * 60 * 1000, sameSite: isProd ? 'none' : 'lax' })
  res.cookie('refreshToken', rt, { httpOnly: true, secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: isProd ? 'none' : 'lax' })
}
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, department: u.department })
const pad = (n) => String(n).padStart(2, '0')
const timeNow = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const today = () => new Date().toISOString().slice(0, 10)

// ─── Auth Middleware ────────────────────────────────────────
const protect = async (req, res, next) => {
  const token = req.cookies?.accessToken
  if (!token) return res.status(401).json({ message: 'Not authorised' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.user.findUnique({ where: { id: decoded.id } })
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found' })
    const { password, refreshToken, ...safe } = user
    req.user = safe
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' })
  }
}
const requireRole = (...roles) => (req, res, next) => {
  const role = req.user.role === 'manager' ? 'admin' : req.user.role
  if (!roles.includes(role)) return res.status(403).json({ message: 'Access denied' })
  next()
}

// ─── Upload to Supabase Storage ─────────────────────────────
const uploadToStorage = async (file, folder) => {
  const ext = path.extname(file.originalname)
  const storedName = `${uuidv4()}${ext}`
  const filePath = `${folder}/${storedName}`
  const { error } = await sb.storage.from('uploads').upload(filePath, file.buffer, { contentType: file.mimetype })
  if (error) throw new Error(error.message)
  const { data: { publicUrl } } = sb.storage.from('uploads').getPublicUrl(filePath)
  return { storedName, publicUrl, filePath }
}

// ══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const identifier = email?.trim()
  if (!identifier) return res.status(400).json({ message: 'Name or email is required' })
  // Try email first, then name
  let user = identifier.includes('@')
    ? await db.user.findUnique({ where: { email: identifier } })
    : null
  if (!user) user = await db.user.findFirst({ where: { name: identifier } })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })
  const { accessToken, refreshToken } = signTokens(user.id)
  await db.user.update({ where: { id: user.id }, data: { refreshToken } })
  setCookies(res, accessToken, refreshToken)
  res.json({ user: safeUser(user) })
})

app.post('/api/auth/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken
  if (!token) return res.status(401).json({ message: 'No refresh token' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const user = await db.user.findUnique({ where: { id: decoded.id } })
    if (!user || user.refreshToken !== token) return res.status(401).json({ message: 'Invalid token' })
    const { accessToken, refreshToken } = signTokens(user.id)
    await db.user.update({ where: { id: user.id }, data: { refreshToken } })
    setCookies(res, accessToken, refreshToken)
    res.json({ user: safeUser(user) })
  } catch {
    res.status(401).json({ message: 'Token expired' })
  }
})

app.post('/api/auth/logout', protect, async (req, res) => {
  await db.user.update({ where: { id: req.user.id }, data: { refreshToken: null } })
  res.clearCookie('accessToken').clearCookie('refreshToken').json({ message: 'Logged out' })
})

app.get('/api/auth/me', protect, (req, res) => res.json({ user: req.user }))

app.get('/api/auth/users', protect, async (req, res) => {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, avatar: true, department: true, phone: true },
  })
  res.json(users)
})

app.post('/api/auth/create-user', protect, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, department, phone } = req.body
  if (!name || !password) return res.status(400).json({ message: 'Name and password are required' })
  if (email) {
    const exists = await db.user.findUnique({ where: { email } })
    if (exists) return res.status(400).json({ message: 'Email already in use' })
  }
  const hashed = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: { name, email: email || null, password: hashed, role: role || 'staff', department: department || null, phone: phone || null },
  })
  res.status(201).json({ user: safeUser(user) })
})

app.put('/api/auth/users/:id', protect, requireRole('admin'), async (req, res) => {
  const { name, email, role, department, phone, isActive } = req.body
  const user = await db.user.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && { role }),
      ...(department !== undefined && { department }),
      ...(phone !== undefined && { phone }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  res.json({ user: safeUser(user) })
})

app.delete('/api/auth/users/:id', protect, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot deactivate yourself' })
  await db.user.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ message: 'User deactivated' })
})

app.put('/api/auth/users/:id/password', protect, requireRole('admin'), async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })
  const hashed = await bcrypt.hash(password, 10)
  await db.user.update({ where: { id: req.params.id }, data: { password: hashed, refreshToken: null } })
  res.json({ message: 'Password updated' })
})

// ══════════════════════════════════════════════════════════════
// ATTENDANCE ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/attendance/checkin', protect, async (req, res) => {
  const existing = await db.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today() } } })
  if (existing) return res.status(400).json({ message: 'Already checked in today' })
  const now = new Date()
  const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)
  const record = await db.attendance.create({
    data: { userId: req.user.id, date: today(), checkIn: timeNow(), status: isLate ? 'late' : 'present' },
  })
  res.status(201).json(record)
})

app.post('/api/attendance/checkout', protect, async (req, res) => {
  const { halfDay } = req.body
  const record = await db.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today() } } })
  if (!record) return res.status(404).json({ message: 'No check-in found for today' })
  if (record.checkOut) return res.status(400).json({ message: 'Already checked out' })
  const updated = await db.attendance.update({
    where: { id: record.id },
    data: { checkOut: timeNow(), ...(halfDay && { status: 'half_day' }) },
  })
  res.json(updated)
})

app.get('/api/attendance/my', protect, async (req, res) => {
  const { month } = req.query
  const records = await db.attendance.findMany({
    where: { userId: req.user.id, ...(month && { date: { startsWith: month } }) },
    orderBy: { date: 'desc' },
  })
  res.json(records)
})

app.get('/api/attendance/today', protect, async (req, res) => {
  const record = await db.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today() } } })
  res.json(record || null)
})

app.get('/api/attendance/all', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month, userId, status } = req.query
  const records = await db.attendance.findMany({
    where: {
      ...(month && { date: { startsWith: month } }),
      ...(userId && { userId }),
      ...(status && { status }),
    },
    include: { user: { select: { id: true, name: true, email: true, department: true } } },
    orderBy: { date: 'desc' },
  })
  res.json(records)
})

app.post('/api/attendance/mark', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { userId, date, status, note } = req.body
  const record = await db.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: { status, note, approvedById: req.user.id },
    create: { userId, date, status, note, approvedById: req.user.id },
  })
  res.json(record)
})

app.get('/api/attendance/stats', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month } = req.query
  const records = await db.attendance.findMany({ where: month ? { date: { startsWith: month } } : {} })
  const stats = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  res.json(stats)
})

// ══════════════════════════════════════════════════════════════
// BILLING ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/billing', protect, upload.single('file'), async (req, res) => {
  const { title, type, amount, month, category, customer } = req.body
  let fileUrl = null, fileName = null
  if (req.file) {
    const { publicUrl } = await uploadToStorage(req.file, 'bills')
    fileUrl = publicUrl
    fileName = req.file.originalname
  }
  const bill = await db.bill.create({
    data: { title, type: type || 'misc', amount: Number(amount), month, category, customer: customer || null, submittedById: req.user.id, fileUrl, fileName },
  })
  const admins = await db.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } })
  if (admins.length) {
    await db.notification.createMany({
      data: admins.map(a => ({ recipientId: a.id, type: 'bill', title: 'New bill submitted', message: `${req.user.name} submitted "${title}" — ₹${amount}`, link: '/billing' })),
    })
  }
  res.status(201).json(bill)
})

app.get('/api/billing/my', protect, async (req, res) => {
  const { month, status } = req.query
  const bills = await db.bill.findMany({
    where: { submittedById: req.user.id, ...(month && { month }), ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
  })
  res.json(bills)
})

app.get('/api/billing/all', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month, status, type } = req.query
  const bills = await db.bill.findMany({
    where: { ...(month && { month }), ...(status && { status }), ...(type && { type }) },
    include: { submittedBy: { select: { name: true, email: true } }, approvedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(bills)
})

app.get('/api/billing/summary', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month } = req.query
  const bills = await db.bill.findMany({ where: { status: { in: ['approved', 'paid'] }, ...(month && { month }) } })
  const summary = bills.reduce((acc, b) => { acc.total = (acc.total || 0) + b.amount; acc[b.type] = (acc[b.type] || 0) + b.amount; return acc }, {})
  res.json(summary)
})

app.patch('/api/billing/:id/approve', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { status, adminMessage } = req.body
  const bill = await db.bill.update({
    where: { id: req.params.id },
    data: { status, adminMessage: adminMessage || null, approvedById: req.user.id, approvedAt: new Date() },
    include: { submittedBy: { select: { id: true, name: true } } },
  })
  await db.notification.create({
    data: { recipientId: bill.submittedBy.id, type: 'bill', title: `Bill ${status}`, message: `Your bill "${bill.title}" was ${status}${adminMessage ? ': ' + adminMessage : ''}`, link: '/billing' },
  })
  res.json(bill)
})

app.delete('/api/billing/:id', protect, async (req, res) => {
  const bill = await db.bill.findUnique({ where: { id: req.params.id } })
  if (!bill) return res.status(404).json({ message: 'Bill not found' })
  const isOwner = bill.submittedById === req.user.id
  const isAdmin = ['admin', 'manager'].includes(req.user.role)
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' })
  if (isOwner && !isAdmin && bill.status !== 'pending') return res.status(400).json({ message: 'Cannot delete non-pending bill' })
  await db.bill.delete({ where: { id: req.params.id } })
  res.json({ message: 'Deleted' })
})

// ══════════════════════════════════════════════════════════════
// UPLOADS ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/uploads', protect, requireRole('admin', 'manager'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const { tag, month, docType } = req.body
  const { storedName, publicUrl } = await uploadToStorage(req.file, 'docs')
  const doc = await db.upload.create({
    data: { originalName: req.file.originalname, storedName, fileUrl: publicUrl, fileType: req.file.mimetype, fileSize: req.file.size, tag: tag || null, month: month || null, docType: docType || 'other', uploadedById: req.user.id },
  })
  res.status(201).json(doc)
})

app.get('/api/uploads', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month, docType } = req.query
  const docs = await db.upload.findMany({
    where: { ...(month && { month }), ...(docType && { docType }) },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(docs)
})

app.delete('/api/uploads/:id', protect, requireRole('admin'), async (req, res) => {
  const doc = await db.upload.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await sb.storage.from('uploads').remove([`docs/${doc.storedName}`])
  await db.upload.delete({ where: { id: req.params.id } })
  res.json({ message: 'Deleted' })
})

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/notifications', protect, async (req, res) => {
  const notifications = await db.notification.findMany({
    where: { recipientId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(notifications)
})

app.get('/api/notifications/unread-count', protect, async (req, res) => {
  const count = await db.notification.count({ where: { recipientId: req.user.id, read: false } })
  res.json({ count })
})

app.patch('/api/notifications/read-all', protect, async (req, res) => {
  await db.notification.updateMany({ where: { recipientId: req.user.id, read: false }, data: { read: true } })
  res.json({ message: 'All marked as read' })
})

app.patch('/api/notifications/:id/read', protect, async (req, res) => {
  const n = await db.notification.findFirst({ where: { id: req.params.id, recipientId: req.user.id } })
  if (!n) return res.status(404).json({ message: 'Not found' })
  const updated = await db.notification.update({ where: { id: req.params.id }, data: { read: true } })
  res.json(updated)
})

app.delete('/api/notifications/:id', protect, async (req, res) => {
  await db.notification.deleteMany({ where: { id: req.params.id, recipientId: req.user.id } })
  res.json({ message: 'Deleted' })
})

// ══════════════════════════════════════════════════════════════
// TASKS ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/tasks', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { title, description, assignedToId, priority, dueDate, tags } = req.body
  const task = await db.task.create({
    data: { title, description, assignedToId, assignedById: req.user.id, priority: priority || 'medium', dueDate: dueDate ? new Date(dueDate) : null, tags: tags || [] },
  })
  if (assignedToId) {
    await db.notification.create({
      data: { recipientId: assignedToId, type: 'task', title: 'New task assigned', message: `You have been assigned: ${title}`, link: '/work-log' },
    })
  }
  res.status(201).json(task)
})

app.get('/api/tasks/my', protect, async (req, res) => {
  const tasks = await db.task.findMany({
    where: { assignedToId: req.user.id },
    include: { assignedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tasks)
})

app.get('/api/tasks/all', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { status, assignedToId } = req.query
  const tasks = await db.task.findMany({
    where: { ...(status && { status }), ...(assignedToId && { assignedToId }) },
    include: { assignedTo: { select: { name: true, email: true } }, assignedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tasks)
})

app.patch('/api/tasks/:id/status', protect, async (req, res) => {
  const task = await db.task.findUnique({ where: { id: req.params.id } })
  if (!task) return res.status(404).json({ message: 'Task not found' })
  const isAssignee = task.assignedToId === req.user.id
  const isManager = ['admin', 'manager'].includes(req.user.role)
  if (!isAssignee && !isManager) return res.status(403).json({ message: 'Access denied' })
  const updated = await db.task.update({
    where: { id: req.params.id },
    data: { status: req.body.status, ...(req.body.status === 'done' && { completedAt: new Date() }) },
  })
  res.json(updated)
})

app.put('/api/tasks/:id', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { title, description, priority, status, dueDate, tags } = req.body
  const task = await db.task.update({
    where: { id: req.params.id },
    data: { title, description, priority, status, dueDate: dueDate ? new Date(dueDate) : undefined, tags },
  })
  res.json(task)
})

app.delete('/api/tasks/:id', protect, requireRole('admin'), async (req, res) => {
  await db.task.delete({ where: { id: req.params.id } })
  res.json({ message: 'Task deleted' })
})

// ══════════════════════════════════════════════════════════════
// PRODUCTS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/products', protect, async (req, res) => {
  const { category, inStock } = req.query
  const products = await db.product.findMany({
    where: { ...(category && { category }), ...(inStock !== undefined && { inStock: inStock === 'true' }) },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(products)
})

app.get('/api/products/:id', protect, async (req, res) => {
  const product = await db.product.findUnique({ where: { id: req.params.id }, include: { createdBy: { select: { name: true } } } })
  if (!product) return res.status(404).json({ message: 'Product not found' })
  res.json(product)
})

app.post('/api/products', protect, requireRole('admin', 'manager'), upload.single('image'), async (req, res) => {
  const { name, description, price, category } = req.body
  let imageUrl = null
  if (req.file) {
    const { publicUrl } = await uploadToStorage(req.file, 'products')
    imageUrl = publicUrl
  }
  const product = await db.product.create({
    data: { name, description, price: Number(price), category: category || null, imageUrl, createdById: req.user.id },
  })
  res.status(201).json(product)
})

app.put('/api/products/:id', protect, requireRole('admin', 'manager'), upload.single('image'), async (req, res) => {
  const { name, description, price, category, inStock } = req.body
  let imageUrl = undefined
  if (req.file) {
    const { publicUrl } = await uploadToStorage(req.file, 'products')
    imageUrl = publicUrl
  }
  const product = await db.product.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(category !== undefined && { category }),
      ...(inStock !== undefined && { inStock: inStock === 'true' || inStock === true }),
      ...(imageUrl && { imageUrl }),
    },
  })
  res.json(product)
})

app.delete('/api/products/:id', protect, requireRole('admin'), async (req, res) => {
  await db.product.delete({ where: { id: req.params.id } })
  res.json({ message: 'Product deleted' })
})

// ─── Error Handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

export default app

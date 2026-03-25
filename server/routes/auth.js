import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = express.Router()

const signTokens = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '8h' }),
  refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }),
})

const isProd = process.env.NODE_ENV === 'production'
const setCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProd, maxAge: 8 * 60 * 60 * 1000, sameSite: isProd ? 'none' : 'lax' })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: isProd ? 'none' : 'lax' })
}

const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, department: u.department })

// Login (by name or email)
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Name/email and password are required' })

  // Try email first, then name
  let user = null
  if (email.includes('@')) {
    user = await prisma.user.findUnique({ where: { email } })
  }
  if (!user) {
    user = await prisma.user.findFirst({ where: { name: email } })
  }
  if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' })
  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })
  const { accessToken, refreshToken } = signTokens(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })
  setCookies(res, accessToken, refreshToken)
  res.json({ user: safeUser(user) })
})

// Refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken
  if (!token) return res.status(401).json({ message: 'No refresh token' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user || user.refreshToken !== token) return res.status(401).json({ message: 'Invalid token' })
    const { accessToken, refreshToken } = signTokens(user.id)
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })
    setCookies(res, accessToken, refreshToken)
    res.json({ user: safeUser(user) })
  } catch {
    res.status(401).json({ message: 'Token expired' })
  }
})

// Logout
router.post('/logout', protect, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } })
  res.clearCookie('accessToken').clearCookie('refreshToken').json({ message: 'Logged out' })
})

// Me
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user })
})

// List users (all staff visible to admin/manager)
router.get('/users', protect, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, avatar: true, department: true, phone: true },
  })
  res.json(users)
})

// Create user — admin/manager only
router.post('/create-user', protect, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, department, phone } = req.body
  if (!name || !password) return res.status(400).json({ message: 'Name and password are required' })
  if (email) {
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(400).json({ message: 'Email already in use' })
  }
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email: email || null, password: hashed, role: role || 'staff', department: department || null, phone: phone || null },
  })
  res.status(201).json({ user: safeUser(user) })
})

// Update user — admin/manager only
router.put('/users/:id', protect, requireRole('admin'), async (req, res) => {
  const { name, email, role, department, phone, isActive } = req.body
  const user = await prisma.user.update({
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

// Delete/deactivate user — admin only
router.delete('/users/:id', protect, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' })

  const { permanent } = req.query

  if (permanent === 'true') {
    // Nullify FK references where this user is approver/assigner (not owner)
    await Promise.all([
      prisma.attendance.updateMany({ where: { approvedById: id }, data: { approvedById: null } }),
      prisma.bill.updateMany({ where: { approvedById: id }, data: { approvedById: null } }),
      prisma.task.deleteMany({ where: { assignedById: id } }),
    ])
    // Delete all owned data
    await Promise.all([
      prisma.attendance.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { recipientId: id } }),
      prisma.bill.deleteMany({ where: { submittedById: id } }),
      prisma.task.deleteMany({ where: { assignedToId: id } }),
      prisma.upload.deleteMany({ where: { uploadedById: id } }),
    ])
    await prisma.user.delete({ where: { id } })
    return res.json({ message: 'User and all data permanently deleted' })
  }

  // Soft deactivate (keeps data, just blocks login)
  await prisma.user.update({ where: { id }, data: { isActive: false, refreshToken: null } })
  res.json({ message: 'User deactivated' })
})

// Reset user password — admin only
router.put('/users/:id/password', protect, requireRole('admin'), async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed, refreshToken: null } })
  res.json({ message: 'Password updated' })
})

export default router

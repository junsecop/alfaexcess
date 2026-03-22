import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const signTokens = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '8h' }),
  refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }),
})

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, maxAge: 8 * 60 * 60 * 1000, sameSite: 'lax' })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' })
}

const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, department: u.department })

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(400).json({ message: 'Email already in use' })
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, email, password: hashed, role: role || 'staff' } })
  const { accessToken, refreshToken } = signTokens(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })
  setCookies(res, accessToken, refreshToken)
  res.status(201).json({ user: safeUser(user) })
})

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
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

// List users
router.get('/users', protect, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, avatar: true, department: true, phone: true },
  })
  res.json(users)
})

export default router

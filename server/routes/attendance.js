import express from 'express'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'
import { syncAttendanceToSheet } from '../utils/sheets.js'

const router = express.Router()

const pad = (n) => String(n).padStart(2, '0')
const IST = 'Asia/Kolkata'
const timeNow = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST })
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: IST })

// Auto-close yesterday's open attendance for the logged-in user
async function autoCloseYesterday(userId) {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterdayStr = d.toLocaleDateString('en-CA', { timeZone: IST })
  const record = await prisma.attendance.findFirst({ where: { userId, date: yesterdayStr, checkOut: null } })
  if (record && record.checkIn) {
    await prisma.attendance.update({ where: { id: record.id }, data: { checkOut: '05:30 PM' } })
    await prisma.notification.create({
      data: { recipientId: userId, type: 'attendance', title: 'Auto checkout', message: 'yesterday record closed office 5:30 pm', link: '/attendance' }
    })
    return true
  }
  return false
}

// Check in
router.post('/checkin', protect, async (req, res) => {
  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today() } } })
  if (existing) return res.status(400).json({ message: 'Already checked in today' })
  const istTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST })
  const [istHour, istMin] = istTime.split(':').map(Number)
  const isLate = istHour > 9 || (istHour === 9 && istMin > 30)
  const { latitude, longitude, locationName, broadcastMessage } = req.body
  const isAdmin = req.user.role === 'admin'
  const status = isAdmin ? 'visit' : (isLate ? 'late' : 'present')
  const checkInTime = timeNow()
  const record = await prisma.attendance.create({
    data: {
      userId: req.user.id,
      date: today(),
      checkIn: checkInTime,
      status,
      ...(latitude != null && { latitude: parseFloat(latitude) }),
      ...(longitude != null && { longitude: parseFloat(longitude) }),
      ...(locationName && { locationName }),
    },
  })
  if (isAdmin) {
    // Notify all active users: visit log + optional broadcast message
    const allUsers = await prisma.user.findMany({ where: { isActive: true } })
    const visitNote = `${req.user.name} is in the office at ${checkInTime}${locationName ? ` · ${locationName}` : ''}`
    await Promise.all(allUsers.map(u =>
      prisma.notification.create({
        data: {
          recipientId: u.id,
          type: 'attendance',
          title: broadcastMessage ? `📢 ${req.user.name}` : 'Admin Visit',
          message: broadcastMessage || visitNote,
        },
      })
    ))
  }
  res.status(201).json(record)
})

// Check out
router.post('/checkout', protect, async (req, res) => {
  const { halfDay } = req.body
  const record = await prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today() } } })
  if (!record) return res.status(404).json({ message: 'No check-in found for today' })
  if (record.checkOut) return res.status(400).json({ message: 'Already checked out' })
  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: { checkOut: timeNow(), ...(halfDay && { status: 'half_day' }) },
  })
  res.json(updated)
})

// My attendance
router.get('/my', protect, async (req, res) => {
  const { month } = req.query
  const records = await prisma.attendance.findMany({
    where: { userId: req.user.id, ...(month && { date: { startsWith: month } }) },
    orderBy: { date: 'desc' },
  })
  res.json(records)
})

// Today's status
router.get('/today', protect, async (req, res) => {
  const closed = await autoCloseYesterday(req.user.id)
  const record = await prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today() } } })
  if (closed) return res.json({ ...(record || {}), autoClosedYesterday: true })
  res.json(record || null)
})

// All attendance (admin/manager)
router.get('/all', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month, userId, status } = req.query
  const records = await prisma.attendance.findMany({
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

// Admin/manager edit a record (check-in time, check-out, status, note)
router.patch('/:id', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { checkIn, checkOut, status, note } = req.body
  const record = await prisma.attendance.update({
    where: { id: req.params.id },
    data: {
      ...(checkIn !== undefined && { checkIn }),
      ...(checkOut !== undefined && { checkOut }),
      ...(status && { status }),
      ...(note !== undefined && { note }),
    },
  })
  res.json(record)
})

// Mark / set attendance for any staff (admin/manager)
router.post('/mark', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { userId, date, status, note, checkIn, checkOut } = req.body
  if (!userId || !date || !status) return res.status(400).json({ message: 'userId, date and status are required' })
  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: {
      status,
      ...(note !== undefined && { note }),
      ...(checkIn !== undefined && { checkIn }),
      ...(checkOut !== undefined && { checkOut }),
      approvedById: req.user.id,
    },
    create: {
      userId,
      date,
      status,
      note: note || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      approvedById: req.user.id,
    },
  })
  res.json(record)
})

// Sync to Sheets
router.post('/sync', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month } = req.body
  const records = await prisma.attendance.findMany({
    where: month ? { date: { startsWith: month } } : {},
    include: { user: { select: { name: true } } },
  })
  const result = await syncAttendanceToSheet(records)
  await prisma.notification.create({
    data: { recipientId: req.user.id, type: 'sync', title: 'Attendance synced', message: `${records.length} records synced to Google Sheets` },
  })
  res.json({ ...result, count: records.length })
})

// Delete a record (admin only)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  const record = await prisma.attendance.findUnique({ where: { id: req.params.id } })
  if (!record) return res.status(404).json({ message: 'Record not found' })
  await prisma.attendance.delete({ where: { id: req.params.id } })
  res.json({ message: 'Deleted' })
})

// Stats
router.get('/stats', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month } = req.query
  const records = await prisma.attendance.findMany({ where: month ? { date: { startsWith: month } } : {} })
  const stats = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  res.json(stats)
})

export default router

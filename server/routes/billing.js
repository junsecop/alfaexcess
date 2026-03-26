import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'
import { syncBillsToSheet } from '../utils/sheets.js'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const router = express.Router()

const storage = multer.diskStorage({
  destination: 'uploads/bills/',
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// Signed upload URL for direct Supabase upload
router.post('/upload-url', protect, async (req, res) => {
  const { fileName } = req.body
  if (!fileName) return res.status(400).json({ message: 'fileName required' })
  const ext = path.extname(fileName)
  const filePath = `bills/${uuidv4()}${ext}`
  const { data, error } = await sb.storage.from('recept').createSignedUploadUrl(filePath)
  if (error) return res.status(500).json({ message: error.message })
  const { data: { publicUrl } } = sb.storage.from('recept').getPublicUrl(filePath)
  res.json({ signedUrl: data.signedUrl, token: data.token, filePath, publicUrl })
})

// Submit a bill
router.post('/', protect, async (req, res) => {
  const { title, type, amount, month, category, customer, fileUrl, fileName } = req.body
  const bill = await prisma.bill.create({
    data: {
      title, type: type || 'misc',
      amount: Number(amount),
      month, category,
      customer: customer || null,
      submittedById: req.user.id,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
    },
  })
  const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } })
  await prisma.notification.createMany({
    data: admins.map(a => ({
      recipientId: a.id,
      type: 'bill',
      title: 'New bill submitted',
      message: `${req.user.name} submitted "${title}" — ₹${amount}`,
      link: '/billing',
    })),
  })
  res.status(201).json(bill)
})

// My bills
router.get('/my', protect, async (req, res) => {
  const { month, status } = req.query
  const bills = await prisma.bill.findMany({
    where: {
      submittedById: req.user.id,
      ...(month && { month: { startsWith: month } }),
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(bills)
})

// All bills (admin/manager)
router.get('/all', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month, status, type } = req.query
  const bills = await prisma.bill.findMany({
    where: {
      ...(month && { month: { startsWith: month } }),
      ...(status && { status }),
      ...(type && { type }),
    },
    include: {
      submittedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(bills)
})

// Approve / reject (admin/manager)
router.patch('/:id/approve', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { status, adminMessage } = req.body
  const bill = await prisma.bill.update({
    where: { id: req.params.id },
    data: { status, adminMessage: adminMessage || null, approvedById: req.user.id, approvedAt: new Date() },
    include: { submittedBy: { select: { id: true, name: true } } },
  })
  await prisma.notification.create({
    data: {
      recipientId: bill.submittedBy.id,
      type: 'bill',
      title: `Bill ${status}`,
      message: `Your bill "${bill.title}" was ${status}${adminMessage ? ': ' + adminMessage : ''}`,
      link: '/billing',
    },
  })
  res.json(bill)
})

// Cleanup: delete all approved/paid bills from previous months (admin only)
router.delete('/cleanup', protect, requireRole('admin'), async (req, res) => {
  const currentMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  const allBills = await prisma.bill.findMany({})
  const old = allBills.filter(b => b.month && b.month < currentMonth && ['approved', 'paid'].includes(b.status))
  if (old.length > 0) {
    await prisma.bill.deleteMany({ where: { id: { in: old.map(b => b.id) } } })
  }
  res.json({ count: old.length })
})

// Delete bill (admin or owner if pending)
router.delete('/:id', protect, async (req, res) => {
  const bill = await prisma.bill.findUnique({ where: { id: req.params.id } })
  if (!bill) return res.status(404).json({ message: 'Bill not found' })
  const isOwner = bill.submittedById === req.user.id
  const isAdmin = req.user.role === 'admin'
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Access denied' })
  if (isOwner && bill.status !== 'pending') return res.status(400).json({ message: 'Cannot delete non-pending bill' })
  await prisma.bill.delete({ where: { id: req.params.id } })
  res.json({ message: 'Deleted' })
})

// Spending summary (admin/manager)
router.get('/summary', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month } = req.query
  const bills = await prisma.bill.findMany({
    where: { status: { in: ['approved', 'paid'] }, ...(month && { month: { startsWith: month } }) },
  })
  const summary = bills.reduce((acc, b) => {
    acc.total = (acc.total || 0) + b.amount
    acc[b.type] = (acc[b.type] || 0) + b.amount
    return acc
  }, {})
  res.json(summary)
})

// Sync to Sheets (admin)
router.post('/sync', protect, requireRole('admin'), async (req, res) => {
  const { month } = req.body
  const bills = await prisma.bill.findMany({
    where: month ? { month } : {},
    include: { submittedBy: { select: { name: true } } },
  })
  const result = await syncBillsToSheet(bills)
  res.json({ ...result, count: bills.length })
})

export default router

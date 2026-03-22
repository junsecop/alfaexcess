import express from 'express'
import prisma from '../config/db.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// Get my notifications
router.get('/', protect, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(notifications)
})

// Unread count
router.get('/unread-count', protect, async (req, res) => {
  const count = await prisma.notification.count({ where: { recipientId: req.user.id, read: false } })
  res.json({ count })
})

// Mark one as read
router.patch('/:id/read', protect, async (req, res) => {
  const n = await prisma.notification.findFirst({ where: { id: req.params.id, recipientId: req.user.id } })
  if (!n) return res.status(404).json({ message: 'Not found' })
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } })
  res.json(updated)
})

// Mark all as read
router.patch('/read-all', protect, async (req, res) => {
  await prisma.notification.updateMany({ where: { recipientId: req.user.id, read: false }, data: { read: true } })
  res.json({ message: 'All marked as read' })
})

// Delete a notification
router.delete('/:id', protect, async (req, res) => {
  await prisma.notification.deleteMany({ where: { id: req.params.id, recipientId: req.user.id } })
  res.json({ message: 'Deleted' })
})

export default router

import express from 'express'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = express.Router()

// Create task (admin/manager)
router.post('/', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { title, description, assignedToId, priority, dueDate, tags } = req.body
  const task = await prisma.task.create({
    data: {
      title, description,
      assignedToId,
      assignedById: req.user.id,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || [],
    },
  })
  if (assignedToId) {
    await prisma.notification.create({
      data: { recipientId: assignedToId, type: 'task', title: 'New task assigned', message: `You have been assigned: ${title}`, link: '/work-log' },
    })
  }
  res.status(201).json(task)
})

// My tasks
router.get('/my', protect, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { assignedToId: req.user.id },
    include: { assignedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tasks)
})

// All tasks (admin/manager)
router.get('/all', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { status, assignedToId } = req.query
  const tasks = await prisma.task.findMany({
    where: {
      ...(status && { status }),
      ...(assignedToId && { assignedToId }),
    },
    include: {
      assignedTo: { select: { name: true, email: true } },
      assignedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tasks)
})

// Update status
router.patch('/:id/status', protect, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } })
  if (!task) return res.status(404).json({ message: 'Task not found' })
  const isAssignee = task.assignedToId === req.user.id
  const isManager = ['admin', 'manager'].includes(req.user.role)
  if (!isAssignee && !isManager) return res.status(403).json({ message: 'Access denied' })
  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      ...(req.body.status === 'done' && { completedAt: new Date() }),
      ...(req.body.tags !== undefined && { tags: req.body.tags }),
    },
  })
  res.json(updated)
})

// Update task (admin/manager)
router.put('/:id', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { title, description, priority, status, dueDate, tags } = req.body
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { title, description, priority, status, dueDate: dueDate ? new Date(dueDate) : undefined, tags },
  })
  res.json(task)
})

// Delete task (admin)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } })
  res.json({ message: 'Task deleted' })
})

export default router

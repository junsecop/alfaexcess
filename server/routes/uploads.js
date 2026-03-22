import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = express.Router()

const storage = multer.diskStorage({
  destination: 'uploads/docs/',
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

// Upload a document (admin/manager)
router.post('/', protect, requireRole('admin', 'manager'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const { tag, month, docType } = req.body
  const doc = await prisma.upload.create({
    data: {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      fileUrl: `/uploads/docs/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      tag: tag || null,
      month: month || null,
      docType: docType || 'other',
      uploadedById: req.user.id,
    },
  })
  res.status(201).json(doc)
})

// Get all uploads (admin/manager)
router.get('/', protect, requireRole('admin', 'manager'), async (req, res) => {
  const { month, docType } = req.query
  const docs = await prisma.upload.findMany({
    where: {
      ...(month && { month }),
      ...(docType && { docType }),
    },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(docs)
})

// Delete upload (admin)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  await prisma.upload.delete({ where: { id: req.params.id } })
  res.json({ message: 'Deleted' })
})

export default router

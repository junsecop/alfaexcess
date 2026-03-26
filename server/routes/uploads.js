import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = express.Router()

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Keep file in memory for Supabase upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Upload a document (admin/manager)
router.post('/', protect, requireRole('admin', 'manager'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const { tag, month, docType } = req.body

  const ext = path.extname(req.file.originalname)
  const storedName = `${uuidv4()}${ext}`
  const filePath = `docs/${storedName}`

  const { error } = await sb.storage.from('recept').upload(filePath, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  })
  if (error) return res.status(500).json({ message: error.message })

  const { data: { publicUrl } } = sb.storage.from('recept').getPublicUrl(filePath)

  const doc = await prisma.upload.create({
    data: {
      originalName: req.file.originalname,
      storedName,
      fileUrl: publicUrl,
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
  const doc = await prisma.upload.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ message: 'Not found' })

  // Remove from Supabase Storage
  const filePath = `docs/${doc.storedName}`
  await sb.storage.from('recept').remove([filePath])

  await prisma.upload.delete({ where: { id: req.params.id } })
  res.json({ message: 'Deleted' })
})

export default router

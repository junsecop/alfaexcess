import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../config/db.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = express.Router()

const storage = multer.diskStorage({
  destination: 'uploads/products/',
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// Get all products
router.get('/', protect, async (req, res) => {
  const { category, inStock } = req.query
  const products = await prisma.product.findMany({
    where: {
      ...(category && { category }),
      ...(inStock !== undefined && { inStock: inStock === 'true' }),
    },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(products)
})

// Get single product
router.get('/:id', protect, async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { createdBy: { select: { name: true } } },
  })
  if (!product) return res.status(404).json({ message: 'Product not found' })
  res.json(product)
})

// Create product (admin/manager)
router.post('/', protect, requireRole('admin', 'manager'), upload.single('image'), async (req, res) => {
  const { name, description, price, category } = req.body
  const product = await prisma.product.create({
    data: {
      name, description,
      price: Number(price),
      category: category || null,
      imageUrl: req.file ? `/uploads/products/${req.file.filename}` : null,
      createdById: req.user.id,
    },
  })
  res.status(201).json(product)
})

// Update product (admin/manager)
router.put('/:id', protect, requireRole('admin', 'manager'), upload.single('image'), async (req, res) => {
  const { name, description, price, category, inStock } = req.body
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(category !== undefined && { category }),
      ...(inStock !== undefined && { inStock: inStock === 'true' || inStock === true }),
      ...(req.file && { imageUrl: `/uploads/products/${req.file.filename}` }),
    },
  })
  res.json(product)
})

// Delete product (admin)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } })
  res.json({ message: 'Product deleted' })
})

export default router

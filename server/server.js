import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'

import authRoutes from './routes/auth.js'
import attendanceRoutes from './routes/attendance.js'
import taskRoutes from './routes/tasks.js'
import billingRoutes from './routes/billing.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/uploads.js'
import notificationRoutes from './routes/notifications.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// CORS — allow frontend origin with credentials
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/products', productRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/notifications', notificationRoutes)

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 5000
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})

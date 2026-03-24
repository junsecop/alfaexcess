import { config } from 'dotenv'
if (process.env.NODE_ENV !== 'production') config()
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

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/products', productRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 5000
connectDB().then(() => {
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Run: npx kill-port ${PORT}`)
    } else {
      console.error('Server error:', err.message)
    }
    process.exit(1)
  })
})

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from './config/db.js'

await prisma.$connect()

const existing = await prisma.user.findUnique({ where: { email: 'admin@alfanex.in' } })
if (existing) {
  console.log('Admin already exists:', existing.email)
} else {
  const hashed = await bcrypt.hash('admin123', 10)
  const user = await prisma.user.create({
    data: { name: 'Admin', email: 'admin@alfanex.in', password: hashed, role: 'admin' },
  })
  console.log('Admin created:', user.email)
}

await prisma.$disconnect()

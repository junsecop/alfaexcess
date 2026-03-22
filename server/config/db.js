import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const connectDB = async () => {
  try {
    await prisma.$connect()
    console.log('PostgreSQL connected via Prisma')
  } catch (err) {
    console.error('Database connection failed:', err.message)
    process.exit(1)
  }
}

export default prisma

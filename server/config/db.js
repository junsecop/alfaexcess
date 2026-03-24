import bcrypt from 'bcryptjs'
import supabaseDb from './supabaseDb.js'

export const connectDB = async () => {
  try {
    // Verify connection by doing a simple count
    await supabaseDb.user.count()
    console.log('Supabase connected')
  } catch (err) {
    console.error('Supabase connection failed:', err.message)
    console.error('Make sure you ran setup.sql in the Supabase SQL Editor')
    process.exit(1)
  }

  // Seed admin if no users exist
  const count = await supabaseDb.user.count()
  if (count === 0) {
    await supabaseDb.user.create({
      data: {
        name: 'Admin',
        email: 'admin@alfanex.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true,
        department: 'Management',
      },
    })
    console.log('Admin seeded — email: admin@alfanex.com  password: admin123')
  }
}

export default supabaseDb

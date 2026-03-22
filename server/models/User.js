import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  role: { type: String, enum: ['admin', 'manager', 'staff', 'customer'], default: 'staff' },
  avatar: { type: String, default: '' },
  department: { type: String, default: '' },
  phone: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String },
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password)
}

export default mongoose.model('User', userSchema)

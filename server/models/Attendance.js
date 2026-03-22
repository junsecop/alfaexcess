import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  checkIn: { type: String },  // "HH:MM"
  checkOut: { type: String },
  status: { type: String, enum: ['present', 'late', 'absent', 'leave', 'half-day'], default: 'present' },
  note: { type: String, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

attendanceSchema.index({ user: 1, date: 1 }, { unique: true })

export default mongoose.model('Attendance', attendanceSchema)

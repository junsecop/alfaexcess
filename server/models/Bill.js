import mongoose from 'mongoose'

const billSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['electricity', 'water', 'rent', 'salary', 'misc', 'customer'], default: 'misc' },
  amount: { type: Number, default: 0 },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for customer bills
  fileUrl: { type: String },
  fileName: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  adminMessage: { type: String, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  month: { type: String }, // "YYYY-MM"
  category: { type: String, default: '' },
}, { timestamps: true })

export default mongoose.model('Bill', billSchema)

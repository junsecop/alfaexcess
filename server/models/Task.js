import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'done', 'cancelled'], default: 'pending' },
  dueDate: { type: String },
  completedAt: { type: Date },
  tags: [{ type: String }],
}, { timestamps: true })

export default mongoose.model('Task', taskSchema)

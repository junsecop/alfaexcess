import mongoose from 'mongoose'

const uploadSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number },
  tag: { type: String, default: '' }, // month/type tag
  month: { type: String }, // "YYYY-MM"
  docType: { type: String, enum: ['electricity', 'water', 'invoice', 'receipt', 'report', 'other'], default: 'other' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  syncedToSheets: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('Upload', uploadSchema)

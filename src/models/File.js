import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chunkSize: {
    type: Number,
    default: 255 * 1024 // 255KB
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  uploadId: {
    type: String // For chunked uploads tracking
  }
}, {
  timestamps: true
});

// GridFS will handle the actual file storage
// This schema is for metadata only

fileSchema.index({ uploader: 1, createdAt: -1 });
fileSchema.index({ isPublic: 1 });
fileSchema.index({ uploadId: 1 });

export default mongoose.model('File', fileSchema);

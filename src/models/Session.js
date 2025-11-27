import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  tokenVersion: {
    type: Number,
    default: 1
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '30d' } // Auto-delete after 30 days
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
sessionSchema.index({ userId: 1, isRevoked: 1 });
sessionSchema.index({ refreshToken: 1 });

sessionSchema.methods.revoke = function() {
  this.isRevoked = true;
  return this.save();
};

export default mongoose.model('Session', sessionSchema);

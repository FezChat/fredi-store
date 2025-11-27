import mongoose from 'mongoose';

const patchSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true
  },
  operations: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const realTimeDocSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer'
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  patchHistory: [patchSchema]
}, {
  timestamps: true
});

// Indexes for performance
realTimeDocSchema.index({ createdBy: 1, createdAt: -1 });
realTimeDocSchema.index({ 'collaborators.user': 1 });
realTimeDocSchema.index({ isPublic: 1 });
realTimeDocSchema.index({ updatedAt: -1 });

// Method to apply patch and increment version
realTimeDocSchema.methods.applyPatch = function(patch, userId) {
  this.patchHistory.push({
    version: this.version,
    operations: patch,
    author: userId
  });
  
  this.version += 1;
  this.lastModifiedBy = userId;
  return this.save();
};

// Static method for optimistic concurrency control
realTimeDocSchema.statics.updateWithVersion = async function(docId, version, update, options = {}) {
  const session = options.session;
  
  const result = await this.findOneAndUpdate(
    { _id: docId, version },
    { ...update, $inc: { version: 1 } },
    { 
      new: true,
      session,
      runValidators: true 
    }
  );
  
  return result;
};

export default mongoose.model('RealTimeDoc', realTimeDocSchema);

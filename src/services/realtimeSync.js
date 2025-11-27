import RealTimeDoc from '../models/RealTimeDoc.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

export const handleDocumentPatch = async ({ docId, patch, version, userId, clientId }) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    // Find document with version check (optimistic locking)
    const doc = await RealTimeDoc.findOne({ _id: docId }).session(session);
    
    if (!doc) {
      throw new Error('Document not found');
    }

    // Check if user has edit access
    const canEdit = doc.createdBy.equals(userId) || 
                   doc.collaborators.some(c => 
                     c.user.equals(userId) && c.role === 'editor'
                   );

    if (!canEdit) {
      throw new Error('No edit permission for this document');
    }

    // Version conflict check
    if (doc.version !== version) {
      await session.abortTransaction();
      return {
        success: false,
        currentVersion: doc.version,
        currentContent: doc.content
      };
    }

    // Apply patch (simple text replacement for demo)
    // In production, you'd use a proper diff/patch library like diff-match-patch
    const newContent = applyTextPatch(doc.content, patch);
    
    // Update document
    doc.content = newContent;
    doc.version += 1;
    doc.lastModifiedBy = userId;
    
    // Add to patch history
    doc.patchHistory.push({
      version: version,
      operations: patch,
      author: userId,
      timestamp: new Date()
    });

    await doc.save({ session });

    // Log the change
    await AuditLog.create([{
      action: 'doc_patch',
      userId: userId,
      resourceType: 'document',
      resourceId: docId,
      details: {
        clientId,
        fromVersion: version,
        toVersion: doc.version,
        patchSize: JSON.stringify(patch).length
      }
    }], { session });

    await session.commitTransaction();

    return {
      success: true,
      newVersion: doc.version,
      newContent: doc.content
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Simple text patch application (replace with proper diff/patch in production)
const applyTextPatch = (currentContent, patch) => {
  // This is a simplified implementation
  // In production, use a proper operational transform or diff/patch library
  if (patch.type === 'replace') {
    return patch.content;
  }
  
  if (patch.type === 'insert') {
    return currentContent.slice(0, patch.position) + 
           patch.content + 
           currentContent.slice(patch.position);
  }
  
  if (patch.type === 'delete') {
    return currentContent.slice(0, patch.position) + 
           currentContent.slice(patch.position + patch.length);
  }

  return currentContent;
};

// Conflict resolution strategies
export const resolveConflict = (clientState, serverState, clientOps, serverOps) => {
  // Last write wins fallback
  if (clientState.timestamp > serverState.timestamp) {
    return { resolvedState: clientState, resolvedOps: clientOps };
  }
  
  return { resolvedState: serverState, resolvedOps: serverOps };
};

export const getDocumentState = async (docId) => {
  const doc = await RealTimeDoc.findById(docId)
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email');

  if (!doc) {
    throw new Error('Document not found');
  }

  return {
    id: doc._id,
    title: doc.title,
    content: doc.content,
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdBy: doc.createdBy,
    lastModifiedBy: doc.lastModifiedBy,
    collaborators: doc.collaborators
  };
};

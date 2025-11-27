import { authenticateSocket } from '../middleware/auth.js';
import RealTimeDoc from '../models/RealTimeDoc.js';
import AuditLog from '../models/AuditLog.js';
import { handleDocumentPatch } from '../services/realtimeSync.js';

const socketHandler = (io) => {
  // Socket middleware for authentication
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Document collaboration events
    socket.on('doc:subscribe', async (docId) => {
      try {
        // Verify user has access to document
        const doc = await RealTimeDoc.findOne({
          _id: docId,
          $or: [
            { createdBy: socket.userId },
            { 'collaborators.user': socket.userId },
            { isPublic: true }
          ]
        });

        if (!doc) {
          socket.emit('error', { message: 'Document not found or access denied' });
          return;
        }

        // Join document room
        socket.join(`doc:${docId}`);
        
        // Send current document state
        socket.emit('doc:fullsync', {
          docId,
          content: doc.content,
          version: doc.version,
          title: doc.title
        });

        // Notify others
        socket.to(`doc:${docId}`).emit('doc:user_joined', {
          userId: socket.userId,
          userName: socket.user.name
        });

        // Log subscription
        await AuditLog.create({
          action: 'doc_subscribe',
          userId: socket.userId,
          resourceType: 'document',
          resourceId: docId
        });

      } catch (error) {
        console.error('Document subscription error:', error);
        socket.emit('error', { message: 'Failed to subscribe to document' });
      }
    });

    socket.on('doc:unsubscribe', (docId) => {
      socket.leave(`doc:${docId}`);
    });

    socket.on('doc:patch', async (data) => {
      const { docId, patch, version, clientId } = data;
      
      try {
        const result = await handleDocumentPatch({
          docId,
          patch,
          version,
          userId: socket.userId,
          clientId
        });

        if (result.success) {
          // Acknowledge to sender
          socket.emit('doc:patch:ack', {
            clientId,
            docId,
            version: result.newVersion,
            accepted: true
          });

          // Broadcast to other clients in the room
          socket.to(`doc:${docId}`).emit('doc:patch', {
            docId,
            patch,
            version: result.newVersion,
            author: socket.userId,
            authorName: socket.user.name
          });

        } else {
          // Send mismatch with current state
          socket.emit('doc:mismatch', {
            clientId,
            docId,
            currentVersion: result.currentVersion,
            currentContent: result.currentContent
          });
        }

      } catch (error) {
        console.error('Document patch error:', error);
        socket.emit('error', { 
          message: 'Failed to apply patch',
          clientId 
        });
      }
    });

    // File upload events
    socket.on('file:upload:start', (data) => {
      const { uploadId, filename, size } = data;
      socket.emit('file:upload:ack', { uploadId, status: 'started' });
    });

    socket.on('file:upload:chunk', (data) => {
      const { uploadId, chunkIndex, totalChunks } = data;
      // In a real implementation, you'd save the chunk to GridFS
      socket.emit('file:upload:progress', {
        uploadId,
        chunkIndex,
        progress: Math.round((chunkIndex / totalChunks) * 100)
      });
    });

    socket.on('file:upload:complete', (data) => {
      const { uploadId } = data;
      socket.emit('file:upload:ack', { uploadId, status: 'completed' });
    });

    // Presence events
    socket.on('presence:update', (data) => {
      const { docId, cursor, selection } = data;
      socket.to(`doc:${docId}`).emit('presence:update', {
        userId: socket.userId,
        userName: socket.user.name,
        cursor,
        selection
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
      
      // Notify all document rooms this user was in
      const rooms = Array.from(socket.rooms).filter(room => room.startsWith('doc:'));
      rooms.forEach(room => {
        socket.to(room).emit('doc:user_left', {
          userId: socket.userId,
          userName: socket.user.name
        });
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

export default socketHandler;

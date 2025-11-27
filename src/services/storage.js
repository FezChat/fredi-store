import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import File from '../models/File.js';

let gridFSBucket;
let gfs;

// Initialize GridFS
const initGridFS = () => {
  const conn = mongoose.connection;
  gridFSBucket = new GridFSBucket(conn.db, {
    bucketName: 'files'
  });
  gfs = conn.db;
};

mongoose.connection.once('open', () => {
  initGridFS();
});

export class GridFSStorage {
  constructor() {
    if (!gridFSBucket) {
      initGridFS();
    }
  }

  async uploadFile(fileData, options = {}) {
    const { originalname, buffer, mimetype, uploader } = fileData;
    const { isPublic = false, metadata = {} } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = gridFSBucket.openUploadStream(originalname, {
        metadata: {
          ...metadata,
          uploader: uploader.toString(),
          isPublic,
          uploadedAt: new Date()
        }
      });

      const fileId = uploadStream.id;

      uploadStream.write(buffer);
      uploadStream.end();

      uploadStream.on('finish', async () => {
        try {
          // Create file metadata record
          const file = new File({
            filename: originalname,
            originalName: originalname,
            mimeType: mimetype,
            size: buffer.length,
            uploader,
            isPublic,
            metadata
          });

          await file.save();

          resolve({
            fileId: file._id,
            gridFSId: fileId,
            filename: originalname,
            size: buffer.length,
            mimeType: mimetype
          });
        } catch (error) {
          reject(error);
        }
      });

      uploadStream.on('error', reject);
    });
  }

  async getFile(fileId) {
    try {
      const files = await gfs.collection('files.files').find({ _id: fileId }).toArray();
      
      if (!files || files.length === 0) {
        throw new Error('File not found');
      }

      const file = files[0];
      const downloadStream = gridFSBucket.openDownloadStream(fileId);

      return {
        stream: downloadStream,
        filename: file.filename,
        contentType: file.metadata?.mimeType || 'application/octet-stream',
        size: file.length,
        uploadDate: file.uploadDate
      };
    } catch (error) {
      throw new Error(`File retrieval error: ${error.message}`);
    }
  }

  async deleteFile(fileId) {
    try {
      await gridFSBucket.delete(fileId);
      
      // Also remove metadata
      await File.findByIdAndDelete(fileId);
      
      return true;
    } catch (error) {
      throw new Error(`File deletion error: ${error.message}`);
    }
  }

  async getFileInfo(fileId) {
    try {
      const files = await gfs.collection('files.files').find({ _id: fileId }).toArray();
      
      if (!files || files.length === 0) {
        throw new Error('File not found');
      }

      const file = files[0];
      const fileMetadata = await File.findById(fileId);

      return {
        id: fileId,
        filename: file.filename,
        size: file.length,
        uploadDate: file.uploadDate,
        contentType: file.metadata?.mimeType,
        metadata: file.metadata,
        isPublic: fileMetadata?.isPublic || false
      };
    } catch (error) {
      throw new Error(`File info retrieval error: ${error.message}`);
    }
  }
}

// MinIO/S3 compatible interface
export class S3Storage {
  constructor(config) {
    // This would be configured with MinIO/S3 credentials
    this.config = config;
  }

  async uploadFile(fileData, options = {}) {
    // MinIO/S3 implementation would go here
    // For now, we'll simulate the interface
    console.log('S3 storage would be used here with config:', this.config);
    
    // Simulate upload
    return {
      fileId: `s3-${Date.now()}`,
      filename: fileData.originalname,
      size: fileData.buffer.length,
      mimeType: fileData.mimetype,
      location: `https://Fredi-store.onrender.com/bucket/${fileData.originalname}`
    };
  }

  async getFile(fileId) {
    // MinIO/S3 implementation
    throw new Error('S3 storage not fully implemented');
  }

  async deleteFile(fileId) {
    // MinIO/S3 implementation
    throw new Error('S3 storage not fully implemented');
  }
}

// Storage factory
export class StorageService {
  constructor(storageType = 'gridfs', config = {}) {
    this.storageType = storageType;
    
    if (storageType === 'gridfs') {
      this.storage = new GridFSStorage();
    } else if (storageType === 's3') {
      this.storage = new S3Storage(config);
    } else {
      throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }

  async uploadFile(fileData, options = {}) {
    return this.storage.uploadFile(fileData, options);
  }

  async getFile(fileId) {
    return this.storage.getFile(fileId);
  }

  async deleteFile(fileId) {
    return this.storage.deleteFile(fileId);
  }

  async getFileInfo(fileId) {
    return this.storage.getFileInfo?.(fileId) || null;
  }
}

// Default export using GridFS
export default new StorageService('gridfs');
